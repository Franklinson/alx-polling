export type PollStatus = 'draft' | 'active' | 'closed' | 'archived';
export type VoteType = 'single' | 'multiple';
export type ShareType = 'link' | 'qr' | 'embed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  status: PollStatus;
  vote_type: VoteType;
  allow_multiple_votes: boolean;
  max_votes_per_user: number;
  is_public: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  order_index: number;
  created_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

export interface PollShare {
  id: string;
  poll_id: string;
  shared_by: string;
  share_type: ShareType;
  created_at: string;
}

export interface PollWithOptions extends Poll {
  options: PollOption[];
  total_votes: number;
}

export interface PollWithResults extends PollWithOptions {
  results: PollResult[];
}

export interface PollResult {
  option_id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
}

export interface CreatePollData {
  title: string;
  description?: string;
  vote_type?: VoteType;
  allow_multiple_votes?: boolean;
  max_votes_per_user?: number;
  is_public?: boolean;
  expires_at?: string;
  options: string[];
}

export interface UpdatePollData {
  title?: string;
  description?: string;
  status?: PollStatus;
  vote_type?: VoteType;
  allow_multiple_votes?: boolean;
  max_votes_per_user?: number;
  is_public?: boolean;
  expires_at?: string;
}

export interface VoteData {
  poll_id: string;
  option_ids: string[];
}

// Database enums for Supabase
export const DatabaseEnums = {
  poll_status: ['draft', 'active', 'closed', 'archived'] as const,
  vote_type: ['single', 'multiple'] as const,
  share_type: ['link', 'qr', 'embed'] as const,
} as const;

// Supabase database schema types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      polls: {
        Row: Poll;
        Insert: Omit<Poll, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Poll, 'id' | 'created_at' | 'updated_at'>>;
      };
      poll_options: {
        Row: PollOption;
        Insert: Omit<PollOption, 'id' | 'created_at'>;
        Update: Partial<Omit<PollOption, 'id' | 'created_at'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: Partial<Omit<Vote, 'id' | 'created_at'>>;
      };
      poll_shares: {
        Row: PollShare;
        Insert: Omit<PollShare, 'id' | 'created_at'>;
        Update: Partial<Omit<PollShare, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_poll_results: {
        Args: { poll_uuid: string };
        Returns: PollResult[];
      };
      can_user_vote: {
        Args: { poll_uuid: string; user_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      poll_status: PollStatus;
      vote_type: VoteType;
      share_type: ShareType;
    };
  };
}
