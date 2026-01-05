"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import {
  getSubscriptionInfo,
  createCustomerPortalSession,
  cancelSubscription,
  restoreSubscriptionAccess,
  type SubscriptionInfo,
} from "@/app/actions/subscription";
import { SettingsContent } from "@/components/settings/settings-content";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SubscriptionBillingPage() {
  const router = useRouter();
  const {
    loading: profileLoading,
    refreshProfile,
    isPremium,
    isFree,
  } = useProfile();

  // Track subscription info
  const [subscriptionDetails, setSubscriptionDetails] = useState<
    SubscriptionInfo["subscription"] | null
  >(null);
  const [hasCustomerId, setHasCustomerId] = useState(false);
  const [detailsFetched, setDetailsFetched] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSubscriptionDetails = async () => {
    const result = await getSubscriptionInfo();
    if (result.success) {
      setSubscriptionDetails(result.data.subscription);
      setHasCustomerId(!!result.data.customerId);
    }
    setDetailsFetched(true);
  };

  const handleUpgrade = () => {
    router.push("/checkout");
  };

  const handleManageBilling = async () => {
    setActionLoading("billing");
    setError(null);

    const result = await createCustomerPortalSession();

    if (result.success) {
      window.open(result.url, "_blank");
    } else {
      setError(result.error);
    }

    setActionLoading(null);
  };

  const handleCancelSubscription = async () => {
    setActionLoading("cancel");
    setError(null);
    setSuccessMessage(null);

    const result = await cancelSubscription();

    if (result.success) {
      setSuccessMessage(result.message);
      // Refresh profile to get updated subscription tier
      await refreshProfile();
      // Also refresh subscription details
      await fetchSubscriptionDetails();
    } else {
      setError(result.error);
    }

    setActionLoading(null);
  };

  const handleRefresh = async () => {
    setActionLoading("refresh");
    setError(null);
    setSuccessMessage(null);

    // Reset fetch state to force re-check
    setDetailsFetched(false);
    fetchStartedRef.current = false;

    await refreshProfile();

    // Fetch subscription info - this will also restore access if needed
    const result = await getSubscriptionInfo();
    if (result.success) {
      setSubscriptionDetails(result.data.subscription);
      setHasCustomerId(!!result.data.customerId);
      if (result.data.tier === "bibliophile" && !isPremium) {
        await refreshProfile(); // Refresh again to update isPremium
        setSuccessMessage(
          "Access restored! Your subscription is still active."
        );
      }
    }

    setActionLoading(null);
  };

  const handleRestoreAccess = async () => {
    setActionLoading("restore");
    setError(null);
    setSuccessMessage(null);

    const result = await restoreSubscriptionAccess();

    if (result.success) {
      setSuccessMessage(result.message);
      await refreshProfile();
      setDetailsFetched(false);
      fetchStartedRef.current = false;
      await fetchSubscriptionDetails();
    } else {
      setError(result.error);
    }

    setActionLoading(null);
  };

  // Track if we've started fetching to avoid duplicate calls
  const fetchStartedRef = useRef(false);

  // Fetch subscription details when profile is loaded
  // IMPORTANT: Always check, even if user appears to be on free tier
  // This allows restoration of access if subscription is still active in Dodo
  useEffect(() => {
    // Only fetch once when conditions are met
    if (profileLoading || detailsFetched || fetchStartedRef.current) {
      return;
    }

    fetchStartedRef.current = true;

    // Fetch subscription details asynchronously
    // This will also restore access if subscription is still active
    // Using void to explicitly mark this as fire-and-forget
    void (async () => {
      try {
        const result = await getSubscriptionInfo();
        if (result.success) {
          setSubscriptionDetails(result.data.subscription);
          setHasCustomerId(!!result.data.customerId);
          // If access was restored, refresh the profile to update isPremium
          if (result.data.tier === "bibliophile" && !isPremium) {
            await refreshProfile();
          }
        }
        setDetailsFetched(true);
      } catch (err) {
        console.error("Error fetching subscription details:", err);
        setError("Failed to load subscription details");
        setDetailsFetched(true); // Mark as fetched even on error to prevent retries
      }
    })();
  }, [profileLoading, detailsFetched, isPremium, refreshProfile]);

  if (profileLoading) {
    return (
      <SettingsContent
        title="Subscription & Billing"
        description="Manage your subscription plan and billing information."
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      </SettingsContent>
    );
  }

  return (
    <SettingsContent
      title="Subscription & Billing"
      description="Manage your subscription plan and billing information."
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Restore Access Alert - Show if user should have access but doesn't */}
        {isFree && subscriptionDetails && (
          <Card className="border border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-amber-400">
                <AlertCircle className="size-5" />
                Access Issue Detected
              </CardTitle>
              <CardDescription>
                We found an active subscription in your account, but your access
                was removed. Click below to restore your Bibliophile access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={handleRestoreAccess}
                disabled={actionLoading === "restore"}
              >
                {actionLoading === "restore" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Restore Bibliophile Access
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="size-5 shrink-0" />
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        {/* Current Plan Card */}
        <Card className="border border-slate-700 bg-slate-900/40">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Current Plan
                </CardTitle>
                <CardDescription className="mt-1">
                  {isPremium
                    ? "Your subscription is active"
                    : "You are on the free plan"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={actionLoading === "refresh"}
                className="size-8"
              >
                <RefreshCw
                  className={`size-4 ${
                    actionLoading === "refresh" ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Badge and Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge
                  variant={isPremium ? "default" : "secondary"}
                  className={
                    isPremium
                      ? "bg-emerald-500 text-slate-900 font-semibold"
                      : ""
                  }
                >
                  {isPremium ? "Bibliophile" : "Bookworm"}
                </Badge>
                {subscriptionDetails?.cancelAtPeriodEnd && (
                  <Badge
                    variant="outline"
                    className="text-amber-400 border-amber-400/50"
                  >
                    Cancelling
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">
                  {isPremium ? "$4.99 / month" : "Free"}
                </p>
                {isPremium && subscriptionDetails?.currentPeriodEnd && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="size-3" />
                    <span>
                      {subscriptionDetails.cancelAtPeriodEnd
                        ? "Access ends on "
                        : "Renews on "}
                      {formatDate(subscriptionDetails.currentPeriodEnd)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Management Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {/* Show billing portal button for any user with a customer ID */}
              {hasCustomerId && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleManageBilling}
                  disabled={actionLoading === "billing"}
                >
                  {actionLoading === "billing" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                  Manage Subscription
                  <ExternalLink className="size-3" />
                </Button>
              )}
              {/* Show upgrade button for free users */}
              {isFree && (
                <Button
                  variant={hasCustomerId ? "outline" : "default"}
                  size="sm"
                  onClick={handleUpgrade}
                  className="gap-2"
                >
                  <Sparkles className="size-4" />
                  {hasCustomerId ? "Resubscribe" : "Upgrade to Bibliophile"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Promo - Free Users */}
        {isFree && (
          <Card className="border border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-5 text-emerald-500" />
                Unlock Bibliophile
              </CardTitle>
              <CardDescription>
                Get access to premium features to enhance your reading journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">12 Active Goals</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">
                    Advanced Velocity Insights
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Data Exports</span>
                </li>
              </ul>
              <Button
                variant="default"
                className="mt-4 w-full gap-2"
                onClick={handleUpgrade}
              >
                <Sparkles className="size-4" />
                Upgrade Now - $4.99/month
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Billing Portal Card - Show for users with a customer ID */}
        {hasCustomerId && (
          <Card className="border border-slate-700 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base">Billing & Invoices</CardTitle>
              <CardDescription>
                Access your Dodo Payments portal to view invoices, update
                payment methods, and manage your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleManageBilling}
                disabled={actionLoading === "billing"}
              >
                {actionLoading === "billing" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                Open Billing Portal
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Benefits - Premium Users */}
        {isPremium && (
          <Card className="border border-slate-700 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base">
                Your Bibliophile Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-slate-300">Up to 12 Active Goals</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-slate-300">
                    Advanced Velocity Insights & Analytics
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-slate-300">
                    Export your reading data anytime
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-slate-300">
                    Priority recommendations
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-slate-300">
                    Early access to new features
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Cancel Subscription - Premium Users */}
        {isPremium && !subscriptionDetails?.cancelAtPeriodEnd && (
          <Card className="border border-slate-700/50 bg-slate-900/20">
            <CardHeader>
              <CardTitle className="text-base text-slate-400">
                Cancel Subscription
              </CardTitle>
              <CardDescription>
                You can cancel your subscription at any time. You&apos;ll keep
                access until the end of your current billing period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
                    disabled={actionLoading === "cancel"}
                  >
                    {actionLoading === "cancel" ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : null}
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Cancel your subscription?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until the end of your
                      current billing period. After that, you&apos;ll be
                      downgraded to the free Bookworm plan and lose access to
                      premium features.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 border-slate-700">
                      Keep Subscription
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, Cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Reactivate Prompt - Cancelling Users */}
      </div>
    </SettingsContent>
  );
}
