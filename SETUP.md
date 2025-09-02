# ALX Polling Application - Setup Guide

This is a comprehensive guide to set up and run the ALX Polling application locally.

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- A Supabase account and project

## 1. Environment Setup

### Clone and Install Dependencies

```bash
# Navigate to the project directory
cd alx-polling

# Install dependencies
npm install
```

### Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Go to Settings → API
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Database Setup

### Required Tables

Your Supabase database needs the following tables:

#### profiles
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### polls
```sql
CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed', 'archived');
CREATE TYPE vote_type AS ENUM ('single', 'multiple');

CREATE TABLE polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT CHECK (char_length(description) <= 1000),
  status poll_status DEFAULT 'active',
  vote_type vote_type DEFAULT 'single',
  allow_multiple_votes BOOLEAN DEFAULT FALSE,
  max_votes_per_user INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### poll_options
```sql
CREATE TABLE poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 200),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### votes
```sql
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, option_id, user_id)
);
```

#### poll_shares
```sql
CREATE TYPE share_type AS ENUM ('link', 'qr', 'embed');

CREATE TABLE poll_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_type share_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_shares ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Polls policies
CREATE POLICY "Public polls are viewable by everyone" ON polls FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Users can create polls" ON polls FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own polls" ON polls FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own polls" ON polls FOR DELETE USING (auth.uid() = created_by);

-- Poll options policies
CREATE POLICY "Poll options are viewable if poll is viewable" ON poll_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_options.poll_id 
    AND (polls.is_public = true OR polls.created_by = auth.uid())
  )
);
CREATE POLICY "Users can create options for their polls" ON poll_options FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_options.poll_id 
    AND polls.created_by = auth.uid()
  )
);

-- Votes policies
CREATE POLICY "Users can view votes for public polls" ON votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = votes.poll_id 
    AND polls.is_public = true
  )
);
CREATE POLICY "Users can vote on public polls" ON votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = votes.poll_id 
    AND polls.is_public = true 
    AND polls.status = 'active'
  )
);
```

### Database Functions

```sql
-- Function to get poll results
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
    GROUP BY po.id, po.text
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
  ORDER BY vc.vote_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can vote
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
```

## 3. Authentication Setup

### Supabase Auth Configuration

1. In your Supabase dashboard, go to Authentication → Settings
2. Configure the following:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: `http://localhost:3000/**`
   - Enable email confirmation if desired

### Profile Creation Trigger

Create a trigger to automatically create profiles:

```sql
-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

## 4. Running the Application

### Development Server

```bash
npm run dev
```

The application will be available at:
- **Local**: http://localhost:3000
- **Network**: http://[your-ip]:3000

### Production Build

```bash
npm run build
npm run start
```

## 5. Troubleshooting

### Common Issues

#### Environment Variable Errors
- **Error**: Missing NEXT_PUBLIC_SUPABASE_URL
- **Solution**: Ensure `.env.local` exists and has correct Supabase credentials

#### Database Connection Issues
- **Error**: Failed to fetch polls
- **Solution**: Check Supabase project is active and RLS policies are correctly set up

#### Authentication Issues
- **Error**: Session not established
- **Solution**: Check Supabase auth settings and site URL configuration

#### Build Errors
- **Error**: Type errors or missing dependencies
- **Solution**: Run `npm install` and check TypeScript configuration

### Checking Setup

1. **Environment Variables**: Visit any page - if you see environment variable errors, check your `.env.local`
2. **Database**: Try creating a poll - if it fails, check your database tables and RLS policies
3. **Authentication**: Try logging in - if it fails, check Supabase auth configuration

## 6. Features

- ✅ User authentication (register/login)
- ✅ Create and manage polls
- ✅ Vote on public polls
- ✅ Real-time poll results
- ✅ Public/private poll settings
- ✅ Poll expiration dates
- ✅ Single/multiple vote types
- ✅ Responsive design

## 7. API Routes

- `GET /polls` - Fetch public polls
- `POST /polls` - Create new poll (authenticated)
- `GET /polls/[id]` - Get specific poll
- `POST /polls/[id]/vote` - Vote on poll (authenticated)

## 8. Support

If you encounter issues:

1. Check the browser console for errors
2. Review the setup steps above
3. Verify your Supabase configuration
4. Check that all database tables and policies are created

## 9. Next Steps

After successful setup:

1. Create your first poll
2. Test voting functionality
3. Explore the admin features
4. Customize the UI as needed