import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { dodo, BIBLIOPHILE_PRODUCT_ID } from "@/lib/dodo/server";
import { createClient } from "@/lib/supabase/server";

// Add runtime config to prevent static generation
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    // Check if product ID is configured
    if (!BIBLIOPHILE_PRODUCT_ID) {
      console.error("DODO_BIBLIOPHILE_PRODUCT_ID is not set");
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    const cookieStore =  cookies();
    const supabase = createClient(cookieStore);

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to subscribe" },
        { status: 401 }
      );
    }

    // Try to get existing profile (might not exist if profiles table isn't set up)
    let customerId: string | null = null;
    let profileEmail: string | null = null;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, email")
        .eq("id", user.id)
        .single();

      customerId = profile?.stripe_customer_id || null;
      profileEmail = profile?.email || null;
    } catch (profileError) {
      // Profile table might not exist - that's okay, continue without it
      console.log(
        "Could not fetch profile (table may not exist):",
        profileError
      );
    }

    const customerEmail = user.email || profileEmail || "";
    const customerName = user.email?.split("@")[0] || "Customer";

    // Create a new Dodo customer if they don't have one
    if (!customerId) {
      try {
        const customer = await dodo.customers.create({
          email: customerEmail,
          name: customerName,
        });

        customerId = customer.customer_id;

        // Try to save the customer ID to the profile (if table exists)
        try {
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", user.id);
        } catch {
          // Profile update failed - that's okay
          console.log("Could not update profile with customer ID");
        }
      } catch (customerError) {
        console.error("Error creating Dodo customer:", customerError);
        return NextResponse.json(
          { error: "Failed to create customer account" },
          { status: 500 }
        );
      }
    }

    // Create a Dodo Payments checkout session
    try {
      const checkoutSession = await dodo.checkoutSessions.create({
        product_cart: [
          {
            product_id: BIBLIOPHILE_PRODUCT_ID,
            quantity: 1,
          },
        ],
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`,
        customer: {
          customer_id: customerId,
        },
        metadata: {
          supabase_user_id: user.id,
        },
      });

      if (!checkoutSession.checkout_url) {
        console.error("No checkout URL returned from Dodo:", checkoutSession);
        return NextResponse.json(
          { error: "Failed to generate checkout URL" },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: checkoutSession.checkout_url });
    } catch (checkoutError: unknown) {
      console.error("Error creating Dodo checkout session:", checkoutError);
      const errorMessage =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unknown error";
      return NextResponse.json(
        { error: `Checkout creation failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Unexpected error in checkout:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Checkout failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
