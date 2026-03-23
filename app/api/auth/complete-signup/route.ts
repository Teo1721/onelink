import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId, companyName } = await request.json();

    if (!userId || !companyName?.trim()) {
      return NextResponse.json({ error: "Missing userId or companyName" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the user actually exists in Supabase auth before doing anything
    const { data: { user }, error: getUserError } = await admin.auth.admin.getUserById(userId);
    if (getUserError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Confirm the email programmatically — this means the user never needs to click
    // a confirmation link and can log in immediately after signing up.
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });

    // Check if a profile already exists (idempotent — safe to call multiple times)
    const { data: existingProfile } = await admin
      .from("user_profiles")
      .select("id, company_id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile?.company_id) {
      // Profile + company already set up — nothing to do
      return NextResponse.json({ ok: true });
    }

    // Create company
    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({ name: companyName.trim() })
      .select("id")
      .single();

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 });
    }

    // Upsert user profile
    const { error: profileError } = await admin
      .from("user_profiles")
      .upsert({ id: userId, role: "owner", company_id: company.id });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
