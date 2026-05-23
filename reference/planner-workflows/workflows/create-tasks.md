# Workflow: Create Tasks

Trigger:

- User explicitly approves a plan and asks the planner to create tasks.

Steps:

1. Read the approved plan file.
2. Decompose into at most 20 tasks.
3. Use `XX-kebab-case` task ids, for example `01-update-planner-registration`.
4. Every task must include:
   - `id`
   - `module`
   - `action`
   - `verification`
   - `target_files`
   - `read_files`
   - `done_criteria`
   - `dependencies`
   - `tool_bundle`
   - `context_paths`
   - `skill_paths`
   - `description`
5. Build `graph.groups` so tasks in the same group can run in parallel.
6. Never place two tasks with overlapping `target_files` in the same group.
7. If task B needs task A, put B in a later group with `depends_on`.
8. Call `create_tasks` with `user_approved: true`.
9. Call `planner_task_ready` after `create_tasks` succeeds.
10. Tell the user task creation is done and the server will dispatch workers.

Do not:

- Create tasks without explicit approval.
- Ask workers to edit outside `target_files`.
- Create vague tasks without measurable `done_criteria`.
- Run implementation yourself.
