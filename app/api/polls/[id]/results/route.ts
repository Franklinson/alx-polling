import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/polls/[id]/results - Get poll results
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabase();
    const pollId = params.id;

    // Get current user (optional for public polls)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get poll details first to check permissions
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .single();

    if (pollError) {
      if (pollError.code === "PGRST116") {
        return NextResponse.json({ error: "Poll not found" }, { status: 404 });
      }
      console.error("Error fetching poll:", pollError);
      return NextResponse.json(
        { error: "Failed to fetch poll" },
        { status: 500 },
      );
    }

    // Check if poll is accessible to current user
    if (!poll.is_public && (!user || user.id !== poll.created_by)) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Get poll results using the database function
    const { data: results, error: resultsError } = (await (supabase as any).rpc(
      "get_poll_results",
      { poll_uuid: pollId },
    )) as {
      data: any;
      error: any;
    };

    if (resultsError) {
      console.error("Error fetching poll results:", resultsError);
      return NextResponse.json(
        { error: "Failed to fetch poll results" },
        { status: 500 },
      );
    }

    // Get total vote count
    const { data: totalVotes, error: totalVotesError } = await supabase
      .from("votes")
      .select("id", { count: "exact" })
      .eq("poll_id", pollId);

    if (totalVotesError) {
      console.error("Error fetching total votes:", totalVotesError);
      return NextResponse.json(
        { error: "Failed to fetch vote count" },
        { status: 500 },
      );
    }

    // Get user's votes if authenticated
    let userVotes = [];
    if (user) {
      const { data: votes, error: votesError } = await supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", pollId)
        .eq("user_id", user.id);

      if (votesError) {
        console.error("Error fetching user votes:", votesError);
      } else {
        userVotes = votes.map((vote) => vote.option_id);
      }
    }

    // Get unique voters count
    const { data: uniqueVoters, error: uniqueVotersError } = await supabase
      .from("votes")
      .select("user_id", { count: "exact" })
      .eq("poll_id", pollId);

    let uniqueVotersCount = 0;
    if (!uniqueVotersError && uniqueVoters) {
      // Count unique user_ids
      const { data: uniqueVotersData } = await supabase
        .from("votes")
        .select("user_id")
        .eq("poll_id", pollId);

      if (uniqueVotersData) {
        const uniqueUserIds = new Set(uniqueVotersData.map((v) => v.user_id));
        uniqueVotersCount = uniqueUserIds.size;
      }
    }

    return NextResponse.json({
      results: results || [],
      totalVotes: totalVotes?.length || 0,
      uniqueVoters: uniqueVotersCount,
      userVotes: userVotes,
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        status: poll.status,
        vote_type: poll.vote_type,
        max_votes_per_user: poll.max_votes_per_user,
        is_public: poll.is_public,
        expires_at: poll.expires_at,
        created_at: poll.created_at,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/polls/[id]/results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
