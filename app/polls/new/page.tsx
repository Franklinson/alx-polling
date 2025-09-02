"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPoll } from "@/lib/actions/polls";
import { VoteType } from "@/lib/types/database";

export default function NewPollPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voteType, setVoteType] = useState<VoteType>("single");
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [maxVotesPerUser, setMaxVotesPerUser] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [options, setOptions] = useState(["", ""]);

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Submitting poll data:", {
        title,
        description: description || undefined,
        vote_type: voteType,
        allow_multiple_votes: allowMultipleVotes,
        max_votes_per_user: maxVotesPerUser,
        is_public: isPublic,
        options: options.filter(opt => opt.trim() !== "")
      });

      const result = await createPoll({
        title,
        description: description || undefined,
        vote_type: voteType,
        allow_multiple_votes: allowMultipleVotes,
        max_votes_per_user: maxVotesPerUser,
        is_public: isPublic,
        options: options.filter(opt => opt.trim() !== "")
      });

      if (result.success && result.pollId) {
        console.log("Poll created successfully, redirecting to:", result.pollId);
        router.push(`/polls/${result.pollId}`);
      } else {
        throw new Error("Failed to create poll - no poll ID returned");
      }
    } catch (err) {
      console.error("Error creating poll:", err);
      setError(err instanceof Error ? err.message : "Failed to create poll");
      setLoading(false);
    }
  };

  const validOptions = options.filter(opt => opt.trim() !== "");
  const canSubmit = title.trim().length >= 3 && validOptions.length >= 2 && !loading;

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Poll</CardTitle>
          <CardDescription>Create a new poll with multiple options for others to vote on.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Poll Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Poll Title *</Label>
                <Input
                  id="title"
                  placeholder="What should we vote on?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add more context about your poll..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/1000 characters
                </p>
              </div>
            </div>

            {/* Poll Settings */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vote Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={voteType === "single" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVoteType("single")}
                    >
                      Single Choice
                    </Button>
                    <Button
                      type="button"
                      variant={voteType === "multiple" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVoteType("multiple")}
                    >
                      Multiple Choice
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Privacy</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isPublic ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsPublic(true)}
                    >
                      Public
                    </Button>
                    <Button
                      type="button"
                      variant={!isPublic ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsPublic(false)}
                    >
                      Private
                    </Button>
                  </div>
                </div>
              </div>

              {voteType === "multiple" && (
                <div className="space-y-2">
                  <Label htmlFor="maxVotes">Maximum votes per user</Label>
                  <Input
                    id="maxVotes"
                    type="number"
                    min={1}
                    max={validOptions.length}
                    value={maxVotesPerUser}
                    onChange={(e) => setMaxVotesPerUser(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
            </div>

            {/* Poll Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Poll Options *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={options.length >= 10}
                >
                  Add Option
                </Button>
              </div>

              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      required={index < 2}
                      maxLength={200}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="px-3"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {validOptions.length}/10 options (minimum 2 required)
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit}
            >
              {loading ? "Creating Poll..." : "Create Poll"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Draft</Badge>
            <span>Your poll will be saved as a draft first</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}


