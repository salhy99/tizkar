import { vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

vi.mock('next/config', () => ({
  default: () => ({}),
}))
