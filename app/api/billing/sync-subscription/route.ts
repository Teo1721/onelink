import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get the user's stripe_customer_id
    const { data: profile } = await admin
      .from("user_profiles")
      .select("stripe_customer_id, subscription_active")
      .eq("id", user.id)
      .maybeSingle();

    // If already active, nothing to do
    if (profile?.subscription_active) {
      return NextResponse.json({ ok: true, subscription_active: true });
    }

    const customerId = profile?.stripe_customer_id as string | null;

    // Also allow passing session_id to look up customer directly
    let sessionId: string | null = null;
    try {
      const body = await request.json();
      sessionId = body?.sessionId ?? null;
    } catch {
      // no body
    }

    if (!customerId && !sessionId) {
      return NextResponse.json({ ok: false, reason: "no_customer" });
    }

    let resolvedCustomerId = customerId;

    // If we have a session_id, retrieve customer from it
    if (sessionId && !resolvedCustomerId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      resolvedCustomerId = session.customer as string | null;

      // Save customer ID to profile if we just discovered it
      if (resolvedCustomerId) {
        await admin
          .from("user_profiles")
          .update({ stripe_customer_id: resolvedCustomerId })
          .eq("id", user.id);
      }
    }

    if (!resolvedCustomerId) {
      return NextResponse.json({ ok: false, reason: "no_customer" });
    }

    // Retrieve active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: resolvedCustomerId,
      status: "all",
      limit: 5,
    });

    const activeSub = subscriptions.data.find(
      (s) => s.status === "trialing" || s.status === "active"
    );

    if (!activeSub) {
      return NextResponse.json({ ok: false, reason: "no_active_subscription" });
    }

    const planCode =
      (activeSub.metadata as Record<string, string>)?.plan_code ?? null;

    // Activate subscription in the database
    await admin
      .from("user_profiles")
      .update({
        subscription_active: true,
        subscription_status: activeSub.status,
        subscription_plan: planCode,
        stripe_customer_id: resolvedCustomerId,
        current_period_end: activeSub.current_period_end
          ? new Date(activeSub.current_period_end * 1000).toISOString()
          : null,
      })
      .eq("id", user.id);

    return NextResponse.json({ ok: true, subscription_active: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
