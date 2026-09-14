import { vi } from 'vitest';

export const createWorkerMock = () => ({
  emit: vi.fn(),
  off: vi.fn(),
  on: vi.fn()
});
