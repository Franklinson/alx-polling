"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CreatePollData } from "@/lib/types/database";

export async function createPoll(data: CreatePollData) {
  const supabase = await createServerSupabase();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("You must be logged in to create a poll");
  }

  // Validate input
  if (!data.title.trim() || data.title.length < 3) {
    throw new Error("Poll title must be at least 3 characters long");
  }

  if (data.title.length > 200) {
    throw new Error("Poll title must be less than 200 characters");
  }

  if (data.description && data.description.length > 1000) {
    throw new Error("Poll description must be less than 1000 characters");
  }

  if (!data.options || data.options.length < 2) {
    throw new Error("Poll must have at least 2 options");
  }

  if (data.options.length > 10) {
    throw new Error("Poll cannot have more than 10 options");
  }

  // Filter out empty options
  const validOptions = data.options
    .map(option => option.trim())
    .filter(option => option.length > 0 && option.length <= 200);

  if (validOptions.length < 2) {
    throw new Error("Poll must have at least 2 valid options");
  }

  try {
    // Start a transaction
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        title: data.title.trim(),
        description: data.description?.trim() || null,
        vote_type: data.vote_type || "single",
        allow_multiple_votes: data.allow_multiple_votes || false,
        max_votes_per_user: data.max_votes_per_user || 1,
        is_public: data.is_public !== false, // Default to true
        expires_at: data.expires_at || null,
        created_by: user.id,
        status: "active"
      })
      .select()
      .single();

    if (pollError) {
      console.error("Error creating poll:", pollError);
      throw new Error("Failed to create poll");
    }

    // Create poll options
    const optionsToInsert = validOptions.map((text, index) => ({
      poll_id: poll.id,
      text,
      order_index: index
    }));

    const { error: optionsError } = await supabase
      .from("poll_options")
      .insert(optionsToInsert);

    if (optionsError) {
      console.error("Error creating poll options:", optionsError);
      // Try to clean up the poll if options creation fails
      await supabase.from("polls").delete().eq("id", poll.id);
      throw new Error("Failed to create poll options");
    }

    revalidatePath("/polls");
    
    // Return the poll ID instead of redirecting
    return { success: true, pollId: poll.id };
  } catch (error) {
    console.error("Error in createPoll:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while creating the poll");
  }
}

export async function getPolls() {
  const supabase = await createServerSupabase();
  
  const { data: polls, error } = await supabase
    .from("polls")
    .select(`
      *,
      profiles!polls_created_by_fkey(full_name),
      poll_options(*),
      votes(count)
    `)
    .eq("status", "active")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    throw new Error("Failed to fetch polls");
  }

  return polls;
}

export async function getUserPolls() {
  const supabase = await createServerSupabase();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("You must be logged in to view your polls");
  }

  const { data: polls, error } = await supabase
    .from("polls")
    .select(`
      *,
      poll_options(*),
      votes(count)
    `)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user polls:", error);
    throw new Error("Failed to fetch your polls");
  }

  return polls;
}
