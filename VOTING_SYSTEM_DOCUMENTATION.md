# Real-Time Voting System Documentation

## Overview

This document describes the implementation of a real-time voting system for the ALX Polling application. The system replaces placeholder content with fully functional voting capabilities, including real-time results, multiple voting types, and comprehensive user interaction.

## Features Implemented

### 1. Real-Time Voting Interface
- **Interactive Poll Display**: Shows poll title, description, and voting options
- **Real-Time Updates**: Vote counts and percentages update immediately after voting
- **Visual Feedback**: Progress bars show vote distribution with percentages
- **User Vote Tracking**: Highlights options the current user has voted for

### 2. Voting Types Supported
- **Single Choice**: Users can vote for one option only
- **Multiple Choice**: Users can vote for multiple options (up to configured limit)
- **Vote Limits**: Configurable maximum votes per user

### 3. Security & Validation
- **Authentication Required**: Users must be logged in to vote
- **Duplicate Vote Prevention**: Prevents multiple votes for same option
- **Poll Status Validation**: Only allows voting on active polls
- **Expiration Checking**: Prevents voting on expired polls
- **Ownership Validation**: Respects public/private poll settings

### 4. User Experience Features
- **Vote Removal**: Users can remove their votes
- **Results Toggle**: Switch between voting and results view
- **Loading States**: Shows loading indicators during API calls
- **Error Handling**: Comprehensive error messages for various scenarios
- **Toast Notifications**: Real-time feedback for user actions

## API Endpoints Created

### 1. `/api/polls/[id]/vote` (POST)
**Purpose**: Cast a vote on a poll option

**Request Body**:
```json
{
  "optionId": "uuid-of-poll-option"
}
```

**Response**:
```json
{
  "success": true,
  "vote": {
    "id": "vote-uuid",
    "poll_id": "poll-uuid",
    "option_id": "option-uuid",
    "user_id": "user-uuid",
    "created_at": "timestamp"
  },
  "results": [
    {
      "option_id": "uuid",
      "option_text": "Option text",
      "vote_count": 5,
      "percentage": 25.5
    }
  ],
  "message": "Vote cast successfully"
}
```

**Validation**:
- User authentication required
- Poll must be active and not expired
- Respects vote limits per user
- Prevents duplicate votes for same option
- Handles single vs multiple vote types

### 2. `/api/polls/[id]/vote` (DELETE)
**Purpose**: Remove user's vote(s) from a poll

**Request Body** (Optional):
```json
{
  "optionId": "uuid-of-specific-option" // Optional: remove specific vote
}
```

**Response**:
```json
{
  "success": true,
  "results": [...], // Updated results
  "message": "Vote removed successfully"
}
```

### 3. `/api/polls/[id]/results` (GET)
**Purpose**: Get current poll results and voting statistics

**Response**:
```json
{
  "results": [
    {
      "option_id": "uuid",
      "option_text": "Option text",
      "vote_count": 5,
      "percentage": 25.5
    }
  ],
  "totalVotes": 20,
  "uniqueVoters": 15,
  "userVotes": ["option-uuid-1", "option-uuid-2"],
  "poll": {
    "id": "poll-uuid",
    "title": "Poll title",
    "status": "active",
    "vote_type": "single",
    "max_votes_per_user": 1,
    "expires_at": "timestamp"
  }
}
```

### 4. `/api/polls` (GET)
**Purpose**: List polls with pagination and filtering

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `status`: Filter by poll status
- `search`: Search in title/description
- `userId`: Get user's own polls (requires authentication)

### 5. `/api/polls` (POST)
**Purpose**: Create a new poll

**Request Body**:
```json
{
  "title": "Poll title",
  "description": "Optional description",
  "status": "draft|active",
  "vote_type": "single|multiple",
  "max_votes_per_user": 1,
  "is_public": true,
  "expires_at": "optional-timestamp",
  "options": ["Option 1", "Option 2", "Option 3"]
}
```

## Database Functions

### `get_poll_results(poll_uuid UUID)`
**Purpose**: Calculate vote counts and percentages for a poll

**Returns**:
- `option_id`: UUID of the option
- `option_text`: Text of the option
- `vote_count`: Number of votes
- `percentage`: Percentage of total votes

### `can_user_vote(poll_uuid UUID, user_uuid UUID)`
**Purpose**: Check if a user can vote on a poll

**Returns**: Boolean indicating if user can vote

## UI Components Created

### 1. Progress Component (`/components/ui/progress.tsx`)
- Visual progress bars for vote percentages
- Smooth animations and transitions
- Accessible design with proper ARIA attributes

