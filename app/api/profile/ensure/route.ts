import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/utils/profile";

export async function POST() {
  try {
    const supabase = await createServerSupabase();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Ensure profile exists
    const result = await ensureProfileExists(user);

    return NextResponse.json({
      success: true,
      userId: user.id,
      profileCreated: result.created,
      message: result.created
        ? "Profile created successfully"
        : "Profile already exists",
    });
  } catch (error) {
    console.error("Error in profile ensure endpoint:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      profileExists: !!profile,
      profile: profile || null,
    });
  } catch (error) {
    console.error("Error in profile check endpoint:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
