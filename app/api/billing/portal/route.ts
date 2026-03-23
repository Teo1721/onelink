import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = (await headers()).get("origin") || "http://localhost:3000";

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const customerId = profile?.stripe_customer_id as string | null;

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please activate a subscription first." },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/admin`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
