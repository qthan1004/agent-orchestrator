import path from 'path';
import { RUNTIME_DIR_NAME } from '../constants.js';
import { bootstrapWorkspace } from '../utils/bootstrap.js';
import { assertActiveWorkspace } from '../utils/identity-invariants.js';
import { WorkspaceRegistry } from '../utils/workspace-registry.js';

export interface ConnectWorkspaceInput {
  workspacePath: string;
  runtimeRoot: string;
  configuredWorkspaceId?: string;
}

export interface ConnectedWorkspace {
  workspace_id: string;
  workspace_root: string;
  workspace_name: string;
  status: 'active';
  orchestrator_root: string;
  dispatch_enabled: boolean;
}

/**
 * Server tool: connect/register a workspace and ensure its runtime structure exists.
 * MCP tools should call this instead of embedding workspace registration logic.
 */
export function connectWorkspace(input: ConnectWorkspaceInput): ConnectedWorkspace {
  const workspacePath = input.workspacePath.trim();
  if (!workspacePath) {
    throw new Error('workspace_path must not be empty or whitespace-only.');
  }
  if (!path.isAbsolute(workspacePath)) {
    throw new Error(`workspace_path must be an absolute path. Received: "${workspacePath}"`);
  }

  const registry = new WorkspaceRegistry(input.runtimeRoot);
  const workspace = registry.register(workspacePath);
  assertActiveWorkspace(workspace, workspace.id);

  if (input.configuredWorkspaceId && workspace.id !== input.configuredWorkspaceId) {
    throw new Error(
      `Workspace mismatch: server is configured for ${input.configuredWorkspaceId}, ` +
      `but requested ${workspace.id}. Restart the server with this workspace path to dispatch work there.`
    );
  }

  const boot = bootstrapWorkspace(workspace.path, workspace);
  if (boot.failed.length > 0) {
    throw new Error(`Failed to bootstrap workspace "${workspace.id}": ${boot.failed.join(', ')}`);
  }

  return {
    workspace_id: workspace.id,
    workspace_root: workspace.path,
    workspace_name: workspace.name,
    status: 'active',
    orchestrator_root: path.join(workspace.path, RUNTIME_DIR_NAME),
    dispatch_enabled: true
  };
}
