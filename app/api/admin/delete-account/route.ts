import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Only the account owner can delete the company
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("role, company_id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (profile?.role !== "owner") {
      return NextResponse.json({ error: "Only the account owner can delete the account." }, { status: 403 });
    }

    const companyId = profile?.company_id as string | null;
    const stripeCustomerId = profile?.stripe_customer_id as string | null;

    // ── Cancel all Stripe subscriptions so the user isn't charged ──────
    if (stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "active",
          limit: 10,
        });
        const trialing = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "trialing",
          limit: 10,
        });
        const toCancel = [
          ...subscriptions.data,
          ...trialing.data,
        ];
        for (const sub of toCancel) {
          await stripe.subscriptions.cancel(sub.id);
        }
      } catch {
        // Non-fatal — still delete account data even if Stripe call fails
      }
    }

    if (!companyId) {
      // No company — just delete this user's profile and auth account
      await admin.from("user_profiles").delete().eq("id", user.id);
      await admin.auth.admin.deleteUser(user.id);
      return NextResponse.json({ success: true });
    }

    // ── Step 1: Collect all location IDs for this company ──────────────
    const { data: locationRows } = await admin
      .from("locations")
      .select("id")
      .eq("company_id", companyId);
    const locationIds = (locationRows || []).map((l: { id: string }) => l.id);

    // ── Step 2: Collect all user IDs in this company ────────────────────
    const { data: profileRows } = await admin
      .from("user_profiles")
      .select("id")
      .eq("company_id", companyId);
    const companyUserIds = (profileRows || []).map((p: { id: string }) => p.id);

    // ── Step 3: Delete location-scoped data (deepest children first) ────
    if (locationIds.length > 0) {
      // ingredient_prices_history has no location scope — handled below by company scope

      // inventory_job_items → inventory_jobs (location-scoped)
      const { data: jobRows } = await admin
        .from("inventory_jobs")
        .select("id")
        .in("location_id", locationIds);
      const jobIds = (jobRows || []).map((j: { id: string }) => j.id);
      if (jobIds.length > 0) {
        await admin.from("inventory_job_items").delete().in("job_id", jobIds);
      }

      // shift_clock_ins → shifts (location-scoped)
      const { data: shiftRows } = await admin
        .from("shifts")
        .select("id")
        .in("location_id", locationIds);
      const shiftIds = (shiftRows || []).map((s: { id: string }) => s.id);
      if (shiftIds.length > 0) {
        await admin.from("shift_clock_ins").delete().in("shift_id", shiftIds);
      }

      // invoice_line_items → invoices (location-scoped)
      const { data: invoiceRows } = await admin
        .from("invoices")
        .select("id")
        .in("location_id", locationIds);
      const invoiceIds = (invoiceRows || []).map((i: { id: string }) => i.id);
      if (invoiceIds.length > 0) {
        await admin.from("invoice_line_items").delete().in("invoice_id", invoiceIds);
      }

      // warehouse_transfers → warehouse_deliveries (location-scoped)
      const { data: deliveryRows } = await admin
        .from("warehouse_deliveries")
        .select("id")
        .in("location_id", locationIds);
      const deliveryIds = (deliveryRows || []).map((d: { id: string }) => d.id);
      if (deliveryIds.length > 0) {
        await admin.from("warehouse_transfers").delete().in("delivery_id", deliveryIds);
      }

      // Remaining location-scoped tables
      await admin.from("shifts").delete().in("location_id", locationIds);
      await admin.from("employee_daily_hours").delete().in("location_id", locationIds);
      await admin.from("semis_reconciliation_entries").delete().in("location_id", locationIds);
      await admin.from("warehouse_deliveries").delete().in("location_id", locationIds);
      await admin.from("imported_costs").delete().in("location_id", locationIds);
      await admin.from("sales_daily").delete().in("location_id", locationIds);
      await admin.from("inventory_jobs").delete().in("location_id", locationIds);
      await admin.from("invoices").delete().in("location_id", locationIds);
      await admin.from("closed_months").delete().in("location_id", locationIds);
      await admin.from("user_access").delete().in("location_id", locationIds);
    }

    // ── Step 4: Delete company-scoped data ──────────────────────────────

    // inventory_transactions is location-scoped
    if (locationIds.length > 0) {
      await admin.from("inventory_transactions").delete().in("location_id", locationIds);
    }

    // central_warehouse_stock references inventory_products
    const { data: invProdRows } = await admin
      .from("inventory_products")
      .select("id")
      .eq("company_id", companyId);
    const invProdIds = (invProdRows || []).map((p: { id: string }) => p.id);
    if (invProdIds.length > 0) {
      await admin.from("central_warehouse_stock").delete().in("product_id", invProdIds);
      await admin.from("warehouse_transfers").delete().in("product_id", invProdIds);
    }

    // recipe_ingredients and ingredient_prices_history reference ingredients
    const { data: ingredientRows } = await admin
      .from("ingredients")
      .select("id")
      .eq("company_id", companyId);
    const ingredientIds = (ingredientRows || []).map((i: { id: string }) => i.id);
    if (ingredientIds.length > 0) {
      await admin.from("recipe_ingredients").delete().in("ingredient_id", ingredientIds);
      await admin.from("ingredient_prices_history").delete().in("ingredient_id", ingredientIds);
    }

    // recipe_ingredients may also reference dishes
    const { data: dishRows } = await admin
      .from("dishes")
      .select("id")
      .eq("company_id", companyId);
    const dishIds = (dishRows || []).map((d: { id: string }) => d.id);
    if (dishIds.length > 0) {
      await admin.from("recipe_ingredients").delete().in("dish_id", dishIds);
    }

    // Now delete the top-level company-scoped tables
    await admin.from("admin_notifications").delete().eq("company_id", companyId);
    await admin.from("alerts").delete().eq("company_id", companyId);
    await admin.from("employees").delete().eq("company_id", companyId);
    await admin.from("dishes").delete().eq("company_id", companyId);
    await admin.from("ingredients").delete().eq("company_id", companyId);
    await admin.from("inventory_products").delete().eq("company_id", companyId);
    await admin.from("brands").delete().eq("company_id", companyId);
    await admin.from("locations").delete().eq("company_id", companyId);

    // ── Step 5: Delete all user profiles for this company ───────────────
    await admin.from("user_profiles").delete().eq("company_id", companyId);

    // ── Step 6: Delete the company record ───────────────────────────────
    await admin.from("companies").delete().eq("id", companyId);

    // ── Step 7: Delete all auth users for this company ──────────────────
    // Also include the current user even if company_id was somehow missing from their profile
    const allUserIds = Array.from(new Set([...companyUserIds, user.id]));
    for (const uid of allUserIds) {
      await admin.auth.admin.deleteUser(uid);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
