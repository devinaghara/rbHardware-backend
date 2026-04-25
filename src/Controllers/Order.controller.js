import User from "../Models/User.js";
import Product from "../Models/Product.js";
import Order from "../Models/Order.js";
import crypto from "crypto";

/**
 * Valid status transitions — enforced as a state machine.
 * Terminal states (Delivered, Cancelled) allow no further transitions.
 */
const VALID_STATUS_TRANSITIONS = {
  Pending: ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["In Transit", "Cancelled"],
  "In Transit": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

/**
 * Safely checks if a string is a valid MongoDB ObjectId
 */
const isValidObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(str);

/**
 * Sanitize free-text input: trim whitespace, enforce max length
 */
const sanitizeText = (text, maxLength = 500) => {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
};

/**
 * Create a new order for the authenticated user
 *
 * Security:
 * - Items and prices are read from the database, NOT from req.body.
 * - Products with isOrderable=false are rejected.
 * - Payment must be confirmed before order creation.
 * - Notes are sanitized.
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      shippingAddress,
      paymentMethod,
      paymentDetails,
      notes,
      paymentIntentId,
    } = req.body;

    // Validate required fields
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // Validate shipping address fields
    const requiredAddressFields = ["name", "phone", "street", "city", "state", "zipCode"];
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field] || typeof shippingAddress[field] !== "string" || !shippingAddress[field].trim()) {
        return res.status(400).json({
          success: false,
          message: `Shipping address field "${field}" is required`,
        });
      }
    }

    // Find user with their cart
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Use cart items from the database — NOT from req.body
    const cartItems = user.cart.items;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty. Add items before placing an order.",
      });
    }

    // Collect all unique variant IDs from cart — these are linkedProduct subdocument _ids
    const variantIds = [...new Set(cartItems.map((item) => item.productId.toString()))];

    // Fetch all referenced products by variant subdocument ID
    const products = await Product.find({
      "linkedProducts._id": { $in: variantIds },
    });

    // Build a lookup map: variantId -> { product, variant }
    const variantMap = {};
    products.forEach((product) => {
      product.linkedProducts.forEach((lp) => {
        if (variantIds.includes(lp._id.toString())) {
          variantMap[lp._id.toString()] = { product, variant: lp };
        }
      });
    });

    // Verify each cart item's price and orderability against the Product collection
    const verifiedOrderItems = [];
    let serverCalculatedTotal = 0;

    for (const cartItem of cartItems) {
      const entry = variantMap[cartItem.productId.toString()];

      if (!entry) {
        return res.status(400).json({
          success: false,
          message: `Product "${cartItem.name}" is no longer available. Please remove it from your cart.`,
        });
      }

      // Check if product is orderable
      if (!entry.product.isOrderable) {
        return res.status(400).json({
          success: false,
          message: `"${cartItem.name}" is currently not available for ordering. Please remove it from your cart.`,
        });
      }

      const matchedVariant = entry.variant;

      // Use the VERIFIED price from the database, not the cart/frontend price
      const verifiedPrice = matchedVariant.price;

      verifiedOrderItems.push({
        productId: cartItem.productId,
        name: matchedVariant.name,
        price: verifiedPrice,
        quantity: cartItem.quantity,
        image: cartItem.image || (matchedVariant.images.length > 0 ? matchedVariant.images[0] : null),
        color: cartItem.color || matchedVariant.color || null,
        size: cartItem.size || null,
      });

      serverCalculatedTotal += verifiedPrice * cartItem.quantity;
    }

    if (serverCalculatedTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order total must be greater than zero",
      });
    }

    // Generate unique order ID (e.g., ORD-YYYYMMDD-XXXX)
    const date = new Date();
    const dateString =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0");
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderId = `ORD-${dateString}-${randomPart}`;

    // Calculate estimated delivery (7 days from now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    // Sanitize notes
    const sanitizedNotes = sanitizeText(notes);

    // Build payment details
    const orderPaymentDetails = {
      id: paymentIntentId || null,
      status: paymentIntentId ? "Paid" : "Pending",
      method: paymentMethod,
    };

    // Create new order document in the standalone Order collection
    const newOrder = await Order.create({
      userId,
      orderId,
      items: verifiedOrderItems,
      shippingAddress: {
        type: shippingAddress.type || "Home",
        name: shippingAddress.name.trim(),
        phone: shippingAddress.phone.trim(),
        street: shippingAddress.street.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        zipCode: shippingAddress.zipCode.trim(),
        isDefault: shippingAddress.isDefault || false,
      },
      paymentMethod,
      paymentDetails: orderPaymentDetails,
      total: serverCalculatedTotal,
      status: "Processing",
      statusHistory: [
        {
          status: "Processing",
          timestamp: new Date(),
          comment: "Order placed successfully",
        },
      ],
      estimatedDelivery,
      notes: sanitizedNotes,
    });

    // Clear user's cart after successful order
    user.cart.items = [];
    user.cart.totalAmount = 0;
    user.cart.lastUpdated = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/**
 * Get all orders for the authenticated user
 * Security: Only returns orders belonging to the logged-in user
 */
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
      error: error.message,
    });
  }
};

