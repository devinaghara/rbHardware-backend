import User from "../Models/User.js";
import Product from "../Models/Product.js";
import crypto from "crypto";

/**
 * In-memory store for fake payment intents.
 * In production, this would be handled by Stripe's API.
 * Using Map for O(1) lookup with automatic cleanup via TTL.
 */
const paymentIntents = new Map();

// Clean up expired intents every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, intent] of paymentIntents) {
    if (now - intent.createdAt > 30 * 60 * 1000) {
      paymentIntents.delete(id);
    }
  }
}, 10 * 60 * 1000);

/**
 * Create a fake Stripe payment intent
 * Calculates amount server-side from the user's cart to prevent tampering
 */
const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Find user and their cart
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const cartItems = user.cart.items;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Collect variant IDs from cart — these are linkedProduct subdocument _ids, NOT main product _ids
    const variantIds = [...new Set(cartItems.map((item) => item.productId.toString()))];
    const products = await Product.find({ "linkedProducts._id": { $in: variantIds } });

    // Build lookup map: variantId -> { product, variant }
    const variantMap = {};
    products.forEach((p) => {
      p.linkedProducts.forEach((lp) => {
        if (variantIds.includes(lp._id.toString())) {
          variantMap[lp._id.toString()] = { product: p, variant: lp };
        }
      });
    });

    // Calculate verified total from DB prices
    let amount = 0;
    for (const cartItem of cartItems) {
      const entry = variantMap[cartItem.productId.toString()];
      if (!entry) {
        return res.status(400).json({
          success: false,
          message: `Product "${cartItem.name}" is no longer available`,
        });
      }

      if (!entry.product.isOrderable) {
        return res.status(400).json({
          success: false,
          message: `"${cartItem.name}" is currently not available for ordering`,
        });
      }

      amount += entry.variant.price * cartItem.quantity;
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount",
      });
    }

    // Generate fake payment intent
    const paymentIntentId = `pi_${crypto.randomBytes(12).toString("hex")}`;
    const clientSecret = `${paymentIntentId}_secret_${crypto.randomBytes(8).toString("hex")}`;

    // Store intent
    paymentIntents.set(paymentIntentId, {
      id: paymentIntentId,
      clientSecret,
      amount,
      currency: "inr",
      status: "requires_confirmation",
      userId: userId.toString(),
      createdAt: Date.now(),
    });

    res.status(200).json({
      success: true,
      clientSecret,
      paymentIntentId,
      amount,
      currency: "inr",
    });
  } catch (error) {
    console.error("Create payment intent error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment intent",
      error: error.message,
    });
  }
};

/**
 * Confirm a fake Stripe payment
 * Simulates Stripe's confirmation step
 */
const confirmPayment = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID is required",
      });
    }

    const intent = paymentIntents.get(paymentIntentId);

    if (!intent) {
      return res.status(404).json({
        success: false,
        message: "Payment intent not found or expired",
      });
    }

    // Security: ensure the intent belongs to the same user
    if (intent.userId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized payment confirmation",
      });
    }

    if (intent.status === "succeeded") {
      return res.status(400).json({
        success: false,
        message: "Payment already confirmed",
      });
    }

    // Simulate successful payment
    intent.status = "succeeded";
    paymentIntents.set(paymentIntentId, intent);

    res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      paymentIntent: {
        id: intent.id,
        status: "succeeded",
        amount: intent.amount,
        currency: intent.currency,
      },
    });
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm payment",
      error: error.message,
    });
  }
};

export { createPaymentIntent, confirmPayment };
