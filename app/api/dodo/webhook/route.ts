import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

import { supabaseAdmin } from "@/lib/supabase/admin";

const webhookSecret = process.env.DODO_WEBHOOK_SECRET!;

// Dodo Payments webhook event types (based on official docs)
type DodoWebhookEvent = {
  business_id: string;
  timestamp: string;
  type: string;
  data: {
    // Subscription data
    subscription_id?: string;
    status?: string;
    customer?: {
      customer_id: string;
      email: string;
      name?: string;
    };
    product_id?: string;
    // Payment data
    payment_id?: string;
    // Metadata we pass
    metadata?: Record<string, string>;
  };
};

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();

  // Get webhook headers
  const webhookId = headersList.get("webhook-id");
  const webhookTimestamp = headersList.get("webhook-timestamp");
  const webhookSignature = headersList.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.error("Missing webhook headers");
    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 400 }
    );
  }

  // Verify webhook signature using standardwebhooks
  const webhook = new Webhook(webhookSecret);

  let event: DodoWebhookEvent;

  try {
    event = webhook.verify(body, {
      "webhook-id": webhookId,
      "webhook-timestamp": webhookTimestamp,
      "webhook-signature": webhookSignature,
    }) as DodoWebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  console.log(`[Dodo Webhook] Received event: ${event.type}`);
  console.log(`[Dodo Webhook] Event data:`, JSON.stringify(event.data, null, 2));

  try {
    switch (event.type) {
      // Subscription activated (including trials) - upgrade user
      case "subscription.active": {
        await handleSubscriptionActive(event);
        break;
      }

      // Subscription renewed - confirm continued access
      case "subscription.renewed": {
        await handleSubscriptionRenewed(event);
        break;
      }

      // Subscription on hold - payment issue, notify user but don't downgrade yet
      case "subscription.on_hold": {
        await handleSubscriptionOnHold(event);
        break;
      }

      // Subscription failed to create
      case "subscription.failed": {
        await handleSubscriptionFailed(event);
        break;
      }

      // Payment succeeded
      case "payment.succeeded": {
        await handlePaymentSucceeded(event);
        break;
      }

      // Payment failed
      case "payment.failed": {
        await handlePaymentFailed(event);
        break;
      }

      // Subscription updated (catches cancellations and other changes)
      case "subscription.updated": {
        await handleSubscriptionUpdated(event);
        break;
      }

      default:
        console.log(`[Dodo Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Dodo Webhook] Error processing:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Find user by metadata or customer ID
 */
async function findUserProfile(event: DodoWebhookEvent) {
  const userId = event.data.metadata?.supabase_user_id;
  const customerId = event.data.customer?.customer_id;

  // Try metadata first (most reliable for new subscriptions)
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, subscription_tier")
      .eq("id", userId)
      .single();

    if (profile) return profile;
  }

  // Fall back to customer ID lookup
  if (customerId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, subscription_tier")
      .eq("dodo_customer_id", customerId)
      .single();

    if (profile) return profile;
  }

  return null;
}

/**
 * Subscription is active (includes trial starts)
 */
async function handleSubscriptionActive(event: DodoWebhookEvent) {
  const profile = await findUserProfile(event);
  const customerId = event.data.customer?.customer_id;

  if (!profile) {
    console.error("[Dodo Webhook] No user found for subscription.active");
    return;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: "bibliophile",
      dodo_customer_id: customerId,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("[Dodo Webhook] Error upgrading user:", error);
    throw error;
  }

  console.log(`[Dodo Webhook] User ${profile.email} upgraded to Bibliophile`);
}

/**
 * Subscription renewed successfully
 */
async function handleSubscriptionRenewed(event: DodoWebhookEvent) {
  const profile = await findUserProfile(event);

  if (!profile) {
    console.error("[Dodo Webhook] No user found for subscription.renewed");
    return;
  }

  // Ensure they stay on Bibliophile tier
  if (profile.subscription_tier !== "bibliophile") {
    await supabaseAdmin
      .from("profiles")
      .update({ subscription_tier: "bibliophile" })
      .eq("id", profile.id);
  }

  console.log(`[Dodo Webhook] User ${profile.email} subscription renewed`);
}

/**
 * Subscription is on hold (payment failed)
 */
async function handleSubscriptionOnHold(event: DodoWebhookEvent) {
  const profile = await findUserProfile(event);

  if (!profile) {
    console.error("[Dodo Webhook] No user found for subscription.on_hold");
    return;
  }

  // Don't downgrade immediately - give them time to fix payment
  // You could send an email here or set a flag
  console.log(`[Dodo Webhook] User ${profile.email} subscription on hold - payment issue`);
}

/**
 * Subscription failed to create
 */
async function handleSubscriptionFailed(event: DodoWebhookEvent) {
  const profile = await findUserProfile(event);

  if (!profile) {
    console.error("[Dodo Webhook] No user found for subscription.failed");
    return;
  }

  // Ensure they're on free tier
  await supabaseAdmin
    .from("profiles")
    .update({ subscription_tier: "free" })
    .eq("id", profile.id);

  console.log(`[Dodo Webhook] User ${profile.email} subscription creation failed`);
}

/**
 * Payment succeeded
 */
async function handlePaymentSucceeded(event: DodoWebhookEvent) {
  const profile = await findUserProfile(event);

  if (!profile) {
    console.log("[Dodo Webhook] No user found for payment.succeeded (may be handled by subscription.active)");
    return;
  }

  // Ensure they have Bibliophile access
  if (profile.subscription_tier !== "bibliophile") {
    await supabaseAdmin
      .from("profiles")
      .update({ subscription_tier: "bibliophile" })
      .eq("id", profile.id);
  }

  console.log(`[Dodo Webhook] Payment succeeded for ${profile.email}`);
}

/**
 * Payment failed
 */
async function handlePaymentFailed(event: DodoWebhookEvent) {
  const profile = await findUserProfile(event);

  if (!profile) {
    console.error("[Dodo Webhook] No user found for payment.failed");
    return;
  }

  console.log(`[Dodo Webhook] Payment failed for ${profile.email}`);
}

/**
 * Subscription updated (can include cancellations)
 */
async function handleSubscriptionUpdated(event: DodoWebhookEvent) {
  const profile = await findUserProfile(event);
  const status = event.data.status;

  if (!profile) {
    console.error("[Dodo Webhook] No user found for subscription.updated");
    return;
  }

  // Handle based on new status
  if (status === "cancelled" || status === "expired") {
    await supabaseAdmin
      .from("profiles")
      .update({ subscription_tier: "free" })
      .eq("id", profile.id);
    console.log(`[Dodo Webhook] User ${profile.email} downgraded (subscription ${status})`);
  } else {
    console.log(`[Dodo Webhook] User ${profile.email} subscription updated to status: ${status}`);
  }
}
