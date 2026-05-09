import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { SESSION_STATUS, SESSION_ACTION } from '../../constants.js';
import type { SessionActionValue } from '../../constants.js';

// ─── Session Schema v2 ───

/** Error diagnosis context from a failed attempt */
export const ErrorContextSchema = z.object({
  error: z.string().describe('Exact error message from failed verification'),
  hypothesis: z.string().describe('Why the agent thinks it failed'),
  attempted_fix: z.string().describe('What the agent tried to fix'),
  retry_count: z.number().int().min(0).describe('Number of retries so far').optional(),
});
export type ErrorContext = z.infer<typeof ErrorContextSchema>;



/** Unified Session data (v3) */
export const UnifiedCheckpointSchema = z.object({
  version: z.literal(3).default(3),
  task_id: z.string(),
  phase: z.enum(['pre-flight', 'implementation', 'verification', 'done']),
  files_changed: z.array(z.string()).default([]),
  completed_steps: z.array(z.string()).default([]),
  remaining_steps: z.array(z.string()).default([]),
  error_context: ErrorContextSchema.nullable().default(null),
  token_usage: z.object({ used: z.number(), limit: z.number() }).optional(),
  created_at: z.string().datetime().describe('ISO 8601 timestamp').optional(),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp').optional(),
});
export type UnifiedCheckpointType = z.infer<typeof UnifiedCheckpointSchema>;

/**
 * Session data v1 — legacy format (backward compatible).
 * V1 sessions are auto-migrated to v2 on load.
 */
const SessionDataV1Schema = z.object({
  saved_at: z.string().optional(),
  task_id: z.string().optional(),
  progress: z.number().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  workspace: z.string().optional(),
});

/**
 * Migrate v1 or v2 session data to Unified format.
 */
function migrateToUnified(raw: any): UnifiedCheckpointType {
  const now = new Date().toISOString();
  
  if (raw.version === 2) {
    return {
      version: 3,
      task_id: raw.task_id || 'unknown',
      phase: raw.phase || 'implementation',
      files_changed: raw.files_changed || [],
      completed_steps: Object.entries(raw.done_criteria_status || {}).filter(([_, done]) => done).map(([k]) => k),
      remaining_steps: Object.entries(raw.done_criteria_status || {}).filter(([_, done]) => !done).map(([k]) => k),
      error_context: raw.error_context || null,
      created_at: raw.created_at || now,
      updated_at: now,
    };
  }

  return {
    version: 3,
    task_id: raw.task_id || 'unknown',
    phase: 'implementation',
    files_changed: [],
    completed_steps: [],
    remaining_steps: [],
    error_context: null,
    created_at: raw.saved_at || now,
    updated_at: now,
  };
}

// ─── Input type ───

export interface SessionCheckpointInput {
  action: SessionActionValue;
  task_id?: string;
  phase?: string;
  files_changed?: string[];
  completed_steps?: string[];
  remaining_steps?: string[];
  error_context?: ErrorContext | null;
  token_usage?: { used: number; limit: number };
  // Legacy v1/v2 fields (still accepted for backward compat)
  done_criteria_status?: Record<string, boolean>;
  last_action?: string;
  progress?: number;
  context?: Record<string, unknown>;
}

// ─── Main function ───

export function executeSessionCheckpoint(
  workspaceRoot: string,
  input: SessionCheckpointInput
) {
  const sessionFilePath = path.join(workspaceRoot, '.agent', 'session.json');

  if (input.action === SESSION_ACTION.SAVE) {
    const dir = path.dirname(sessionFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const now = new Date().toISOString();

    // Build v3 session data
    const data: UnifiedCheckpointType = {
      version: 3,
      task_id: input.task_id || 'unknown',
      phase: (input.phase as UnifiedCheckpointType['phase']) || 'implementation',
      files_changed: input.files_changed || [],
      completed_steps: input.completed_steps || [],
      remaining_steps: input.remaining_steps || [],
      error_context: input.error_context || null,
      token_usage: input.token_usage,
      created_at: now,
      updated_at: now,
    };

    // If existing session exists, preserve created_at
    if (fs.existsSync(sessionFilePath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(sessionFilePath, 'utf-8'));
        if (existing.created_at) {
          data.created_at = existing.created_at;
        }
      } catch {
        // Ignore parse errors — overwrite with fresh data
      }
    }

    // Validate before writing
    const validated = UnifiedCheckpointSchema.parse(data);
    fs.writeFileSync(sessionFilePath, JSON.stringify(validated, null, 2), 'utf-8');
    return { status: SESSION_STATUS.SAVED, file: sessionFilePath };

  } else if (input.action === SESSION_ACTION.LOAD) {
    if (!fs.existsSync(sessionFilePath)) {
      return { status: SESSION_STATUS.NO_SESSION };
    }

    const content = fs.readFileSync(sessionFilePath, 'utf-8');
    const raw = JSON.parse(content);

    // Version detection & migration
    if (raw.version === 3) {
      // Validate v3
      const parsed = UnifiedCheckpointSchema.safeParse(raw);
      if (parsed.success) {
        return { status: SESSION_STATUS.LOADED, data: parsed.data };
      }
      // If validation fails, return raw but flag it
      return { status: SESSION_STATUS.LOADED, data: raw, validation_warning: parsed.error.message };
    }

    // V1 or V2 — attempt migration
    const migrated = migrateToUnified(raw);
    return { status: SESSION_STATUS.LOADED, data: migrated, migrated_from: raw.version === 2 ? 'v2' : 'v1' };

  } else if (input.action === SESSION_ACTION.CLEAR) {
    if (fs.existsSync(sessionFilePath)) {
      fs.unlinkSync(sessionFilePath);
    }
    return { status: SESSION_STATUS.CLEARED };
  }

  throw new Error(`Invalid action: ${input.action}`);
}
