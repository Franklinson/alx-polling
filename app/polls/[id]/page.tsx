"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Circle,
  Users,
  Clock,
  BarChart3,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface PollOption {
  id: string;
  text: string;
  order_index: number;
}

interface Vote {
  id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  status: "draft" | "active" | "closed" | "archived";
  vote_type: "single" | "multiple";
  max_votes_per_user: number;
  is_public: boolean;
  expires_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  poll_options: PollOption[];
  votes: Vote[];
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface VoteResult {
  option_id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
}

interface PollResults {
  results: VoteResult[];
  totalVotes: number;
  uniqueVoters: number;
  userVotes: string[];
  poll: Poll;
}

export default function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [uniqueVoters, setUniqueVoters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollId, setPollId] = useState<string | null>(null);
  const router = useRouter();

  // Unwrap params
  useEffect(() => {
    params.then(({ id }) => setPollId(id));
  }, [params]);

  const fetchPoll = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/polls/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Poll not found");
          return;
        }
        throw new Error("Failed to fetch poll");
      }

      const pollData: Poll = await response.json();
      setPoll(pollData);

      // User votes will be fetched from the results API
      // which properly handles authentication and user context
    } catch (err) {
      console.error("Error fetching poll:", err);
      setError("Failed to load poll");
    }
  }, []);

  const fetchResults = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/polls/${id}/results`);

      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }

      const data: PollResults = await response.json();
      setResults(data.results);
      setTotalVotes(data.totalVotes);
      setUniqueVoters(data.uniqueVoters);
      setUserVotes(data.userVotes);
    } catch (err) {
      console.error("Error fetching results:", err);
      toast.error("Failed to load results");
    }
  }, []);

  useEffect(() => {
    if (!pollId) return;

    const loadPoll = async () => {
      setLoading(true);
      await fetchPoll(pollId);
      await fetchResults(pollId);
      setLoading(false);
    };

    loadPoll();
  }, [pollId, fetchPoll, fetchResults]);

  const handleVote = async (optionId: string) => {
    if (!pollId || !poll) return;

    setVoting(true);
    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to vote");
      }

      toast.success(data.message || "Vote cast successfully!");

      // Update results immediately
      await fetchResults(pollId);

      // For single vote polls, show results after voting
      if (poll.vote_type === "single") {
        setShowResults(true);
      }
    } catch (err: any) {
      console.error("Error voting:", err);
      toast.error(err.message || "Failed to cast vote");
    } finally {
      setVoting(false);
    }
  };

  const handleRemoveVote = async (optionId?: string) => {
    if (!pollId) return;

    setVoting(true);
    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove vote");
      }

      toast.success(data.message || "Vote removed successfully!");

      // Update results immediately
      await fetchResults(pollId);
    } catch (err: any) {
      console.error("Error removing vote:", err);
      toast.error(err.message || "Failed to remove vote");
    } finally {
      setVoting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      draft: "secondary",
      closed: "destructive",
      archived: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const isExpired = poll?.expires_at
    ? new Date(poll.expires_at) < new Date()
    : false;
  const canVote = poll?.status === "active" && !isExpired;
  const hasVoted = userVotes.length > 0;
  const canVoteMore = poll ? userVotes.length < poll.max_votes_per_user : false;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-1/4" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Alert>
          <AlertDescription>Poll not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{poll.title}</CardTitle>
            {getStatusBadge(poll.status)}
          </div>
          {poll.description && (
            <CardDescription className="text-base mt-2">
              {poll.description}
            </CardDescription>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {uniqueVoters} voter{uniqueVoters !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </div>
            {poll.expires_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Expires {new Date(poll.expires_at).toLocaleDateString()}
              </div>
            )}
          </div>

          {poll.vote_type === "multiple" && (
            <Alert>
              <AlertDescription>
                You can vote for up to {poll.max_votes_per_user} option
                {poll.max_votes_per_user !== 1 ? "s" : ""}.
                {hasVoted &&
                  ` You have voted for ${userVotes.length} option${userVotes.length !== 1 ? "s" : ""}.`}
              </AlertDescription>
            </Alert>
          )}

          {isExpired && (
            <Alert variant="destructive">
              <AlertDescription>This poll has expired.</AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {!showResults && canVote ? (
            // Voting interface
            <div className="space-y-3">
              {poll.poll_options
                .sort((a, b) => a.order_index - b.order_index)
                .map((option) => {
                  const isSelected = userVotes.includes(option.id);
                  const canSelectThis = canVoteMore || isSelected;

                  return (
                    <div
                      key={option.id}
                      className="flex items-center space-x-3"
                    >
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        className="flex-1 justify-start h-auto py-3 px-4"
                        onClick={() =>
                          isSelected
                            ? handleRemoveVote(option.id)
                            : handleVote(option.id)
                        }
                        disabled={voting || !canSelectThis}
                      >
                        <div className="flex items-center space-x-2 w-full">
                          {voting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : isSelected ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                          <span className="text-left flex-1">
                            {option.text}
                          </span>
                        </div>
                      </Button>
                    </div>
                  );
                })}
            </div>
          ) : (
            // Results interface
            <div className="space-y-3">
              {results.map((result) => {
                const isUserVote = userVotes.includes(result.option_id);

                return (
                  <div key={result.option_id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-medium ${isUserVote ? "text-primary" : ""}`}
                        >
                          {result.option_text}
                        </span>
                        {isUserVote && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.vote_count} vote
                        {result.vote_count !== 1 ? "s" : ""} (
                        {result.percentage}%)
                      </div>
                    </div>
                    <Progress value={result.percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          {canVote && !showResults && (
            <Button
              variant="outline"
              onClick={() => setShowResults(true)}
              disabled={voting}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Results
            </Button>
          )}

          {showResults && canVote && (
            <Button
              variant="outline"
              onClick={() => setShowResults(false)}
              disabled={voting}
            >
              Back to Voting
            </Button>
          )}

          {hasVoted && canVote && (
            <Button
              variant="destructive"
              onClick={() => handleRemoveVote()}
              disabled={voting}
            >
              {voting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clear All Votes
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => fetchResults(pollId!)}
            disabled={voting}
          >
            {voting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
