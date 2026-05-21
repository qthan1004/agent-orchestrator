import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkerRegistry } from '../dist/utils/worker-registry.js';
import { WorkspaceRegistry } from '../dist/utils/workspace-registry.js';
import { TaskIdentityRegistry } from '../dist/utils/task-identity-registry.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrows(fn, message) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }
  assert(thrown, message);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-identity-'));
const taskRegistry = new TaskIdentityRegistry(path.join(root, 'registry', 'tasks.json'), 'ws-1');
const workerRegistry = new WorkerRegistry(path.join(root, 'registry', 'workers.json'));

taskRegistry.registerTask({
  task_id: 'T1',
  workspace_id: 'ws-1',
  task_content_path: '.orchestrator/plans/processing/T1.md',
});
taskRegistry.setStatus('T1', 'active');

const worker1 = workerRegistry.register('ws-1');
const worker2 = workerRegistry.register('ws-1');
workerRegistry.assignTask(worker1.id, 'T1', taskRegistry);

assertThrows(
  () => workerRegistry.assignTask(worker2.id, 'T1', taskRegistry),
  'Task assigned to second worker must be rejected.'
);

taskRegistry.registerTask({
  task_id: 'T2',
  workspace_id: 'ws-1',
  task_content_path: '.orchestrator/plans/processing/T2.md',
});
taskRegistry.setStatus('T2', 'active');

assertThrows(
  () => workerRegistry.assignTask(worker1.id, 'T2', taskRegistry),
  'Worker owning second active task must be rejected.'
);

const worker3 = workerRegistry.register('ws-2');
assertThrows(
  () => workerRegistry.assignTask(worker3.id, 'T2', taskRegistry),
  'Worker/task workspace mismatch must be rejected.'
);

assertThrows(
  () => taskRegistry.registerTask({ task_id: 'T3', workspace_id: 'ws-2' }),
  'Task workspace mismatch must be rejected.'
);

const rawTaskRegistry = JSON.parse(fs.readFileSync(path.join(root, 'registry', 'tasks.json'), 'utf8'));
assert(rawTaskRegistry.every(record => !('description' in record) && !('content' in record) && !('body' in record)), 'Task registry must not store task body fields.');

const runtimeRoot = path.join(root, 'runtime');
const workspacePath = fs.mkdtempSync(path.join(root, 'workspace-'));
const workspaceRegistry = new WorkspaceRegistry(runtimeRoot);
const workspace = workspaceRegistry.register(workspacePath);
workspaceRegistry.close(workspace.id);
assertThrows(
  () => workspaceRegistry.register(workspacePath),
  'Closed workspace must reject new registration.'
);

console.log(JSON.stringify({ ok: true, root }));
