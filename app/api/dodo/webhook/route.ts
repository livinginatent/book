import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

import { supabaseAdmin } from "@/lib/supabase/admin";

const webhookSecret = process.env.DODO_WEBHOOK_SECRET!;

// Dodo Payments webhook event types
type DodoWebhookEvent = {
  type: string;
  data: {
    payload: {
      customer?: {
        customer_id: string;
        email: string;
      };
      product_id?: string;
      payment_id?: string;
      subscription_id?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
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

  console.log(`Received webhook event: ${event.type}`, JSON.stringify(event.data, null, 2));

  try {
    switch (event.type) {
      case "payment.succeeded": {
        await handlePaymentSucceeded(event);
        break;
      }

      // Handle subscription creation (including trials!)
      case "subscription.created":
      case "subscription.active": {
        await handleSubscriptionActive(event);
        break;
      }

      // Handle trial started - upgrade user immediately
      case "subscription.trial_started": {
        await handleSubscriptionActive(event);
        break;
      }

      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.on_hold": {
        await handleSubscriptionEnded(event);
        break;
      }

      case "payment.failed": {
        await handlePaymentFailed(event);
        break;
      }

      case "refund.succeeded": {
        await handleRefund(event);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment - upgrade user to Bibliophile
 */
async function handlePaymentSucceeded(event: DodoWebhookEvent) {
  const { payload } = event.data;
  const userId = payload.metadata?.supabase_user_id;
  const customerId = payload.customer?.customer_id;

  if (!userId && !customerId) {
    console.error("No user ID or customer ID in payment event");
    return;
  }

  // Try to find user by metadata first, then by customer ID
  let profileId = userId;
  
  if (!profileId && customerId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("dodo_customer_id", customerId)
      .single();
    
    profileId = profile?.id;
  }

  if (!profileId) {
    console.error("Could not find user for payment");
    return;
  }

  // Update the user's subscription tier
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: "bibliophile",
      dodo_customer_id: customerId, // Store Dodo customer ID
    })
    .eq("id", profileId);

  if (error) {
    console.error("Error updating profile after payment:", error);
    throw error;
  }

  console.log(`User ${profileId} upgraded to Bibliophile`);
}

/**
 * Handle subscription becoming active (including trials)
 */
async function handleSubscriptionActive(event: DodoWebhookEvent) {
  const { payload } = event.data;
  const customerId = payload.customer?.customer_id;
  const userId = payload.metadata?.supabase_user_id;

  console.log(`Processing subscription activation for customer: ${customerId}, user: ${userId}`);

  // Try to find user by metadata first (more reliable for new subscriptions)
  let profileId = userId;

  if (!profileId && customerId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("dodo_customer_id", customerId)
      .single();

    profileId = profile?.id;
  }

  if (!profileId) {
    console.error("Could not find user for subscription activation");
    return;
  }

  // Update user to Bibliophile tier
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ 
      subscription_tier: "bibliophile",
      dodo_customer_id: customerId,
    })
    .eq("id", profileId);

  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }

  console.log(`User ${profileId} upgraded to Bibliophile (subscription active/trial)`);
}

/**
 * Handle subscription cancellation or expiration - downgrade to free
 */
async function handleSubscriptionEnded(event: DodoWebhookEvent) {
  const { payload } = event.data;
  const customerId = payload.customer?.customer_id;

  if (!customerId) {
    console.error("No customer ID in subscription end event");
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("dodo_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("Could not find user for subscription end");
    return;
  }

  await supabaseAdmin
    .from("profiles")
    .update({ subscription_tier: "free" })
    .eq("id", profile.id);

  console.log(`User ${profile.id} downgraded to free (subscription ended)`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event: DodoWebhookEvent) {
  const { payload } = event.data;
  const customerId = payload.customer?.customer_id;

  if (!customerId) {
    console.error("No customer ID in payment failed event");
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("dodo_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("Could not find user for payment failure");
    return;
  }

  // Log the failure - you could send an email notification here
  console.log(`Payment failed for user ${profile.id} (${profile.email})`);
}

/**
 * Handle refund - downgrade user
 */
async function handleRefund(event: DodoWebhookEvent) {
  const { payload } = event.data;
  const customerId = payload.customer?.customer_id;

  if (!customerId) {
    console.error("No customer ID in refund event");
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("dodo_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("Could not find user for refund");
    return;
  }

  await supabaseAdmin
    .from("profiles")
    .update({ subscription_tier: "free" })
    .eq("id", profile.id);

  console.log(`User ${profile.id} downgraded to free (refund processed)`);
}

