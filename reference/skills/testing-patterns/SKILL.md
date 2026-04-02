---
name: Testing Patterns & Conventions
description: How to write unit and component tests using Vitest and React Testing Library.
---

# Testing Patterns

All components in the `@thanh-libs/*` workspace MUST be unit tested.

## Environment & Frameworks
- **Runner**: `vitest` (Test files must end with `.spec.tsx` or `.test.tsx`).
- **DOM/UI**: `@testing-library/react` and `@testing-library/user-event`.
- **A11y**: `jest-axe` for automated accessibility testing.

## Test Location
- Test files belong **next to the component** they test: `src/lib/ComponentName.spec.tsx`. Do NOT create an isolated `tests/` folder for component suites.

## Core Rules for Agents
1. **Theme Provider Requirement**: Any UI test MUST wrap the target component inside a `<ThemeProvider>` from `@thanh-libs/theme`. Otherwise, emotion styled-components will crash when attempting to access the `theme` object.
2. **Explicit Imports**: Always import `describe`, `it`, `expect` from `vitest`.
3. **Accessibility**: Every component MUST have at least one test case verifying it has no accessibility violations using `axe`.
4. **Interactions**: Prefer `@testing-library/user-event` over `fireEvent` to simulate realistic user behaviors (clicks, typing, tabbing).

### Example Boilerplate
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { axe } from 'jest-axe';
import { ThemeProvider } from '@thanh-libs/theme';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<ThemeProvider><Button>Click Me</Button></ThemeProvider>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ThemeProvider><Button>Click Me</Button></ThemeProvider>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```
