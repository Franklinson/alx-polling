"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DebugAuthPage() {
  const { user, session, loading, signOut, refreshSession } = useAuth();
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [cookies, setCookies] = useState<string[]>([]);
  const [authState, setAuthState] = useState<string>("checking");
  const supabase = createClient();

  useEffect(() => {
    // Get session directly from Supabase
    const getSupabaseSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting Supabase session:", error);
        }
        setSupabaseSession(data.session);
      } catch (error) {
        console.error("Error getting Supabase session:", error);
      }
    };

    getSupabaseSession();

    // Get all cookies
    const allCookies = document.cookie.split(";").map((c) => c.trim());
    setCookies(allCookies.filter((c) => c.includes("sb-")));

    // Determine auth state
    if (loading) {
      setAuthState("loading");
    } else if (user) {
      setAuthState("authenticated");
    } else {
      setAuthState("unauthenticated");
    }

    // Get profile information when user changes
    if (user && !loading) {
      fetchProfile();
    }
  }, [user, loading, supabase.auth]);

  const fetchProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const response = await fetch("/api/profile/ensure");
      const result = await response.json();
      setProfile(result);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile({ error: "Failed to fetch profile" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEnsureProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await fetch("/api/profile/ensure", { method: "POST" });
      const result = await response.json();
      setProfile(result);
      alert(`Profile operation result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error("Profile ensure error:", error);
      alert(`Profile ensure error: ${error}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRefreshSession = async () => {
    await refreshSession();
    // Refresh the debug info
    const { data } = await supabase.auth.getSession();
    setSupabaseSession(data.session);
  };

  const handleTestApiCall = async () => {
    try {
      const response = await fetch("/api/test-auth");
      const result = await response.json();
      console.log("API Test Result:", result);
      alert(`API Test: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error("API Test Error:", error);
      alert(`API Test Error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Authentication Debug Page</h1>
        <p className="text-muted-foreground">
          This page helps debug authentication issues
        </p>
      </div>

      {/* Auth State Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Auth State Overview
            <Badge
              variant={authState === "authenticated" ? "default" : "secondary"}
            >
              {authState}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium">Context Loading</h4>
              <p className="text-sm text-muted-foreground">
                {loading ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <h4 className="font-medium">User Present</h4>
              <p className="text-sm text-muted-foreground">
                {user ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <h4 className="font-medium">Session Present</h4>
              <p className="text-sm text-muted-foreground">
                {session ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>User Information (from Context)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>ID:</strong> {user.id}
              </div>
              <div>
                <strong>Email:</strong> {user.email}
              </div>
              <div>
                <strong>Email Confirmed:</strong>{" "}
                {user.email_confirmed_at ? "Yes" : "No"}
              </div>
              <div>
                <strong>Created:</strong>{" "}
                {new Date(user.created_at).toLocaleString()}
              </div>
              <div>
                <strong>Last Sign In:</strong>{" "}
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString()
                  : "Never"}
              </div>
              {user.user_metadata?.full_name && (
                <div>
                  <strong>Full Name:</strong> {user.user_metadata.full_name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Profile Information
            {profileLoading && (
              <div className="inline-block w-4 h-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            )}
          </CardTitle>
          <CardDescription>Profile data from the database</CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            profile.error ? (
              <p className="text-red-600">{profile.error}</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <strong>Profile Exists:</strong>{" "}
                  {profile.profileExists ? "Yes" : "No"}
                </div>
                {profile.profile && (
                  <>
                    <div>
                      <strong>Full Name:</strong> {profile.profile.full_name}
                    </div>
                    <div>
                      <strong>Email:</strong> {profile.profile.email}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {new Date(profile.profile.created_at).toLocaleString()}
                    </div>
                    <div>
                      <strong>Updated:</strong>{" "}
                      {new Date(profile.profile.updated_at).toLocaleString()}
                    </div>
                  </>
                )}
                {profile.profileCreated !== undefined && (
                  <div>
                    <strong>Just Created:</strong>{" "}
                    {profile.profileCreated ? "Yes" : "No"}
                  </div>
                )}
                {profile.message && (
                  <div className="text-sm text-muted-foreground">
                    {profile.message}
                  </div>
                )}
              </div>
            )
          ) : user ? (
            <p className="text-muted-foreground">
              Click "Check Profile" to load profile information
            </p>
          ) : (
            <p className="text-muted-foreground">
              Login to view profile information
            </p>
          )}
        </CardContent>
      </Card>

      {/* Session Information */}
      {session && (
        <Card>
          <CardHeader>
            <CardTitle>Session Information (from Context)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Access Token:</strong>{" "}
                {session.access_token.substring(0, 50)}...
              </div>
              <div>
                <strong>Token Type:</strong> {session.token_type}
              </div>
              <div>
                <strong>Expires At:</strong>{" "}
                {new Date(session.expires_at! * 1000).toLocaleString()}
              </div>
              <div>
                <strong>Refresh Token:</strong>{" "}
                {session.refresh_token ? "Present" : "Missing"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Direct Supabase Session */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Supabase Session</CardTitle>
          <CardDescription>
            Session retrieved directly from Supabase client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supabaseSession ? (
            <div className="space-y-2">
              <div>
                <strong>User ID:</strong> {supabaseSession.user?.id}
              </div>
              <div>
                <strong>User Email:</strong> {supabaseSession.user?.email}
              </div>
              <div>
                <strong>Expires At:</strong>{" "}
                {new Date(supabaseSession.expires_at * 1000).toLocaleString()}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No direct session found</p>
          )}
        </CardContent>
      </Card>

      {/* Cookies */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Cookies</CardTitle>
          <CardDescription>
            Supabase authentication cookies present in browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cookies.length > 0 ? (
            <div className="space-y-2">
              {cookies.map((cookie, index) => (
                <div
                  key={index}
                  className="text-sm font-mono bg-muted p-2 rounded"
                >
                  {cookie}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No Supabase cookies found</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRefreshSession}>Refresh Session</Button>
            <Button onClick={handleTestApiCall} variant="outline">
              Test API Auth
            </Button>
            {user && (
              <>
                <Button
                  onClick={fetchProfile}
                  variant="outline"
                  disabled={profileLoading}
                >
                  Check Profile
                </Button>
                <Button
                  onClick={handleEnsureProfile}
                  variant="outline"
                  disabled={profileLoading}
                >
                  Ensure Profile
                </Button>
                <Button onClick={signOut} variant="destructive">
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Environment Check */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>Supabase URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "Missing"}
            </div>
            <div>
              <strong>Supabase Anon Key:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "Configured"
                : "Missing"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
