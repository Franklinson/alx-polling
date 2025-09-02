import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/polls',
    query: {},
    asPath: '/polls',
  }),
  useParams: () => ({
    id: 'test-poll-id',
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock Next.js cache functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabase: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock profile utils
jest.mock('@/lib/utils/profile', () => ({
  ensureProfileExists: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

// Suppress console.error during tests unless specifically needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is deprecated')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
