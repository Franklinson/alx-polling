"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPolls } from "@/lib/actions/polls";
import { formatDistanceToNow } from "date-fns";

export default async function PollsIndexPage() {
  let polls: any[] = [];
  let error: string | null = null;

  try {
    polls = await getPolls();
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

  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No polls yet</h3>
        <p className="text-muted-foreground mb-4">
          Be the first to create a poll and start gathering opinions!
        </p>
        <Link href="/polls/new">
          <span className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Create Your First Poll
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Recent Polls</h2>
          <p className="text-sm text-muted-foreground">
            {polls.length} active poll{polls.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {polls.map((poll) => (
          <Link key={poll.id} href={`/polls/${poll.id}`}>
            <Card className="h-full transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-2 leading-tight">{poll.title}</CardTitle>
                  <Badge variant={poll.is_public ? "default" : "secondary"}>
                    {poll.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
                {poll.description && (
                  <CardDescription className="line-clamp-2">{poll.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {poll.poll_options?.length || 0} options
                  </span>
                  <span className="text-muted-foreground">
                    {poll.votes?.[0]?.count || 0} votes
                  </span>
                </div>
                
                {poll.profiles && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>by {poll.profiles.full_name || 'Anonymous'}</span>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}