### 2. Skeleton Component (`/components/ui/skeleton.tsx`)
- Loading placeholders for poll data
- Maintains layout during data fetching
- Consistent styling with rest of application

### 3. Alert Component (`/components/ui/alert.tsx`)
- Error and success message display
- Multiple variants (default, destructive)
- Proper semantic markup

### 4. Enhanced Badge Component
- Added "destructive" variant for closed/expired polls
- Consistent status indicators

### 5. Enhanced Button Component
- Added "destructive" variant for vote removal
- Loading states and disabled states

## Poll Detail Page Features

### Real-Time Voting Interface
- **Vote Selection**: Click to select/deselect options
- **Visual Indicators**: Check marks for selected options
- **Vote Limits**: Shows remaining votes for multiple choice polls
- **Immediate Feedback**: Results update without page refresh

### Results Display
- **Progress Bars**: Visual representation of vote distribution
- **Vote Counts**: Shows exact numbers and percentages
- **User Votes**: Highlights user's selections
- **Statistics**: Total votes and unique voters count

### Interactive Elements
- **Toggle Views**: Switch between voting and results
- **Vote Management**: Remove individual votes or clear all
- **Refresh Data**: Manual refresh button for latest results
- **Status Indicators**: Shows poll status and expiration

### Error Handling
- **Authentication Errors**: Redirects to login if needed
- **Permission Errors**: Shows appropriate error messages
- **Network Errors**: Graceful fallback with retry options
- **Validation Errors**: Clear feedback on invalid actions

## Security Considerations

### Row Level Security (RLS)
- Polls: Public polls visible to all, private polls only to creators
- Votes: Users can only see/modify their own votes
- Options: Visible based on parent poll permissions

### API Security
- Authentication required for voting endpoints
- User ownership validation for poll modifications
- Rate limiting considerations for vote casting
- Input validation and sanitization

### Data Integrity
- Unique constraints prevent duplicate votes
- Cascading deletes maintain referential integrity
- Transaction-like operations for consistency

## Testing the System

### 1. Create a Test Poll
1. Navigate to `/polls/new`
2. Fill in poll details:
   - Title: "What is your favorite programming language?"
   - Description: "Help us understand community preferences"
   - Vote Type: Single or Multiple
   - Options: JavaScript, Python, Java, TypeScript, Go
3. Set status to "active"
4. Create the poll

### 2. Test Voting Functionality
1. Navigate to the created poll URL (`/polls/[poll-id]`)
2. Verify poll displays correctly with options
3. Click on an option to vote
4. Verify vote is recorded and results update
5. Test vote removal functionality
6. Test switching between voting and results views

### 3. Test Edge Cases
- Try voting when not logged in
- Try voting on expired polls
- Try voting multiple times on single-choice polls
- Test vote limits on multiple-choice polls
- Test with different user accounts

## Performance Considerations

### Client-Side
- Optimistic updates for immediate feedback
- Efficient re-rendering with React state management
- Loading states prevent multiple submissions

### Server-Side
- Database functions for efficient result calculations
- Proper indexing on vote tables
- Cached results where appropriate

### Network
- Minimal API payloads
- Proper HTTP status codes
- Error response standardization

## Future Enhancements

### Real-Time Updates
- WebSocket integration for live vote updates
- Real-time notifications for new votes
- Live results streaming

### Advanced Features
- Vote analytics and insights
- Poll sharing and embedding
- Advanced poll types (ranked choice, etc.)
- Vote scheduling and automated closing

### Performance Optimizations
- Result caching strategies
- Database query optimization
- CDN integration for static assets

## Troubleshooting

### Common Issues
1. **Votes not updating**: Check authentication status
2. **Results not loading**: Verify poll permissions
3. **Cannot vote**: Check poll status and expiration
4. **TypeScript errors**: Ensure all types are properly cast

### Debug Tools
- Browser developer tools for client-side debugging
- Server logs for API endpoint issues
- Database query analysis for performance issues

## Setup Instructions

### Toast Notifications Setup
The voting system uses Sonner for toast notifications. The Toaster component has been added to the root layout:

```tsx
// app/layout.tsx
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
```

### Required Dependencies
The following dependencies were added for the voting system:
- `@radix-ui/react-progress`: Progress bars for vote visualization
- `sonner`: Toast notifications for user feedback

Install with:
```bash
npm install @radix-ui/react-progress sonner --legacy-peer-deps
```

This implementation provides a complete, production-ready voting system with real-time capabilities, comprehensive error handling, and a smooth user experience.