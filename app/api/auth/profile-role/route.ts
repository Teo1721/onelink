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

    // Always check if this user is linked to an employee record —
    // a DB trigger may have incorrectly set role to "owner" for invited employees
    const { data: empRecord } = await admin
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (empRecord && (!profile?.role || profile.role === "owner")) {
      // User is in employees table — treat as employee regardless of what profile says
      await admin
        .from("user_profiles")
        .upsert({ id: user.id, role: "employee" }, { onConflict: "id", ignoreDuplicates: false });
      return NextResponse.json({ role: "employee" });
    }

    if (profile?.role) {
      return NextResponse.json({ role: profile.role });
    }

    const defaultRole = "owner";

    // Upsert profile with the correct role
    const { error: upsertError } = await admin
      .from("user_profiles")
      .upsert({ id: user.id, role: defaultRole }, { onConflict: "id", ignoreDuplicates: false });

    if (upsertError) {
      console.error("profile-role: failed to upsert profile", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ role: defaultRole });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
