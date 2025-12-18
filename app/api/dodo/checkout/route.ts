import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getDodo, BIBLIOPHILE_PRODUCT_ID } from "@/lib/dodo/server";
import { createClient } from "@/lib/supabase/server";

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

    const cookieStore = cookies();
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

    const customerEmail = user.email || "";
    const customerName = user.email?.split("@")[0] || "Customer";

    const dodo = getDodo();

    // Create a Dodo Payments Checkout Session (correct API per docs)
    try {
      const session = await dodo.checkoutSessions.create({
        product_cart: [
          {
            product_id: BIBLIOPHILE_PRODUCT_ID,
            quantity: 1,
          },
        ],
        customer: {
          email: customerEmail,
          name: customerName,
        },
        // Return URL after successful payment
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`,
        // Pass user ID in metadata for webhook
        metadata: {
          supabase_user_id: user.id,
        },
      });

      if (!session.checkout_url) {
        console.error("No checkout URL returned from Dodo:", session);
        return NextResponse.json(
          { error: "Failed to generate checkout URL" },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: session.checkout_url });
    } catch (paymentError: unknown) {
      console.error("Error creating Dodo checkout session:", paymentError);
      const errorMessage = paymentError instanceof Error ? paymentError.message : "Unknown error";
      return NextResponse.json(
        { error: `Checkout creation failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Unexpected error in checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Checkout failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
