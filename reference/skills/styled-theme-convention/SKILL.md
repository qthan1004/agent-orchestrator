---
description: Convention for accessing theme inside @emotion/styled components using useTheme()
---
# Styled Component Theme Convention

- **Theme Access**: DO NOT destructure `theme` from styled callback args. Direct call `useTheme()` inside the callback.
- **Naming**: All styled components MUST end with the `Styled` suffix (e.g., `ModalBackdropStyled`).
- **Return Type**: The styled callback MUST define `: CSSObject` as its return type to prevent TS errors.

```tsx
import styled from '@emotion/styled';
import { CSSObject, useTheme } from '@emotion/react';
import { ThemeSchema } from '@thanh-libs/theme';

export const MyComponentStyled = styled.div<{ ownerOpen: boolean }>(({ ownerOpen }): CSSObject => {
  const { palette, spacing }: ThemeSchema = useTheme();
  return {
    color: palette?.primary?.main ?? '#1976d2',
    opacity: ownerOpen ? 1 : 0,
  };
});
```
