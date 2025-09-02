# Database Schema Setup

This directory contains the database schema for the Polling App built with Supabase.

## Files

- `schema.sql` - Complete database schema with tables, policies, and functions
- `README.md` - This setup guide

## Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Go to **Settings** → **API** to get your project URL and anon key

### 2. Set Environment Variables

Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `schema.sql`
3. Click **Run** to execute the schema

### 4. Verify Setup

Check that these tables were created:
- `profiles`
- `polls`
- `poll_options`
- `votes`
- `poll_shares`

## Schema Overview

### Core Tables

#### `profiles`
- Extends Supabase auth.users
- Stores user profile information
- Automatically created when users sign up

#### `polls`
- Main poll data (title, description, settings)
- Supports different vote types (single/multiple)
- Configurable privacy and expiration

#### `poll_options`
- Individual options for each poll
- Ordered by `order_index` field

#### `votes`
- User votes on poll options
- Prevents duplicate votes per user per option

#### `poll_shares`
- Tracks how polls are shared (link, QR, embed)

### Key Features

#### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Public polls are viewable by everyone
- Private polls are restricted to creators

#### Automatic Functions
- `get_poll_results(poll_uuid)` - Calculate vote percentages
- `can_user_vote(poll_uuid, user_uuid)` - Check voting eligibility

#### Triggers
- Auto-updates `updated_at` timestamps
- Creates profile automatically on user signup

## Usage Examples

### Create a Poll
```sql
INSERT INTO polls (title, description, created_by, is_public)
VALUES ('Favorite Color?', 'What is your favorite color?', 'user-uuid', true);

INSERT INTO poll_options (poll_id, text, order_index)
VALUES 
  ('poll-uuid', 'Red', 0),
  ('poll-uuid', 'Blue', 1),
  ('poll-uuid', 'Green', 2);
```

### Get Poll Results
```sql
SELECT * FROM get_poll_results('poll-uuid');
```

### Check if User Can Vote
```sql
SELECT can_user_vote('poll-uuid', 'user-uuid');
```

## Security Features

- **JWT-based authentication** via Supabase Auth
- **Row Level Security** policies on all tables
- **Input validation** with CHECK constraints
- **Foreign key constraints** for data integrity
- **Automatic profile creation** on signup

## Performance Optimizations

- **Indexes** on frequently queried columns
- **Efficient queries** using EXISTS clauses
- **Materialized views** for complex aggregations (if needed)

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure user is authenticated
2. **Foreign Key Violations**: Check that referenced records exist
3. **Permission Denied**: Verify RLS policies are correct

### Debug Queries

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public';

-- View table structure
\d+ polls
\d+ poll_options
\d+ votes
```

## Next Steps

After setting up the database:

1. Update your Supabase client configuration
2. Implement poll creation and voting logic
3. Add real-time subscriptions for live results
4. Set up storage for poll images/attachments

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
