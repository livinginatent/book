"use server";

import { cookies } from "next/headers";

import { getDodo } from "@/lib/dodo/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SubscriptionInfo {
  tier: "free" | "bibliophile";
  customerId: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface GetSubscriptionResult {
  success: true;
  data: SubscriptionInfo;
}

export interface GetSubscriptionError {
  success: false;
  error: string;
}

/**
 * Get current user's subscription information
 */
export async function getSubscriptionInfo(): Promise<
  GetSubscriptionResult | GetSubscriptionError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, dodo_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Failed to fetch profile" };
    }

    const subscriptionInfo: SubscriptionInfo = {
      tier: profile.subscription_tier || "free",
      customerId: profile.dodo_customer_id,
      subscription: null,
    };

    // If user has a customer ID, try to fetch subscription details from Dodo
    if (profile.dodo_customer_id) {
      try {
        const dodo = getDodo();
        
        // Get subscriptions for this customer
        const subscriptions = await dodo.subscriptions.list({
          customer_id: profile.dodo_customer_id,
        });

        console.log(`[Subscription] Found ${subscriptions.items?.length || 0} subscriptions for user ${user.id}`);
        
        // Find subscriptions that are still active (not expired)
        // Check ALL subscriptions - even cancelled ones might still be active until period ends
        const activeSubscription = subscriptions.items?.find((sub) => {
          // Log all subscription details for debugging
          console.log(`[Subscription] Checking subscription ${sub.subscription_id}:`, {
            status: sub.status,
            next_billing_date: sub.next_billing_date,
            cancelled_at: sub.cancelled_at,
            created_at: sub.created_at,
          });
          
          // Priority 1: Check if subscription has a future billing date (still active)
          if (sub.next_billing_date) {
            const nextBilling = new Date(sub.next_billing_date);
            const now = new Date();
            const isFuture = nextBilling > now;
            
            // If next billing date is in the future, subscription is still active
            // This works for: active, cancelled (but not expired), on_hold
            if (isFuture) {
              console.log(`[Subscription] Subscription ${sub.subscription_id} is active (future billing date)`);
              return true;
            }
          }
          
          // Priority 2: If status is "active" (even with cancelled_at set), it's still active
          // Dodo may keep status as "active" even when cancelled until period ends
          if (sub.status === "active") {
            console.log(`[Subscription] Subscription ${sub.subscription_id} has active status`);
            return true;
          }
          
          // Priority 3: If status is "on_hold", still consider it active
          if (sub.status === "on_hold") {
            console.log(`[Subscription] Subscription ${sub.subscription_id} is on hold`);
            return true;
          }
          
          return false;
        });

        if (activeSubscription) {
          console.log(`[Subscription] Found active subscription: ${activeSubscription.subscription_id}, status: ${activeSubscription.status}, next_billing: ${activeSubscription.next_billing_date}`);
          
          // If subscription is still active (even if cancelled), user should have bibliophile access
          // This fixes cases where webhook incorrectly downgraded a cancelled subscription
          if (profile.subscription_tier !== "bibliophile") {
            console.log(
              `[Subscription] RESTORING bibliophile access for user ${user.id} - subscription still active until ${activeSubscription.next_billing_date}`
            );
            const { error: updateError } = await supabaseAdmin
              .from("profiles")
              .update({ subscription_tier: "bibliophile" })
              .eq("id", user.id);
            
            if (updateError) {
              console.error(`[Subscription] Error restoring access:`, updateError);
            } else {
              console.log(`[Subscription] Successfully restored bibliophile access for user ${user.id}`);
              subscriptionInfo.tier = "bibliophile";
            }
          }

          subscriptionInfo.subscription = {
            id: activeSubscription.subscription_id,
            status: activeSubscription.status,
            currentPeriodEnd: activeSubscription.next_billing_date || null,
            cancelAtPeriodEnd: !!activeSubscription.cancelled_at,
          };
        } else {
          console.log(`[Subscription] No active subscription found for user ${user.id}`);
        }
      } catch (dodoError) {
        // Log but don't fail - user might still have bibliophile access
        console.error("Error fetching Dodo subscription:", dodoError);
      }
    } else {
      console.log(`[Subscription] User ${user.id} has no dodo_customer_id`);
    }

    return { success: true, data: subscriptionInfo };
  } catch (error) {
    console.error("Error in getSubscriptionInfo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface CreatePortalResult {
  success: true;
  url: string;
}

export interface CreatePortalError {
  success: false;
  error: string;
}

/**
 * Create a customer portal session for managing billing
 * Note: Dodo Payments uses their own dashboard for subscription management
 * This returns the customer portal URL if available
 */
export async function createCustomerPortalSession(): Promise<
  CreatePortalResult | CreatePortalError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("dodo_customer_id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Failed to fetch profile" };
    }

    if (!profile.dodo_customer_id) {
      return { success: false, error: "No billing account found" };
    }

    try {
      const dodo = getDodo();
      
      // Create customer portal session
      const portal = await dodo.customers.customerPortal.create(
        profile.dodo_customer_id,
        {
          send_email: false,
        }
      );

      if (!portal.link) {
        return { success: false, error: "Failed to create portal session" };
      }

      return { success: true, url: portal.link };
    } catch (dodoError) {
      console.error("Error creating customer portal:", dodoError);
      return {
        success: false,
        error: "Unable to access billing portal. Please try again later.",
      };
    }
  } catch (error) {
    console.error("Error in createCustomerPortalSession:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface CancelSubscriptionResult {
  success: true;
  message: string;
}

export interface CancelSubscriptionError {
  success: false;
  error: string;
}

/**
 * Cancel user subscription (will remain active until end of billing period)
 */
export async function cancelSubscription(): Promise<
  CancelSubscriptionResult | CancelSubscriptionError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("dodo_customer_id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Failed to fetch profile" };
    }

    if (profile.subscription_tier !== "bibliophile") {
      return { success: false, error: "No active subscription to cancel" };
    }

    if (!profile.dodo_customer_id) {
      // Edge case: bibliophile without customer ID (manual upgrade)
      // Just downgrade them directly
      await supabaseAdmin
        .from("profiles")
        .update({ subscription_tier: "free" })
        .eq("id", user.id);

      return { success: true, message: "Subscription cancelled" };
    }

    try {
      const dodo = getDodo();

      // Get active subscription - check for active status OR cancelled but not expired
      const subscriptions = await dodo.subscriptions.list({
        customer_id: profile.dodo_customer_id,
      });

      const activeSubscription = subscriptions.items?.find((sub) => {
        if (sub.status === "active") {
          return true;
        }
        // Also check if cancelled but still has future billing date
        if (sub.status === "cancelled" && sub.next_billing_date) {
          const nextBilling = new Date(sub.next_billing_date);
          return nextBilling > new Date();
        }
        return false;
      });

      if (activeSubscription) {
        // Cancel the subscription (webhook will handle the status change)
        await dodo.subscriptions.update(activeSubscription.subscription_id, {
          status: "cancelled",
        });
      }

      return {
        success: true,
        message: "Subscription will be cancelled at the end of your billing period",
      };
    } catch (dodoError) {
      console.error("Error cancelling subscription:", dodoError);
      return {
        success: false,
        error: "Failed to cancel subscription. Please try again or contact support.",
      };
    }
  } catch (error) {
    console.error("Error in cancelSubscription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Manually restore bibliophile access if subscription is still active in Dodo
 * This is a utility function to fix cases where access was incorrectly removed
 */
export async function restoreSubscriptionAccess(): Promise<
  { success: true; message: string } | { success: false; error: string }
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("dodo_customer_id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Failed to fetch profile" };
    }

    if (!profile.dodo_customer_id) {
      return { success: false, error: "No subscription found" };
    }

    // Force check subscription and restore if needed
    const result = await getSubscriptionInfo();
    
    if (result.success && result.data.tier === "bibliophile") {
      return { success: true, message: "Access restored successfully" };
    }

    return { success: false, error: "No active subscription found to restore" };
  } catch (error) {
    console.error("Error in restoreSubscriptionAccess:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
