import { createPoll, getPolls, getUserPolls, deletePoll, updatePollStatus } from '@/lib/actions/polls';
import { createServerSupabase } from '@/lib/supabase/server';
import { ensureProfileExists } from '@/lib/utils/profile';
import { revalidatePath } from 'next/cache';

// Mock the modules
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/utils/profile');
jest.mock('next/cache');

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(),
      })),
      order: jest.fn(),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockCreatePollData = {
  title: 'Test Poll',
  description: 'Test Description',
  vote_type: 'single' as const,
  allow_multiple_votes: false,
  max_votes_per_user: 1,
  is_public: true,
  options: ['Option 1', 'Option 2'],
};

describe('polls.ts actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
    (ensureProfileExists as jest.Mock).mockResolvedValue({ success: true, created: false });
    (revalidatePath as jest.Mock).mockImplementation(() => {});
  });

  describe('createPoll', () => {
    it('should create a poll successfully', async () => {
      // Mock successful auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock successful poll creation
      const mockPoll = { id: 'poll-123', ...mockCreatePollData };
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPoll,
              error: null,
            }),
          }),
        }),
      });

      // Mock successful options creation
      const mockOptionsInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPoll,
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        insert: mockOptionsInsert,
      });

      const result = await createPoll(mockCreatePollData);

      expect(result).toEqual({ success: true, pollId: 'poll-123' });
      expect(ensureProfileExists).toHaveBeenCalledWith(mockUser);
      expect(revalidatePath).toHaveBeenCalledWith('/polls');
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(createPoll(mockCreatePollData)).rejects.toThrow(
        'You must be logged in to create a poll'
      );
    });

    it('should throw error when title is too short', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = { ...mockCreatePollData, title: 'Hi' };

      await expect(createPoll(invalidData)).rejects.toThrow(
        'Poll title must be at least 3 characters long'
      );
    });

    it('should throw error when title is too long', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = {
        ...mockCreatePollData,
        title: 'a'.repeat(201)
      };

      await expect(createPoll(invalidData)).rejects.toThrow(
        'Poll title must be less than 200 characters'
      );
    });

    it('should throw error when description is too long', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = {
        ...mockCreatePollData,
        description: 'a'.repeat(1001)
      };

      await expect(createPoll(invalidData)).rejects.toThrow(
        'Poll description must be less than 1000 characters'
      );
    });

    it('should throw error when less than 2 options provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = { ...mockCreatePollData, options: ['Only one'] };

      await expect(createPoll(invalidData)).rejects.toThrow(
        'Poll must have at least 2 options'
      );
    });

    it('should throw error when more than 10 options provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = {
        ...mockCreatePollData,
        options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`)
      };

      await expect(createPoll(invalidData)).rejects.toThrow(
        'Poll cannot have more than 10 options'
      );
    });

    it('should filter out empty options and validate minimum', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = {
        ...mockCreatePollData,
        options: ['Valid option', '', '   ', 'Another valid']
      };

      const mockPoll = { id: 'poll-123' };
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPoll,
              error: null,
            }),
          }),
        }),
      });

      const mockOptionsInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPoll,
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        insert: mockOptionsInsert,
      });

      const result = await createPoll(invalidData);

      expect(result).toEqual({ success: true, pollId: 'poll-123' });
      expect(mockOptionsInsert).toHaveBeenCalledWith([
        { poll_id: 'poll-123', text: 'Valid option', order_index: 0 },
        { poll_id: 'poll-123', text: 'Another valid', order_index: 1 },
      ]);
    });

    it('should handle profile creation failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (ensureProfileExists as jest.Mock).mockRejectedValue(
        new Error('Profile creation failed')
      );

      await expect(createPoll(mockCreatePollData)).rejects.toThrow(
        'Failed to verify user profile. Please try logging out and back in.'
      );
    });

    it('should handle poll creation database error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(createPoll(mockCreatePollData)).rejects.toThrow(
        'Failed to create poll'
      );
    });

    it('should cleanup poll if options creation fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPoll = { id: 'poll-123' };
      const mockDelete = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.from
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockPoll,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            error: { message: 'Options creation failed' },
          }),
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: mockDelete,
          }),
        });

      await expect(createPoll(mockCreatePollData)).rejects.toThrow(
        'Failed to create poll options'
      );

      expect(mockDelete).toHaveBeenCalledWith('id', 'poll-123');
    });
  });

  describe('getPolls', () => {
    it('should fetch public active polls successfully', async () => {
      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Poll 1',
          status: 'active',
          is_public: true,
          profiles: { full_name: 'John Doe' },
          poll_options: [{ text: 'Option 1' }],
          votes: [{ count: 5 }],
        },
      ];

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPolls, error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await getPolls();

      expect(result).toEqual(mockPolls);
      expect(mockSupabase.from).toHaveBeenCalledWith('polls');
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockChain.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should throw error when database query fails', async () => {
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      await expect(getPolls()).rejects.toThrow('Failed to fetch polls');
    });
  });

  describe('getUserPolls', () => {
    it('should fetch user polls successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockPolls = [
        {
          id: 'poll-1',
          title: 'My Poll',
          created_by: 'user-123',
          poll_options: [{ text: 'Option 1' }],
          votes: [{ count: 3 }],
        },
      ];

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPolls, error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await getUserPolls();

      expect(result).toEqual(mockPolls);
      expect(mockChain.eq).toHaveBeenCalledWith('created_by', 'user-123');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getUserPolls()).rejects.toThrow(
        'You must be logged in to view your polls'
      );
    });

    it('should throw error when database query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      await expect(getUserPolls()).rejects.toThrow('Failed to fetch your polls');
    });
  });

  describe('deletePoll', () => {
    const pollId = 'poll-123';

    it('should delete poll successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock poll fetch for ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: pollId, created_by: 'user-123', title: 'Test Poll' },
              error: null,
            }),
          }),
        }),
      });

      // Mock delete operation
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await deletePoll(pollId);

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith('/polls');
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(deletePoll(pollId)).rejects.toThrow(
        'You must be logged in to delete a poll'
      );
    });

    it('should throw error when poll is not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      await expect(deletePoll(pollId)).rejects.toThrow('Poll not found');
    });

    it('should throw error when user is not the owner', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: pollId, created_by: 'other-user', title: 'Test Poll' },
              error: null,
            }),
          }),
        }),
      });

      await expect(deletePoll(pollId)).rejects.toThrow(
        'You can only delete polls that you created'
      );
    });

    it('should throw error when delete operation fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock poll fetch for ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: pollId, created_by: 'user-123', title: 'Test Poll' },
              error: null,
            }),
          }),
        }),
      });

      // Mock delete operation failure
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Delete failed' }
            }),
          }),
        }),
      });

      await expect(deletePoll(pollId)).rejects.toThrow('Failed to delete poll');
    });
  });

  describe('updatePollStatus', () => {
    const pollId = 'poll-123';
    const newStatus = 'closed';

    it('should update poll status successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const updatedPoll = {
        id: pollId,
        status: newStatus,
        updated_at: expect.any(String),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedPoll,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await updatePollStatus(pollId, newStatus);

      expect(result).toEqual({ success: true, poll: updatedPoll });
      expect(revalidatePath).toHaveBeenCalledWith('/polls');
      expect(revalidatePath).toHaveBeenCalledWith(`/polls/${pollId}`);
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(updatePollStatus(pollId, newStatus)).rejects.toThrow(
        'You must be logged in to update a poll'
      );
    });

    it('should throw error when update operation fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(updatePollStatus(pollId, newStatus)).rejects.toThrow(
        'Failed to update poll status'
      );
    });
  });
});
