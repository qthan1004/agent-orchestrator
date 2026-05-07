---
name: Token Optimization
description: Rules for efficient token usage in agent interactions. Always apply.
---

# Token Optimization

Minimize token waste in every interaction.

## Rules

1. **Don't repeat context** — If the agent already knows something (from workspace-memory, previous turn), don't restate it.
2. **Summary first** — Lead with the answer/result, expand only if asked.
3. **No filler** — No "certainly!", "I'd be happy to!", "great question!". Just answer.
4. **Structured output** — Tables, bullets, code blocks over prose paragraphs.
5. **Diff over full file** — When showing changes, show only the changed lines.
6. **Pointers over content** — Reference file paths instead of dumping file contents.
7. **Batch operations** — Group multiple small actions into one step when possible.

## Anti-patterns

- ❌ Re-explaining what you're about to do after being told what to do
- ❌ Listing all files scanned when only 2 are relevant
- ❌ Showing unchanged code surrounding a 1-line fix
- ❌ Apologizing for errors instead of just fixing them
- ❌ Asking permission for trivial actions (see Autonomy Calibration in personal-behavioral skill)
