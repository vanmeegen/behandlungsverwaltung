import { ThemeProvider } from '@mui/material/styles';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { theme } from '../theme';

export function renderWithProviders(ui: ReactElement, options?: RenderOptions): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>,
    ...options,
  });
}
