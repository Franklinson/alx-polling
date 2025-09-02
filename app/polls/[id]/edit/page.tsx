"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

interface Poll {
  id: string;
  title: string;
  description: string | null;
  status: string;
  vote_type: string;
  allow_multiple_votes: boolean;
  max_votes_per_user: number;
  is_public: boolean;
  expires_at: string | null;
  created_by: string;
  poll_options: Array<{
    id: string;
    text: string;
    order_index: number;
  }>;
}

export default function EditPollPage() {
  const router = useRouter();
  const params = useParams();
  const pollId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [voteType, setVoteType] = useState("single");
  const [maxVotesPerUser, setMaxVotesPerUser] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [options, setOptions] = useState<Array<{ id?: string; text: string; order_index: number }>>([]);

  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  const fetchPoll = async () => {
    try {
      const response = await fetch(`/api/polls/${pollId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch poll");
      }

      const pollData = await response.json();

      // Check if user is the owner
      const userResponse = await fetch("/api/auth/user");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.user?.id !== pollData.created_by) {
          throw new Error("You can only edit polls that you created");
        }
      }

      setPoll(pollData);

      // Set form data
      setTitle(pollData.title);
      setDescription(pollData.description || "");
      setStatus(pollData.status);
      setVoteType(pollData.vote_type);
      setMaxVotesPerUser(pollData.max_votes_per_user);
      setIsPublic(pollData.is_public);
      setExpiresAt(pollData.expires_at ? new Date(pollData.expires_at).toISOString().slice(0, 16) : "");

      // Set options
      const sortedOptions = pollData.poll_options.sort((a: any, b: any) => a.order_index - b.order_index);
      setOptions(sortedOptions.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        order_index: opt.order_index,
      })));

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load poll");
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setOptions([...options, { text: "", order_index: options.length }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text };
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description || null,
          status,
          vote_type: voteType,
          max_votes_per_user: maxVotesPerUser,
          is_public: isPublic,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          options: options.map((opt, index) => ({
            ...opt,
            order_index: index,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update poll");
      }

      setSuccess("Poll updated successfully!");
      setTimeout(() => {
        router.push("/polls");
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update poll");
    } finally {
      setSaving(false);
    }
  };

  const validOptions = options.filter(opt => opt.text.trim() !== "");
  const canSave = title.trim().length >= 3 && validOptions.length >= 2 && !saving;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent mb-4" />
          <p>Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Poll</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/polls">
            <Button>Back to Polls</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/polls">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Polls
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Poll</CardTitle>
          <CardDescription>
            Make changes to your poll. Be careful when editing active polls as it may affect ongoing votes.
          </CardDescription>
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
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vote Type</Label>
                  <Select value={voteType} onValueChange={setVoteType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Choice</SelectItem>
                      <SelectItem value="multiple">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
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

                {voteType === "multiple" && (
                  <div className="space-y-2">
                    <Label htmlFor="maxVotes">Max votes per user</Label>
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

              <div className="space-y-2">
                <Label htmlFor="expires">Expiration Date (Optional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
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
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      required={index < 2}
                      maxLength={200}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {validOptions.length}/10 options (minimum 2 required)
              </p>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={!canSave || !!success}
                className="flex-1"
              >
                {saving
                  ? "Saving Changes..."
                  : success
                    ? "Poll Updated!"
                    : "Save Changes"}
              </Button>
              <Link href="/polls">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            <span>Poll status will be updated when you save</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
