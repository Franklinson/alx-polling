-- ALX Polling Database Migration
-- This migration sets up the complete database schema with automatic profile creation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vote_type AS ENUM ('single', 'multiple');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE share_type AS ENUM ('link', 'qr', 'embed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT CHECK (char_length(description) <= 1000),
  status poll_status DEFAULT 'active',
  vote_type vote_type DEFAULT 'single',
  allow_multiple_votes BOOLEAN DEFAULT FALSE,
  max_votes_per_user INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 200),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, order_index)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, option_id, user_id)
);

-- Create poll_shares table
CREATE TABLE IF NOT EXISTS poll_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  share_type share_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_is_public ON polls(is_public);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON votes(option_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Public polls are viewable by everyone" ON polls;
DROP POLICY IF EXISTS "Users can create polls" ON polls;
DROP POLICY IF EXISTS "Users can update their own polls" ON polls;
DROP POLICY IF EXISTS "Users can delete their own polls" ON polls;
DROP POLICY IF EXISTS "Poll options are viewable if poll is viewable" ON poll_options;
DROP POLICY IF EXISTS "Users can create options for their polls" ON poll_options;
DROP POLICY IF EXISTS "Users can update options for their polls" ON poll_options;
DROP POLICY IF EXISTS "Users can delete options for their polls" ON poll_options;
DROP POLICY IF EXISTS "Users can view votes for public polls" ON votes;
DROP POLICY IF EXISTS "Users can vote on public polls" ON votes;
DROP POLICY IF EXISTS "Poll shares are viewable if poll is viewable" ON poll_shares;
DROP POLICY IF EXISTS "Users can create shares for their polls" ON poll_shares;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Polls policies
CREATE POLICY "Public polls are viewable by everyone" ON polls
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create polls" ON polls
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own polls" ON polls
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own polls" ON polls
  FOR DELETE USING (auth.uid() = created_by);

-- Poll options policies
CREATE POLICY "Poll options are viewable if poll is viewable" ON poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
      AND (polls.is_public = true OR polls.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can create options for their polls" ON poll_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
      AND polls.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update options for their polls" ON poll_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
      AND polls.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete options for their polls" ON poll_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
      AND polls.created_by = auth.uid()
    )
  );

-- Votes policies
CREATE POLICY "Users can view votes for public polls" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = votes.poll_id
      AND polls.is_public = true
    )
  );

CREATE POLICY "Users can vote on public polls" ON votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = votes.poll_id
      AND polls.is_public = true
      AND polls.status = 'active'
      AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
    )
  );

-- Poll shares policies
CREATE POLICY "Poll shares are viewable if poll is viewable" ON poll_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_shares.poll_id
      AND (polls.is_public = true OR polls.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can create shares for their polls" ON poll_shares
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_shares.poll_id
      AND polls.created_by = auth.uid()
    )
  );

-- Create function to automatically create profile for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_polls_updated_at ON polls;
CREATE TRIGGER update_polls_updated_at
    BEFORE UPDATE ON polls
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(poll_uuid UUID)
RETURNS TABLE (
  option_id UUID,
  option_text TEXT,
  vote_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH vote_counts AS (
    SELECT
      po.id as option_id,
      po.text as option_text,
      COUNT(v.id) as vote_count
    FROM poll_options po
    LEFT JOIN votes v ON po.id = v.option_id
    WHERE po.poll_id = poll_uuid
    GROUP BY po.id, po.text, po.order_index
    ORDER BY po.order_index
  ),
  total_votes AS (
    SELECT SUM(vote_count) as total FROM vote_counts
  )
  SELECT
    vc.option_id,
    vc.option_text,
    vc.vote_count,
    CASE
      WHEN tv.total > 0 THEN ROUND((vc.vote_count::NUMERIC / tv.total::NUMERIC) * 100, 2)
      ELSE 0
    END as percentage
  FROM vote_counts vc
  CROSS JOIN total_votes tv
  ORDER BY vc.vote_count DESC, vc.option_text ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can vote
CREATE OR REPLACE FUNCTION can_user_vote(poll_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  poll_record polls%ROWTYPE;
  user_vote_count INTEGER;
BEGIN
  -- Get poll details
  SELECT * INTO poll_record FROM polls WHERE id = poll_uuid;

  -- Check if poll exists and is active
  IF NOT FOUND OR poll_record.status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check if poll has expired
  IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Count existing votes by this user
  SELECT COUNT(*) INTO user_vote_count
  FROM votes
  WHERE poll_id = poll_uuid AND user_id = user_uuid;

  -- Check if user has exceeded max votes
  IF user_vote_count >= poll_record.max_votes_per_user THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user vote status for a poll
CREATE OR REPLACE FUNCTION get_user_poll_vote_status(poll_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  can_vote BOOLEAN,
  votes_cast INTEGER,
  max_votes INTEGER,
  voted_options UUID[]
) AS $$
DECLARE
  poll_record polls%ROWTYPE;
  user_vote_count INTEGER;
  user_voted_options UUID[];
BEGIN
  -- Get poll details
  SELECT * INTO poll_record FROM polls WHERE id = poll_uuid;

  -- If poll doesn't exist, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, ARRAY[]::UUID[];
    RETURN;
  END IF;

  -- Count existing votes and get voted options
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(option_id)
  INTO
    user_vote_count,
    user_voted_options
  FROM votes
  WHERE poll_id = poll_uuid AND user_id = user_uuid;

  -- Handle null array
  IF user_voted_options IS NULL THEN
    user_voted_options := ARRAY[]::UUID[];
  END IF;

  -- Check if user can vote
  RETURN QUERY SELECT
    (poll_record.status = 'active' AND
     (poll_record.expires_at IS NULL OR poll_record.expires_at > NOW()) AND
     user_vote_count < poll_record.max_votes_per_user)::BOOLEAN,
    user_vote_count,
    poll_record.max_votes_per_user,
    user_voted_options;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample data for testing (optional)
-- You can uncomment this section if you want sample data

/*
-- Insert a sample user profile (replace with your actual auth user ID)
-- INSERT INTO profiles (id, email, full_name) VALUES
-- ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'Test User')
-- ON CONFLICT (id) DO NOTHING;

-- Insert sample polls
INSERT INTO polls (title, description, created_by, is_public) VALUES
('Sample Poll', 'This is a sample poll for testing', '00000000-0000-0000-0000-000000000000', true)
ON CONFLICT DO NOTHING;

-- Get the poll ID for sample options
WITH sample_poll AS (
  SELECT id FROM polls WHERE title = 'Sample Poll' LIMIT 1
)
INSERT INTO poll_options (poll_id, text, order_index)
SELECT id, 'Option 1', 0 FROM sample_poll
UNION ALL
SELECT id, 'Option 2', 1 FROM sample_poll
UNION ALL
SELECT id, 'Option 3', 2 FROM sample_poll
ON CONFLICT DO NOTHING;
*/

-- Migration complete message
DO $$
BEGIN
  RAISE NOTICE 'ALX Polling database migration completed successfully!';
  RAISE NOTICE 'Tables created: profiles, polls, poll_options, votes, poll_shares';
  RAISE NOTICE 'Functions created: handle_new_user, get_poll_results, can_user_vote, get_user_poll_vote_status';
  RAISE NOTICE 'Triggers created: automatic profile creation, updated_at maintenance';
  RAISE NOTICE 'Row Level Security enabled with appropriate policies';
END $$;
