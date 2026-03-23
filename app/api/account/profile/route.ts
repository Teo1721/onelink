import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("user_profiles")
      .select("full_name, subscription_plan, stripe_customer_id, company_id, subscription_active, subscription_status, current_period_end")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      email: user.email ?? "",
      full_name: profile?.full_name ?? "",
      subscription_plan: profile?.subscription_plan ?? null,
      stripe_customer_id: profile?.stripe_customer_id ?? null,
      subscription_active: profile?.subscription_active ?? null,
      subscription_status: profile?.subscription_status ?? null,
      current_period_end: profile?.current_period_end ?? null,
      company_id: profile?.company_id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
