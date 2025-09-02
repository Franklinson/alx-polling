import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/utils/profile";

// POST /api/polls/[id]/vote - Cast a vote
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabase();
    const pollId = params.id;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Ensure profile exists
    await ensureProfileExists(user);

    // Parse request body
    const body = await request.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json(
        { error: "Option ID is required" },
        { status: 400 },
      );
    }

    // Get poll details to validate voting rules
    const { data: poll, error: pollError } = (await supabase
      .from("polls")
      .select(
        `
        *,
        poll_options!inner(id)
      `,
      )
      .eq("id", pollId)
      .eq("poll_options.id", optionId)
      .single()) as { data: any; error: any };

    if (pollError) {
      if (pollError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Poll or option not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching poll:", pollError);
      return NextResponse.json(
        { error: "Failed to fetch poll" },
        { status: 500 },
      );
    }

    // Check if poll is active
    if (poll.status !== "active") {
      return NextResponse.json(
        { error: "Poll is not active" },
        { status: 400 },
      );
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return NextResponse.json({ error: "Poll has expired" }, { status: 400 });
    }

    // Check if poll is accessible to current user
    if (!poll.is_public && user.id !== poll.created_by) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Check current vote count for user
    const { data: existingVotes, error: votesError } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id);

    if (votesError) {
      console.error("Error fetching existing votes:", votesError);
      return NextResponse.json(
        { error: "Failed to check existing votes" },
        { status: 500 },
      );
    }

    // Check if user has reached vote limit
    if (existingVotes.length >= poll.max_votes_per_user) {
      return NextResponse.json(
        {
          error: `You can only vote ${poll.max_votes_per_user} time${poll.max_votes_per_user > 1 ? "s" : ""} on this poll`,
        },
        { status: 400 },
      );
    }

    // For single vote polls, check if user already voted for this option
    if (poll.vote_type === "single" && existingVotes.length > 0) {
      const { data: existingVote } = await supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", pollId)
        .eq("user_id", user.id)
        .eq("option_id", optionId)
        .single();

      if (existingVote) {
        return NextResponse.json(
          { error: "You have already voted for this option" },
          { status: 400 },
        );
      }

      // For single vote polls, if user tries to vote for a different option, remove previous vote
      const { error: deleteError } = await supabase
        .from("votes")
        .delete()
        .eq("poll_id", pollId)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error removing previous vote:", deleteError);
        return NextResponse.json(
          { error: "Failed to update vote" },
          { status: 500 },
        );
      }
    } else if (poll.vote_type === "multiple") {
      // For multiple vote polls, check if user already voted for this specific option
      const { data: existingOptionVote } = await supabase
        .from("votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("user_id", user.id)
        .eq("option_id", optionId)
        .single();

      if (existingOptionVote) {
        return NextResponse.json(
          { error: "You have already voted for this option" },
          { status: 400 },
        );
      }
    }

    // Cast the vote
    const { data: newVote, error: voteError } = (await supabase
      .from("votes")
      .insert([
        {
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id,
        },
      ])
      .select()
      .single()) as { data: any; error: any };

    if (voteError) {
      console.error("Error casting vote:", voteError);
      return NextResponse.json(
        { error: "Failed to cast vote" },
        { status: 500 },
      );
    }

    // Get updated vote counts for the poll
    const { data: voteResults, error: resultsError } = (await (
      supabase as any
    ).rpc("get_poll_results", { poll_uuid: pollId })) as {
      data: any;
      error: any;
    };

    if (resultsError) {
      console.error("Error fetching results:", resultsError);
      // Don't fail the request, just return success without results
      return NextResponse.json({
        success: true,
        vote: newVote,
        message: "Vote cast successfully",
      });
    }

    return NextResponse.json({
      success: true,
      vote: newVote,
      results: voteResults,
      message: "Vote cast successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/polls/[id]/vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/polls/[id]/vote - Remove a vote
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabase();
    const pollId = params.id;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse request body for specific option (optional)
    const body = await request.json().catch(() => ({}));
    const { optionId } = body;

    // Build delete query
    let deleteQuery = supabase
      .from("votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("user_id", user.id);

    // If optionId is provided, delete only that specific vote
    if (optionId) {
      deleteQuery = deleteQuery.eq("option_id", optionId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error("Error removing vote:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove vote" },
        { status: 500 },
      );
    }

    // Get updated vote counts for the poll
    const { data: voteResults, error: resultsError } = (await (
      supabase as any
    ).rpc("get_poll_results", { poll_uuid: pollId })) as {
      data: any;
      error: any;
    };

    if (resultsError) {
      console.error("Error fetching results:", resultsError);
      return NextResponse.json({
        success: true,
        message: "Vote removed successfully",
      });
    }

    return NextResponse.json({
      success: true,
      results: voteResults,
      message: "Vote removed successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/polls/[id]/vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
