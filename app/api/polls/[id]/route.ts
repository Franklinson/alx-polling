import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/utils/profile";
import { revalidatePath } from "next/cache";

// GET /api/polls/[id] - Get a specific poll
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const pollId = params.id;

    const { data: poll, error } = await supabase
      .from("polls")
      .select(`
        *,
        profiles!polls_created_by_fkey(id, full_name, email),
        poll_options(*),
        votes(id, option_id, user_id, created_at)
      `)
      .eq("id", pollId)
      .single();

    if (error) {
      console.error("Error fetching poll:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Poll not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch poll" },
        { status: 500 }
      );
    }

    // Check if poll is accessible to current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!poll.is_public && (!user || user.id !== poll.created_by)) {
      return NextResponse.json(
        { error: "Poll not found" },
        { status: 404 }
      );
    }

    // Sort options by order_index
    if (poll.poll_options) {
      poll.poll_options.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return NextResponse.json(poll);
  } catch (error) {
    console.error("Error in GET /api/polls/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/polls/[id] - Update a specific poll
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const pollId = params.id;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Ensure profile exists
    await ensureProfileExists(user);

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      status,
      vote_type,
      max_votes_per_user,
      is_public,
      expires_at,
      options
    } = body;

    // Validate required fields
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Title must be at least 3 characters long" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be less than 200 characters" },
        { status: 400 }
      );
    }

    if (description && description.length > 1000) {
      return NextResponse.json(
        { error: "Description must be less than 1000 characters" },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "At least 2 options are required" },
        { status: 400 }
      );
    }

    // Validate options
    const validOptions = options.filter(opt => opt.text && opt.text.trim().length > 0);
    if (validOptions.length < 2) {
      return NextResponse.json(
        { error: "At least 2 valid options are required" },
        { status: 400 }
      );
    }

    if (validOptions.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 options allowed" },
        { status: 400 }
      );
    }

    // Check if user owns the poll
    const { data: existingPoll, error: pollError } = await supabase
      .from("polls")
      .select("created_by")
      .eq("id", pollId)
      .single();

    if (pollError) {
      if (pollError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Poll not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch poll" },
        { status: 500 }
      );
    }

    if (existingPoll.created_by !== user.id) {
      return NextResponse.json(
        { error: "You can only edit polls you created" },
        { status: 403 }
      );
    }

    // Start transaction-like operations
    // Update poll
    const { data: updatedPoll, error: updateError } = await supabase
      .from("polls")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "active",
        vote_type: vote_type || "single",
        max_votes_per_user: max_votes_per_user || 1,
        is_public: is_public !== false,
        expires_at: expires_at || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pollId)
      .eq("created_by", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating poll:", updateError);
      return NextResponse.json(
        { error: "Failed to update poll" },
        { status: 500 }
      );
    }

    // Delete existing options
    const { error: deleteOptionsError } = await supabase
      .from("poll_options")
      .delete()
      .eq("poll_id", pollId);

    if (deleteOptionsError) {
      console.error("Error deleting existing options:", deleteOptionsError);
      return NextResponse.json(
        { error: "Failed to update poll options" },
        { status: 500 }
      );
    }

    // Insert new options
    const optionsToInsert = validOptions.map((option, index) => ({
      poll_id: pollId,
      text: option.text.trim(),
      order_index: index,
    }));

    const { error: insertOptionsError } = await supabase
      .from("poll_options")
      .insert(optionsToInsert);

    if (insertOptionsError) {
      console.error("Error inserting new options:", insertOptionsError);
      return NextResponse.json(
        { error: "Failed to update poll options" },
        { status: 500 }
      );
    }

    // Revalidate paths
    revalidatePath("/polls");
    revalidatePath(`/polls/${pollId}`);

    return NextResponse.json({
      success: true,
      poll: updatedPoll,
    });

  } catch (error) {
    console.error("Error in PATCH /api/polls/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/polls/[id] - Delete a specific poll
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const pollId = params.id;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if poll exists and user is the owner
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, created_by, title")
      .eq("id", pollId)
      .single();

    if (pollError) {
      if (pollError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Poll not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching poll for deletion:", pollError);
      return NextResponse.json(
        { error: "Failed to fetch poll" },
        { status: 500 }
      );
    }

    if (poll.created_by !== user.id) {
      return NextResponse.json(
        { error: "You can only delete polls you created" },
        { status: 403 }
      );
    }

    // Delete the poll (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("polls")
      .delete()
      .eq("id", pollId)
      .eq("created_by", user.id); // Extra safety check

    if (deleteError) {
      console.error("Error deleting poll:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete poll" },
        { status: 500 }
      );
    }

    // Revalidate paths
    revalidatePath("/polls");

    return NextResponse.json({
      success: true,
      message: "Poll deleted successfully",
    });

  } catch (error) {
    console.error("Error in DELETE /api/polls/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
