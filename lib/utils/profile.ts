import { createServerSupabase } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

export async function ensureProfileExists(user: User) {
  const supabase = await createServerSupabase();

  try {
    // First, check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected if profile doesn't exist
      console.error("Error checking for existing profile:", checkError);
      throw new Error("Failed to check profile existence");
    }

    // If profile exists, return success
    if (existingProfile) {
      return { success: true, created: false };
    }

    // Profile doesn't exist, create it
    const profileData = {
      id: user.id,
      email: user.email || "",
      full_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Anonymous User",
      avatar_url: user.user_metadata?.avatar_url || null,
    };

    const { error: insertError } = await supabase
      .from("profiles")
      .insert(profileData);

    if (insertError) {
      console.error("Error creating profile:", insertError);
      throw new Error("Failed to create user profile");
    }

    console.log(`Created profile for user ${user.id}`);
    return { success: true, created: true };

  } catch (error) {
    console.error("Error in ensureProfileExists:", error);
    throw error;
  }
}

export async function getOrCreateProfile(userId: string) {
  const supabase = await createServerSupabase();

  try {
    // Try to get the profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
      throw new Error("Failed to fetch user profile");
    }

    if (profile) {
      return profile;
    }

    // Profile doesn't exist, get user info and create profile
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    await ensureProfileExists(user);

    // Fetch the newly created profile
    const { data: newProfile, error: newProfileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (newProfileError) {
      console.error("Error fetching newly created profile:", newProfileError);
      throw new Error("Failed to fetch created profile");
    }

    return newProfile;
  } catch (error) {
    console.error("Error in getOrCreateProfile:", error);
    throw error;
  }
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  avatar_url?: string;
}) {
  const supabase = await createServerSupabase();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      throw new Error("Failed to update profile");
    }

    return data;
  } catch (error) {
    console.error("Error in updateProfile:", error);
    throw error;
  }
}
