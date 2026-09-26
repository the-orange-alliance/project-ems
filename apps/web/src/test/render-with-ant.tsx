import { ConfigProvider } from 'antd';
import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

export const renderWithAnt = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) =>
  render(ui, {
    wrapper: ({ children }) => (
      <ConfigProvider getPopupContainer={() => document.body}>
        {children}
      </ConfigProvider>
    ),
    ...options
  });
