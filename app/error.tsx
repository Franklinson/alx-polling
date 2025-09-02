"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  const isSupabaseConfigError =
    error.message.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    error.message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const isAuthError =
    error.message.includes("logged in") ||
    error.message.includes("authentication");

  const isDatabaseError =
    error.message.includes("Failed to fetch") ||
    error.message.includes("database");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Something went wrong!</CardTitle>
          <CardDescription>
            {isSupabaseConfigError && (
              "Database configuration is missing. Please check your environment variables."
            )}
            {isAuthError && (
              "Authentication error. Please try logging in again."
            )}
            {isDatabaseError && (
              "Unable to connect to the database. Please try again later."
            )}
            {!isSupabaseConfigError && !isAuthError && !isDatabaseError && (
              "An unexpected error occurred. Please try again."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSupabaseConfigError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800 font-medium">Configuration Help:</p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>1. Copy <code>.env.example</code> to <code>.env.local</code></li>
                <li>2. Add your Supabase project URL and anon key</li>
                <li>3. Restart the development server</li>
              </ul>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded border text-gray-700 font-mono text-xs break-all">
              {error.message}
              {error.digest && (
                <div className="mt-2 text-gray-500">
                  Error ID: {error.digest}
                </div>
              )}
            </div>
          </details>

          <div className="flex gap-2">
            <Button
              onClick={reset}
              className="flex-1"
              variant="outline"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
