import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Get the authenticated user from the session (server-side cookies)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS and fetch the profile
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role) {
      return NextResponse.json({ role: profile.role });
    }

    // Profile missing or role is null — upsert to ensure the row exists with a valid role.
    // Using upsert so this is safe to call even if the row already exists.
    const { error: upsertError } = await admin
      .from("user_profiles")
      .upsert({ id: user.id, role: "owner" }, { onConflict: "id", ignoreDuplicates: false });

    if (upsertError) {
      console.error("profile-role: failed to upsert profile", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ role: "owner" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
