import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { dodo, BIBLIOPHILE_PRODUCT_ID } from "@/lib/dodo/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to subscribe" },
        { status: 401 }
      );
    }

    // Check if user already has a Dodo customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id; // We'll reuse this field for Dodo customer ID

    // Create a new Dodo customer if they don't have one
    if (!customerId) {
      const customer = await dodo.customers.create({
        email: user.email || profile?.email || "",
        name: user.email?.split("@")[0] || "Customer",
      });

      customerId = customer.customer_id;

      // Save the customer ID to the profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId }) // Reusing the field name
        .eq("id", user.id);
    }

    // Create a Dodo Payments checkout session (payment link)
    const paymentLink = await dodo.payments.create({
      billing: {
        city: "",
        country: "US", // Default, Dodo will detect actual location
        state: "",
        street: "",
        zipcode: "",
      },
      customer: {
        customer_id: customerId,
        email: user.email || profile?.email || "",
        name: user.email?.split("@")[0] || "Customer",
      },
      product_cart: [
        {
          product_id: BIBLIOPHILE_PRODUCT_ID,
          quantity: 1,
        },
      ],
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: paymentLink.payment_link });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

