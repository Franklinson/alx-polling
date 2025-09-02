import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPolls, getUserPolls } from "@/lib/actions/polls";
import { formatDistanceToNow } from "date-fns";
import { createServerSupabase } from "@/lib/supabase/server";
import PollCard from "@/components/polls/poll-card";
import { Separator } from "@/components/ui/separator";

export default async function PollsIndexPage() {
  let publicPolls: any[] = [];
  let userPolls: any[] = [];
  let error: string | null = null;
  let user: any = null;

  try {
    // Get current user
    const supabase = await createServerSupabase();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;

    // Fetch public polls
    publicPolls = await getPolls();

    // Fetch user's polls if authenticated
    if (user) {
      try {
        userPolls = await getUserPolls();
      } catch (userPollsError) {
        console.warn("Could not fetch user polls:", userPollsError);
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load polls";
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Create Poll Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Polls</h1>
          <p className="text-muted-foreground">
            Discover and participate in community polls
          </p>
        </div>
        {user && (
          <Link href="/polls/new">
            <Button>Create New Poll</Button>
          </Link>
        )}
      </div>

      {/* User's Polls Section */}
      {user && userPolls.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">My Polls</h2>
            <p className="text-sm text-muted-foreground">
              {userPolls.length} poll{userPolls.length !== 1 ? "s" : ""} created
              by you
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                isOwner={true}
                showActions={true}
              />
            ))}
          </div>

          <Separator />
        </div>
      )}

      {/* Public Polls Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              {user && userPolls.length > 0 ? "Public Polls" : "Recent Polls"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {publicPolls.length} active poll
              {publicPolls.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {publicPolls.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No polls yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create a poll and start gathering opinions!
            </p>
            {user ? (
              <Link href="/polls/new">
                <Button>Create Your First Poll</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>Sign In to Create Polls</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                isOwner={user?.id === poll.created_by}
                showActions={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Empty State for No User Polls */}
      {user && userPolls.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No polls created yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Create your first poll to start gathering opinions and insights
              from the community.
            </p>
            <Link href="/polls/new">
              <Button>Create Your First Poll</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Not Authenticated State */}
      {!user && (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <h3 className="text-lg font-semibold mb-2">Join the Community</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Sign in to create your own polls and participate in voting.
            </p>
            <div className="flex gap-2">
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline">Create Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
