"use client";

import { createClient } from "@/lib/supabase/client";

export async function signOutClient() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/";
}


