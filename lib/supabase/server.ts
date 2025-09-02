import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // This is handled by the response in middleware
        },
        remove(name: string, options: any) {
          // This is handled by the response in middleware
        },
      },
    }
  );
}


