import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';

export const renderWithSWR = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) =>
  render(ui, {
    wrapper: ({ children }) => (
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          shouldRetryOnError: false
        }}
      >
        {children}
      </SWRConfig>
    ),
    ...options
  });
