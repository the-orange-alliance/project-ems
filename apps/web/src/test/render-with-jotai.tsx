import { Provider, createStore } from 'jotai';
import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

export const renderWithJotai = (
  ui: ReactElement,
  initialize?: (store: ReturnType<typeof createStore>) => void,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const store = createStore();
  initialize?.(store);
  return {
    store,
    ...render(ui, {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      ...options
    })
  };
};
