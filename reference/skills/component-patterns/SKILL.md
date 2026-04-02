---
description: React component structure, styled patterns, and naming conventions
---

# Component Patterns for @thanh-libs/*

## Structure & Architecture
- `src/lib/ComponentName.tsx` (Main), `styled.tsx` (Styles), `models/index.ts` (Types), `constants/`, `helpers/`, `stories/`.
- Use a subfolder inside `src/lib/` if there are multiple root components.

## Component Rules (ComponentName.tsx)
- ALWAYS use `forwardRef` for DOM-wrapping components. Set `displayName`. Spread `...rest`.
- **Arrow functions ONLY** (`const fn = () => {}`). No `function` keyword (unless for generators/this).

## Styled Rules (styled.tsx)
- **Object style ONLY**: `({ prop }): CSSObject => ({ ... })`. No template literals.
- Prefix custom styled props with `owner` (e.g., `ownerVariant`) to avoid DOM leakage.
- Suffix all styled components with `Styled` (e.g., `ButtonStyled`).
- ALWAYS call `const { palette, spacing }: ThemeSchema = useTheme()` inside the callback. DO NOT access `theme` from arguments.

## Models & Index
- Define types extending `HTMLAttributes<HTMLElement>`. Add JSDoc to every prop.
- `src/index.ts` MUST use named exports only (`export { Cmp }`). No defaults.

## Theme-First Styling
- Theme is the single source of truth (`@thanh-libs/theme`). Never use hardcoded values unless as a fallback.
- Read `palette.primary.main` (colors), `spacing.medium` (padding/margin), `shape.borderRadius`, `zIndex.modal`.
- **Spacing Scale**: 1=tiny(4px), 2=small(8px), 3=medium(12px), 4=large(16px), 5=extraLarge(24px).

## API & WCAG Accessibility
- Research MUI, Ant Design, and shadcn/ui to build familiar API props.
- **Interactive**: Ensure `:focus-visible`, `aria-disabled`, `aria-busy`, and `aria-label` for icons exist.
- **Overlays (Modals/Popovers)**: `role="dialog"`, trap focus, ESC to close, restore focus on close.
- **Forms**: Connect labels (`htmlFor`), pass `aria-invalid` and `aria-required`.
- Always use semantic HTML tags (`<button>`, `<dialog>`), avoid generic `<div onClick>`.
