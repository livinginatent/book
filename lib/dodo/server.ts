import DodoPayments from "dodopayments";

if (!process.env.DODO_PAYMENTS_API_KEY) {
  throw new Error("Missing DODO_PAYMENTS_API_KEY environment variable");
}

// Initialize Dodo Payments client
export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: "test_mode",
});
const checkoutSessionResponse = await dodo.checkoutSessions.create({
  product_cart: [{ product_id: "pdt_0NUI0Mrm22gSHhl4atK8S", quantity: 1 }],
});
console.log(checkoutSessionResponse.session_id);
// Product ID for the Bibliophile subscription
// You'll get this from your Dodo Payments Dashboard after creating the product
export const BIBLIOPHILE_PRODUCT_ID = process.env.DODO_BIBLIOPHILE_PRODUCT_ID!;
