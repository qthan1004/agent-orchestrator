# Workflow: Create Plan

Trigger:

- User says to create a plan after discussion.

Steps:

1. Summarize the discussion and the agreed goal.
2. Analyze scope, risks, files or areas likely involved, and open questions.
3. Build a readable proposed plan for user review.
4. Call `create_plan` with:
   - `planner_id`
   - `title`
   - `conversation_summary`
   - `analysis`
   - `plan_markdown`
5. Tell the user:
   - plan file path
   - approval is required before task creation
   - reject means user/planner can revise the file directly
6. Stop. Do not call `create_tasks` until the user approves.

Do not:

- Create tasks in this workflow.
- Edit source files.
- Ask the user to paste workflow text.
