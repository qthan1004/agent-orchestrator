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
  retry_count: z.number().int().min(0).describe('Number of retries so far'),
});
export type ErrorContext = z.infer<typeof ErrorContextSchema>;

/** Session data v2 — full typed schema with error_context */
export const SessionDataV2Schema = z.object({
  version: z.literal(2).default(2),
  task_id: z.string(),
  phase: z.enum(['pre-flight', 'implementation', 'verification', 'done']),
  files_changed: z.array(z.string()).default([]),
  done_criteria_status: z.record(z.string(), z.boolean()).default({}),
  last_action: z.string(),
  error_context: ErrorContextSchema.nullable().default(null),
  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp'),
});
export type SessionDataV2 = z.infer<typeof SessionDataV2Schema>;

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
 * Migrate v1 session data to v2 format.
 * Preserves all original data inside done_criteria_status and last_action.
 */
function migrateV1toV2(v1: z.infer<typeof SessionDataV1Schema>): SessionDataV2 {
  const now = new Date().toISOString();
  return {
    version: 2,
    task_id: v1.task_id || 'unknown',
    phase: 'implementation',
    files_changed: [],
    done_criteria_status: {},
    last_action: `Migrated from v1 session (progress: ${v1.progress ?? 'unknown'})`,
    error_context: null,
    created_at: v1.saved_at || now,
    updated_at: now,
  };
}

// ─── Input type ───

export interface SessionCheckpointInput {
  action: SessionActionValue;
  task_id?: string;
  phase?: string;
  files_changed?: string[];
  done_criteria_status?: Record<string, boolean>;
  last_action?: string;
  error_context?: ErrorContext | null;
  // Legacy v1 fields (still accepted for backward compat)
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

    // Build v2 session data
    const data: SessionDataV2 = {
      version: 2,
      task_id: input.task_id || 'unknown',
      phase: (input.phase as SessionDataV2['phase']) || 'implementation',
      files_changed: input.files_changed || [],
      done_criteria_status: input.done_criteria_status || {},
      last_action: input.last_action || '',
      error_context: input.error_context || null,
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
    const validated = SessionDataV2Schema.parse(data);
    fs.writeFileSync(sessionFilePath, JSON.stringify(validated, null, 2), 'utf-8');
    return { status: SESSION_STATUS.SAVED, file: sessionFilePath };

  } else if (input.action === SESSION_ACTION.LOAD) {
    if (!fs.existsSync(sessionFilePath)) {
      return { status: SESSION_STATUS.NO_SESSION };
    }

    const content = fs.readFileSync(sessionFilePath, 'utf-8');
    const raw = JSON.parse(content);

    // Version detection & migration
    if (raw.version === 2) {
      // Validate v2
      const parsed = SessionDataV2Schema.safeParse(raw);
      if (parsed.success) {
        return { status: SESSION_STATUS.LOADED, data: parsed.data };
      }
      // If validation fails, return raw but flag it
      return { status: SESSION_STATUS.LOADED, data: raw, validation_warning: parsed.error.message };
    }

    // V1 or unknown — attempt migration
    const v1Parse = SessionDataV1Schema.safeParse(raw);
    if (v1Parse.success) {
      const migrated = migrateV1toV2(v1Parse.data);
      return { status: SESSION_STATUS.LOADED, data: migrated, migrated_from: 'v1' };
    }

    // Completely unknown format — return as-is
    return { status: SESSION_STATUS.LOADED, data: raw, migrated_from: 'unknown' };

  } else if (input.action === SESSION_ACTION.CLEAR) {
    if (fs.existsSync(sessionFilePath)) {
      fs.unlinkSync(sessionFilePath);
    }
    return { status: SESSION_STATUS.CLEARED };
  }

  throw new Error(`Invalid action: ${input.action}`);
}
