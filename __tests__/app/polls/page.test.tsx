import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import PollsIndexPage from '@/app/polls/page';
import { getPolls, getUserPolls } from '@/lib/actions/polls';
import { createServerSupabase } from '@/lib/supabase/server';

// Mock the dependencies
jest.mock('@/lib/actions/polls');
jest.mock('@/lib/supabase/server');
jest.mock('@/components/polls/poll-card', () => {
  return function MockPollCard({ poll, isOwner, showActions }: any) {
    return (
      <div data-testid={`poll-card-${poll.id}`}>
        <h3>{poll.title}</h3>
        <p>{poll.description}</p>
        <span data-testid="is-owner">{isOwner.toString()}</span>
        <span data-testid="show-actions">{showActions.toString()}</span>
      </div>
    );
  };
});

jest.mock('next/link', () => {
  return function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  };
});

const mockGetPolls = getPolls as jest.MockedFunction<typeof getPolls>;
const mockGetUserPolls = getUserPolls as jest.MockedFunction<typeof getUserPolls>;
const mockCreateServerSupabase = createServerSupabase as jest.MockedFunction<typeof createServerSupabase>;

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockPublicPolls = [
  {
    id: 'public-poll-1',
    title: 'Public Poll 1',
    description: 'Description 1',
    created_by: 'other-user',
    is_public: true,
    status: 'active',
    poll_options: [{ text: 'Option 1' }, { text: 'Option 2' }],
    votes: [{ count: 5 }],
    profiles: { full_name: 'John Doe' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'public-poll-2',
    title: 'Public Poll 2',
    description: 'Description 2',
    created_by: 'another-user',
    is_public: true,
    status: 'active',
    poll_options: [{ text: 'Option A' }, { text: 'Option B' }],
    votes: [{ count: 3 }],
    profiles: { full_name: 'Jane Smith' },
    created_at: new Date().toISOString(),
  },
];

const mockUserPolls = [
  {
    id: 'user-poll-1',
    title: 'My Poll 1',
    description: 'My Description 1',
    created_by: 'user-123',
    is_public: true,
    status: 'active',
    poll_options: [{ text: 'My Option 1' }, { text: 'My Option 2' }],
    votes: [{ count: 7 }],
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-poll-2',
    title: 'My Poll 2',
    description: 'My Description 2',
    created_by: 'user-123',
    is_public: false,
    status: 'draft',
    poll_options: [{ text: 'Draft Option 1' }, { text: 'Draft Option 2' }],
    votes: [{ count: 0 }],
    created_at: new Date().toISOString(),
  },
];

describe('PollsIndexPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerSupabase.mockResolvedValue(mockSupabase as any);
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockGetPolls.mockResolvedValue(mockPublicPolls);
      mockGetUserPolls.mockResolvedValue(mockUserPolls);
    });

    it('should render the page with authenticated user content', async () => {
      render(await PollsIndexPage());

      // Check main heading
      expect(screen.getByText('Polls')).toBeInTheDocument();
      expect(screen.getByText('Discover and participate in community polls')).toBeInTheDocument();

      // Check create poll button
      expect(screen.getByText('Create New Poll')).toBeInTheDocument();
    });

    it('should display user polls section when user has polls', async () => {
      render(await PollsIndexPage());

      // Check "My Polls" section
      expect(screen.getByText('My Polls')).toBeInTheDocument();
      expect(screen.getByText('2 polls created by you')).toBeInTheDocument();

      // Check user poll cards are rendered with correct props
      expect(screen.getByTestId('poll-card-user-poll-1')).toBeInTheDocument();
      expect(screen.getByTestId('poll-card-user-poll-2')).toBeInTheDocument();

      // Verify user polls have isOwner=true and showActions=true
      const userPollCards = screen.getAllByTestId(/poll-card-user-poll-/);
      userPollCards.forEach(card => {
        expect(card.querySelector('[data-testid="is-owner"]')).toHaveTextContent('true');
        expect(card.querySelector('[data-testid="show-actions"]')).toHaveTextContent('true');
      });
    });

    it('should display public polls section', async () => {
      render(await PollsIndexPage());

      // Check "Public Polls" section (when user has polls, it shows "Public Polls")
      expect(screen.getByText('Public Polls')).toBeInTheDocument();
      expect(screen.getByText('2 active polls available')).toBeInTheDocument();

      // Check public poll cards are rendered
      expect(screen.getByTestId('poll-card-public-poll-1')).toBeInTheDocument();
      expect(screen.getByTestId('poll-card-public-poll-2')).toBeInTheDocument();

      // Verify public polls have correct ownership
      const publicPoll1 = screen.getByTestId('poll-card-public-poll-1');
      expect(publicPoll1.querySelector('[data-testid="is-owner"]')).toHaveTextContent('false');
      expect(publicPoll1.querySelector('[data-testid="show-actions"]')).toHaveTextContent('false');
    });

    it('should show "Recent Polls" when user has no polls', async () => {
      mockGetUserPolls.mockResolvedValue([]);

      render(await PollsIndexPage());

      // Should show "Recent Polls" instead of "Public Polls"
      expect(screen.getByText('Recent Polls')).toBeInTheDocument();
      expect(screen.queryByText('Public Polls')).not.toBeInTheDocument();
    });

    it('should display empty state when user has no polls', async () => {
      mockGetUserPolls.mockResolvedValue([]);

      render(await PollsIndexPage());

      // Check empty state card
      expect(screen.getByText('No polls created yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first poll to start gathering opinions and insights from the community.')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Poll')).toBeInTheDocument();
    });

    it('should handle user polls fetch error gracefully', async () => {
      mockGetUserPolls.mockRejectedValue(new Error('User polls fetch failed'));
      console.warn = jest.fn(); // Mock console.warn to check if it's called

      render(await PollsIndexPage());

      // Should still render public polls even if user polls fail
      expect(screen.getByText('Public Polls')).toBeInTheDocument();
      expect(screen.getByTestId('poll-card-public-poll-1')).toBeInTheDocument();

      // Should not show user polls section
      expect(screen.queryByText('My Polls')).not.toBeInTheDocument();

      // Check that warning was logged
      expect(console.warn).toHaveBeenCalledWith('Could not fetch user polls:', expect.any(Error));
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      mockGetPolls.mockResolvedValue(mockPublicPolls);
    });

    it('should render page without authenticated features', async () => {
      render(await PollsIndexPage());

      // Check main heading
      expect(screen.getByText('Polls')).toBeInTheDocument();

      // Should not show create poll button
      expect(screen.queryByText('Create New Poll')).not.toBeInTheDocument();

      // Should not show user polls section
      expect(screen.queryByText('My Polls')).not.toBeInTheDocument();

      // Should show "Recent Polls"
      expect(screen.getByText('Recent Polls')).toBeInTheDocument();
    });

    it('should display join community card for unauthenticated users', async () => {
      render(await PollsIndexPage());

      // Check join community section
      expect(screen.getByText('Join the Community')).toBeInTheDocument();
      expect(screen.getByText('Sign in to create your own polls and participate in voting.')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('should show "Sign In to Create Polls" when no polls exist', async () => {
      mockGetPolls.mockResolvedValue([]);

      render(await PollsIndexPage());

      // Check empty state for unauthenticated users
      expect(screen.getByText('No polls yet')).toBeInTheDocument();
      expect(screen.getByText('Be the first to create a poll and start gathering opinions!')).toBeInTheDocument();
      expect(screen.getByText('Sign In to Create Polls')).toBeInTheDocument();
    });

    it('should display public poll cards with correct ownership for unauthenticated users', async () => {
      render(await PollsIndexPage());

      // Check public poll cards
      const publicPoll1 = screen.getByTestId('poll-card-public-poll-1');
      const publicPoll2 = screen.getByTestId('poll-card-public-poll-2');

      expect(publicPoll1).toBeInTheDocument();
      expect(publicPoll2).toBeInTheDocument();

      // All polls should have isOwner=false for unauthenticated users
      expect(publicPoll1.querySelector('[data-testid="is-owner"]')).toHaveTextContent('false');
      expect(publicPoll2.querySelector('[data-testid="is-owner"]')).toHaveTextContent('false');
      expect(publicPoll1.querySelector('[data-testid="show-actions"]')).toHaveTextContent('false');
      expect(publicPoll2.querySelector('[data-testid="show-actions"]')).toHaveTextContent('false');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should display error message when polls fetch fails', async () => {
      const errorMessage = 'Failed to fetch polls';
      mockGetPolls.mockRejectedValue(new Error(errorMessage));

      render(await PollsIndexPage());

      // Check error display
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Please try refreshing the page.')).toBeInTheDocument();

      // Should not show normal content
      expect(screen.queryByText('Polls')).not.toBeInTheDocument();
      expect(screen.queryByText('Create New Poll')).not.toBeInTheDocument();
    });

    it('should handle non-Error objects in catch block', async () => {
      mockGetPolls.mockRejectedValue('String error');

      render(await PollsIndexPage());

      // Should show generic error message
      expect(screen.getByText('Failed to load polls')).toBeInTheDocument();
      expect(screen.getByText('Please try refreshing the page.')).toBeInTheDocument();
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });
      mockGetPolls.mockResolvedValue(mockPublicPolls);

      render(await PollsIndexPage());

      // Should still render as unauthenticated user
      expect(screen.getByText('Recent Polls')).toBeInTheDocument();
      expect(screen.queryByText('Create New Poll')).not.toBeInTheDocument();
    });
  });

  describe('poll counts and labels', () => {
    it('should show singular form for single poll', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockGetPolls.mockResolvedValue([mockPublicPolls[0]]);
      mockGetUserPolls.mockResolvedValue([mockUserPolls[0]]);

      render(await PollsIndexPage());

      // Check singular forms
      expect(screen.getByText('1 poll created by you')).toBeInTheDocument();
      expect(screen.getByText('1 active poll available')).toBeInTheDocument();
    });

    it('should show plural form for multiple polls', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockGetPolls.mockResolvedValue(mockPublicPolls);
      mockGetUserPolls.mockResolvedValue(mockUserPolls);

      render(await PollsIndexPage());

      // Check plural forms
      expect(screen.getByText('2 polls created by you')).toBeInTheDocument();
      expect(screen.getByText('2 active polls available')).toBeInTheDocument();
    });

    it('should show zero polls correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockGetPolls.mockResolvedValue([]);
      mockGetUserPolls.mockResolvedValue([]);

      render(await PollsIndexPage());

      // Should show empty state
      expect(screen.getByText('No polls yet')).toBeInTheDocument();
    });
  });

  describe('ownership detection', () => {
    it('should correctly identify owned polls in public polls section', async () => {
      const mixedPolls = [
        { ...mockPublicPolls[0], created_by: 'user-123' }, // User's poll
        { ...mockPublicPolls[1], created_by: 'other-user' }, // Other user's poll
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockGetPolls.mockResolvedValue(mixedPolls);
      mockGetUserPolls.mockResolvedValue([]);

      render(await PollsIndexPage());

      // First poll should be owned by user
      const ownedPoll = screen.getByTestId('poll-card-public-poll-1');
      expect(ownedPoll.querySelector('[data-testid="is-owner"]')).toHaveTextContent('true');

      // Second poll should not be owned by user
      const notOwnedPoll = screen.getByTestId('poll-card-public-poll-2');
      expect(notOwnedPoll.querySelector('[data-testid="is-owner"]')).toHaveTextContent('false');
    });
  });
});