/**
 * Get a specific order by its ID
 * Security: Scoped to the authenticated user — users can only see their own orders
 */
const getOrderById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Build a safe query — avoid passing undefined into $or
    const query = { userId };
    if (isValidObjectId(orderId)) {
      query.$or = [{ orderId }, { _id: orderId }];
    } else {
      query.orderId = orderId;
    }

    const order = await Order.findOne(query).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve order",
      error: error.message,
    });
  }
};

/**
 * Cancel an order (only if it's in Pending or Processing state)
 * Security: Scoped to the authenticated user
 */
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Build a safe query
    const query = { userId };
    if (isValidObjectId(orderId)) {
      query.$or = [{ orderId }, { _id: orderId }];
    } else {
      query.orderId = orderId;
    }

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Use state machine to validate cancellation
    const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes("Cancelled")) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in "${order.status}" state`,
      });
    }

    // Update order status
    order.status = "Cancelled";
    order.statusHistory.push({
      status: "Cancelled",
      timestamp: new Date(),
      comment: sanitizeText(reason) || "Cancelled by user",
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

/**
 * Admin-only: Get all orders from all users
 */
const getAllOrders = async (req, res) => {
  try {
    const allOrders = await Order.find({})
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    // Map userId field to user for frontend compatibility
    const ordersWithUserInfo = allOrders.map((order) => ({
      ...order,
      user: order.userId,
      userId: order.userId?._id,
    }));

    res.status(200).json({
      success: true,
      orders: ordersWithUserInfo,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

/**
 * Admin-only: Get a specific order with full details
 */
const getOrderByIdAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Build a safe query — no user scoping for admin
    let query = {};
    if (isValidObjectId(orderId)) {
      query.$or = [{ orderId }, { _id: orderId }];
    } else {
      query.orderId = orderId;
    }

    const order = await Order.findOne(query)
      .populate("userId", "name email phone profilePicture")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order: {
        ...order,
        user: order.userId,
        userId: order.userId?._id,
      },
    });
  } catch (error) {
    console.error("Admin get order by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve order",
      error: error.message,
    });
  }
};

/**
 * Admin-only: Update order status with state machine validation
 * Also supports updating trackingNumber, estimatedDelivery, and adding comments
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, estimatedDelivery, comment } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Check if status is a recognized value
    const allStatuses = Object.keys(VALID_STATUS_TRANSITIONS);
    if (!allStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Valid statuses: ${allStatuses.join(", ")}`,
      });
    }

    // Find the order
    let query = {};
    if (isValidObjectId(orderId)) {
      query.$or = [{ _id: orderId }, { orderId }];
    } else {
      query.orderId = orderId;
    }

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Validate status transition using the state machine
    const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from "${order.status}" to "${status}". Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "none (terminal state)"}`,
      });
    }

    // Update the order status
    order.status = status;

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      comment: sanitizeText(comment) || `Status updated to ${status} by admin`,
    });

    // Update tracking number if provided
    if (trackingNumber !== undefined) {
      order.trackingNumber = sanitizeText(trackingNumber, 100);
    }

    // Update estimated delivery if provided
    if (estimatedDelivery) {
      const parsedDate = new Date(estimatedDelivery);
      if (!isNaN(parsedDate.getTime())) {
        order.estimatedDelivery = parsedDate;
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

export {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  getOrderByIdAdmin,
  updateOrderStatus,
};
