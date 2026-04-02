import { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '@thanh-libs/theme';
const preview: Preview = {
  parameters: { backgrounds: { disable: true } },
  globalTypes: {
    themeMode: {
      description: 'Theme mode',
      toolbar: {
        title: 'Theme', icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' }
        ], dynamicTitle: true,
      },
    },
  },
  initialGlobals: { themeMode: 'light' },
  decorators: [(Story, context) => (
    <ThemeProvider defaultMode={context.globals.themeMode || 'light'}><Story /></ThemeProvider>
  )],
};
export default preview;
