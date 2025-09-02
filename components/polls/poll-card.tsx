"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Edit, Trash2, Eye, Share2 } from "lucide-react";
import { deletePoll } from "@/lib/actions/polls";

interface PollCardProps {
  poll: any;
  isOwner: boolean;
  showActions?: boolean;
}

export default function PollCard({
  poll,
  isOwner,
  showActions = false,
}: PollCardProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePoll(poll.id);
      setDeleteDialogOpen(false);
      router.refresh(); // Refresh the page to show updated polls list
    } catch (error) {
      console.error("Error deleting poll:", error);
      alert("Failed to delete poll. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/polls/${poll.id}/edit`);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/polls/${poll.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Poll link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link. Please try again.");
    }
  };

  const totalVotes = Array.isArray(poll.votes) ? poll.votes.length : 0;
  const optionsCount = poll.poll_options?.length || 0;

  return (
    <>
      <Card className="h-full transition-all hover:shadow-md hover:scale-[1.02] group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <Link href={`/polls/${poll.id}`} className="flex-1 min-w-0">
              <CardTitle className="line-clamp-2 leading-tight hover:text-primary transition-colors">
                {poll.title}
              </CardTitle>
            </Link>

            <div className="flex items-center gap-2 ml-2">
              <Badge variant={poll.is_public ? "default" : "secondary"}>
                {poll.is_public ? "Public" : "Private"}
              </Badge>

              {poll.status && (
                <Badge
                  variant={
                    poll.status === "active"
                      ? "default"
                      : poll.status === "closed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {poll.status}
                </Badge>
              )}

              {isOwner && showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/polls/${poll.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {poll.description && (
            <Link href={`/polls/${poll.id}`}>
              <CardDescription className="line-clamp-2 hover:text-foreground/80 transition-colors">
                {poll.description}
              </CardDescription>
            </Link>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          <Link href={`/polls/${poll.id}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {optionsCount} option{optionsCount !== 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground">
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
              </span>
            </div>

            {poll.profiles && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>by {poll.profiles.full_name || "Anonymous"}</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(poll.created_at), {
                addSuffix: true,
              })}
              {poll.expires_at && (
                <>
                  {" • "}
                  <span
                    className={
                      new Date(poll.expires_at) < new Date()
                        ? "text-red-600"
                        : "text-amber-600"
                    }
                  >
                    {new Date(poll.expires_at) < new Date()
                      ? "Expired"
                      : `Expires ${formatDistanceToNow(
                          new Date(poll.expires_at),
                          {
                            addSuffix: true,
                          },
                        )}`}
                  </span>
                </>
              )}
            </div>
          </Link>

          {/* Owner-specific info */}
          {isOwner && showActions && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/polls/${poll.id}`)}
                className="flex-1"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Results
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="px-3"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Poll</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{poll.title}"? This action cannot
              be undone. All votes and data associated with this poll will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
