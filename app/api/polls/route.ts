import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/utils/profile";

// GET /api/polls - Get all polls
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");
    const offset = (page - 1) * limit;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Build query
    let query = supabase
      .from("polls")
      .select(`
        *,
        profiles!polls_created_by_fkey(id, full_name, email),
        poll_options(id, text, order_index),
        votes(id)
      `, { count: "exact" });

    // Apply filters
    if (userId && user && user.id === userId) {
      // User's own polls
      query = query.eq("created_by", userId);
    } else {
      // Public polls only
      query = query.eq("is_public", true);
      if (!status || status === "active") {
        query = query.eq("status", "active");
      }
    }

    if (status && userId && user && user.id === userId) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    const { data: polls, error, count } = await query;

    if (error) {
      console.error("Error fetching polls:", error);
      return NextResponse.json(
        { error: "Failed to fetch polls" },
        { status: 500 }
      );
    }

    // Process polls data
    const processedPolls = polls?.map(poll => ({
      ...poll,
      poll_options: poll.poll_options?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
      vote_count: poll.votes?.length || 0,
    })) || [];

    return NextResponse.json({
      polls: processedPolls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/polls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/polls - Create a new poll
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

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
      status = "draft",
      vote_type = "single",
      max_votes_per_user = 1,
      is_public = true,
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
    const validOptions = options.filter(opt => opt && opt.trim().length > 0);
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

    // Validate vote settings
    if (vote_type === "multiple" && (!max_votes_per_user || max_votes_per_user < 1)) {
      return NextResponse.json(
        { error: "Max votes per user must be at least 1 for multiple choice polls" },
        { status: 400 }
      );
    }

    if (max_votes_per_user > validOptions.length) {
      return NextResponse.json(
        { error: "Max votes per user cannot exceed number of options" },
        { status: 400 }
      );
    }

    // Validate expiration date
    if (expires_at && new Date(expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "Expiration date must be in the future" },
        { status: 400 }
      );
    }

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        status,
        vote_type,
        max_votes_per_user,
        is_public,
        expires_at: expires_at || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (pollError) {
      console.error("Error creating poll:", pollError);
      return NextResponse.json(
        { error: "Failed to create poll" },
        { status: 500 }
      );
    }

    // Create poll options
    const optionsToInsert = validOptions.map((option, index) => ({
      poll_id: poll.id,
      text: option.trim(),
      order_index: index,
    }));

    const { error: optionsError } = await supabase
      .from("poll_options")
      .insert(optionsToInsert);

    if (optionsError) {
      console.error("Error creating poll options:", optionsError);
      // Try to clean up the poll
      await supabase.from("polls").delete().eq("id", poll.id);
      return NextResponse.json(
        { error: "Failed to create poll options" },
        { status: 500 }
      );
    }

    // Fetch the complete poll data
    const { data: completePoll, error: fetchError } = await supabase
      .from("polls")
      .select(`
        *,
        profiles!polls_created_by_fkey(id, full_name, email),
        poll_options(id, text, order_index)
      `)
      .eq("id", poll.id)
      .single();

    if (fetchError) {
      console.error("Error fetching created poll:", fetchError);
      return NextResponse.json({
        success: true,
        poll: {
          ...poll,
          poll_options: optionsToInsert,
        },
      });
    }

    // Sort options by order_index
    if (completePoll.poll_options) {
      completePoll.poll_options.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return NextResponse.json({
      success: true,
      poll: completePoll,
    }, { status: 201 });

  } catch (error) {
    console.error("Error in POST /api/polls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
