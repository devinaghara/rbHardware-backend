import User from "../Models/User.js";
import mongoose from "mongoose";
import crypto from "crypto";

/**
 * Create a new order for the authenticated user
 */
const createOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { 
            items, 
            shippingAddress, 
            paymentMethod, 
            paymentDetails,
            total,
            notes 
        } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Order must contain at least one item"
            });
        }

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                message: "Shipping address is required"
            });
        }

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required"
            });
        }

        if (!total || isNaN(total) || total <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid order total is required"
            });
        }

        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Generate unique order ID (e.g., ORD-YYYYMMDD-XXXX)
        const date = new Date();
        const dateString = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');
        const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
        const orderId = `ORD-${dateString}-${randomPart}`;

        // Calculate estimated delivery (e.g., 5-7 business days from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7); // 7 days from now

        // Create new order object
        const newOrder = {
            orderId,
            items,
            shippingAddress,
            paymentMethod,
            paymentDetails: paymentDetails || {
                id: null,
                status: "Pending",
                method: paymentMethod
            },
            totalAmount: total,  // Use totalAmount for consistency with frontend
            status: "Processing", // Start with Processing status
            statusHistory: [
                {
                    status: "Processing",
                    timestamp: new Date(),
                    comment: "Order placed"
                }
            ],
            estimatedDelivery,
            notes: notes || null,
            createdAt: new Date()
        };

        // Add order to user's orders array
        user.orders.unshift(newOrder); // Add to the beginning of the array
        
        // Clear user's cart after successful order
        user.cart.items = [];
        user.cart.totalAmount = 0;
        user.cart.lastUpdated = new Date();

        // Save user with new order and empty cart
        await user.save();

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order: newOrder
        });

    } catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: error.message
        });
    }
};

/**
 * Get all orders for the authenticated user
 */
const getUserOrders = async (req, res) => {
    try {
        const userId = req.session.user._id;
        
        // Find user and select only the orders field
        const user = await User.findById(userId).select('orders');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            orders: user.orders
        });

    } catch (error) {
        console.error("Get orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve orders",
            error: error.message
        });
    }
};

/**
 * Get a specific order by its ID
 */
const getOrderById = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { orderId } = req.params;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Find the specific order
        const order = user.orders.find(order => 
            order.orderId === orderId || order._id.toString() === orderId
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Get order by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve order",
            error: error.message
        });
    }
};

/**
 * Cancel an order (only if it's in Pending or Processing state)
 */
const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { orderId } = req.params;
        const { reason } = req.body;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Find the specific order
        const orderIndex = user.orders.findIndex(order => 
            order.orderId === orderId || order._id.toString() === orderId
        );

        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const order = user.orders[orderIndex];

        // Check if order can be cancelled
        if (order.status !== 'Pending' && order.status !== 'Processing') {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled in ${order.status} state`
            });
        }

        // Update order status
        order.status = 'Cancelled';
        order.statusHistory.push({
            status: 'Cancelled',
            timestamp: new Date(),
            comment: reason || 'Cancelled by user'
        });

        // Save changes
        await user.save();

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            order
        });

    } catch (error) {
        console.error("Cancel order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel order",
            error: error.message
        });
    }
};

/**
 * Admin-only: Get all orders from all users
 */
const getAllOrders = async (req, res) => {
    try {
        // Since orders are stored in User model, we need to aggregate them
        const users = await User.find({}).select('orders name email phone');
        
        // Extract all orders from all users
        const allOrders = [];
        users.forEach(user => {
            if (user.orders && user.orders.length > 0) {
                // Add user info to each order
                const ordersWithUserInfo = user.orders.map(order => ({
                    ...order.toObject(),
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone
                    }
                }));
                allOrders.push(...ordersWithUserInfo);
            }
        });
        
        // Sort by newest first
        allOrders.sort((a, b) => {
            const dateA = a.createdAt || a.statusHistory[0]?.timestamp || new Date(0);
            const dateB = b.createdAt || b.statusHistory[0]?.timestamp || new Date(0);
            return dateB - dateA;
        });
        
        res.status(200).json({
            success: true,
            orders: allOrders
        });
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch orders', 
            error: error.message 
        });
    }
};

/**
 * Admin-only: Update order status
 */
const updateOrderStatus = async (req, res) => {
    try {
        const { userId, orderId } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        // Check if status is valid
        const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Find the order in the user's orders array
        const orderIndex = user.orders.findIndex(order => 
            order.orderId === orderId || order._id.toString() === orderId
        );
        
        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Get the order
        const order = user.orders[orderIndex];
        
        // Update the order status
        order.status = status;
        
        // Add to status history
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            comment: `Status updated to ${status} by admin`
        });
        
        // Save the changes
        await user.save();
        
        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

export {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    getAllOrders,
    updateOrderStatus
};