import DodoPayments from "dodopayments";

if (!process.env.DODO_PAYMENTS_API_KEY) {
  throw new Error("Missing DODO_PAYMENTS_API_KEY environment variable");
}

// Initialize Dodo Payments client
export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  // Use test environment in development
  environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

// Product ID for the Bibliophile subscription
// You'll get this from your Dodo Payments Dashboard after creating the product
export const BIBLIOPHILE_PRODUCT_ID = process.env.DODO_BIBLIOPHILE_PRODUCT_ID!;

