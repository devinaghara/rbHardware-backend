import User from '../Models/User.js';

export const cartController = {
    // Get cart items
    getCart: async (req, res, next) => {
        try {
            let cart;
            
            if (req.user) {
                // Authenticated user - get cart from user document
                cart = req.user.cart;
            } else {
                // Guest user - get cart from session
                if (!req.session.cart) {
                    req.session.cart = { items: [], totalAmount: 0 };
                }
                cart = req.session.cart;
            }
            
            res.status(200).json({
                success: true,
                cart
            });
        } catch (error) {
            console.error(`Failed to fetch cart items:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cart items'
            });
        }
    },

    // Add item to cart
    addToCart: async (req, res, next) => {
        try {
            const { productId, name, price, quantity, image, color, size } = req.body;
            
            if (!productId || !name || !price || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }
            
            const cartItem = {
                productId,
                name,
                price,
                quantity,
                image,
                color: color || null,
                size: size || null
            };
            
            let cart;
            
            if (req.user) {
                // Authenticated user - add to user's cart
                await req.user.addToCart(cartItem);
                const updatedUser = await User.findById(req.user._id);
                cart = updatedUser.cart;
            } else {
                // Guest user - add to session cart
                if (!req.session.cart) {
                    req.session.cart = { items: [] };
                }
                
                // Create item with unique ID
                const sessionCartItem = {
                    _id: new Date().getTime().toString(),
                    ...cartItem
                };
                
                // Check if item already exists
                const existingItemIndex = req.session.cart.items.findIndex(
                    item => item.productId === productId && 
                           item.color === (color || null) && 
                           item.size === (size || null)
                );
                
                if (existingItemIndex > -1) {
                    // Update quantity if item exists
                    req.session.cart.items[existingItemIndex].quantity += quantity;
                } else {
                    // Add new item to cart
                    req.session.cart.items.push(sessionCartItem);
                }
                
                // Calculate total amount - now done on the frontend
                req.session.cart.totalAmount = req.session.cart.items.reduce(
                    (total, item) => total + (item.price * item.quantity), 0
                );
                
                await saveSession(req);
                cart = req.session.cart;
            }
            
            res.status(200).json({
                success: true,
                message: 'Item added to cart',
                cart
            });
        } catch (error) {
            console.error(`Failed to add item to cart:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to add item to cart'
            });
        }
    },

    // Update cart item quantity
    updateCartItem: async (req, res, next) => {
        try {
            const { itemId, quantity } = req.body;
            
            if (!itemId || !quantity || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid item ID or quantity'
                });
            }
            
            let cart;
            
            if (req.user) {
                // Authenticated user - update user's cart item
                const cartItemIndex = req.user.cart.items.findIndex(
                    item => item._id.toString() === itemId
                );
                
                if (cartItemIndex === -1) {
                    return res.status(404).json({
                        success: false,
                        message: 'Item not found in cart'
                    });
                }
                
                req.user.cart.items[cartItemIndex].quantity = quantity;
                await req.user.save();
                cart = req.user.cart;
            } else {
                // Guest user - update session cart item
                if (!req.session.cart || !req.session.cart.items) {
                    return res.status(404).json({
                        success: false,
                        message: 'Cart not found'
                    });
                }
                
                const cartItemIndex = req.session.cart.items.findIndex(
                    item => item._id === itemId
                );
                
                if (cartItemIndex === -1) {
                    return res.status(404).json({
                        success: false,
                        message: 'Item not found in cart'
                    });
                }
                
                req.session.cart.items[cartItemIndex].quantity = quantity;
                req.session.cart.totalAmount = req.session.cart.items.reduce(
                    (total, item) => total + (item.price * item.quantity), 0
                );
                
                await saveSession(req);
                cart = req.session.cart;
            }
            
            res.status(200).json({
                success: true,
                message: 'Cart item updated',
                cart
            });
        } catch (error) {
            console.error(`Failed to update cart item:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to update cart item'
            });
        }
    },
                             
    // Remove item from cart
    removeFromCart: async (req, res, next) => {
        try {
            const { itemId } = req.params;
            
            if (!itemId) {
                return res.status(400).json({
                    success: false,
                    message: 'Item ID is required'
                });
            }
            
            let cart;
            
            if (req.user) {
                // Authenticated user - remove from user's cart
                await req.user.removeFromCart(itemId);
                const updatedUser = await User.findById(req.user._id);
                cart = updatedUser.cart;
            } else {
                // Guest user - remove from session cart
                if (!req.session.cart || !req.session.cart.items) {
                    return res.status(404).json({
                        success: false,
                        message: 'Cart not found'
                    });
                }
                
                req.session.cart.items = req.session.cart.items.filter(
                    item => item._id !== itemId
                );
                
                req.session.cart.totalAmount = req.session.cart.items.reduce(
                    (total, item) => total + (item.price * item.quantity), 0
                );
                
                await saveSession(req);
                cart = req.session.cart;
            }
            
            res.status(200).json({
                success: true,
                message: 'Item removed from cart',
                cart
            });
        } catch (error) {
            console.error(`Failed to remove item from cart:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove item from cart'
            });
        }
    },

    // Clear entire cart
    clearCart: async (req, res, next) => {
        try {
            let cart;
            
            if (req.user) {
                // Authenticated user - clear user's cart
                req.user.cart.items = [];
                await req.user.save();
                cart = req.user.cart;
            } else {
                // Guest user - clear session cart
                req.session.cart = { items: [], totalAmount: 0 };
                await saveSession(req);
                cart = req.session.cart;
            }
            
            res.status(200).json({
                success: true,
                message: 'Cart cleared successfully',
                cart
            });
        } catch (error) {
            console.error(`Failed to clear cart:`, error);
            res.status(500).json({
                success: false,
                message: 'Failed to clear cart'
            });
        }
    }
};

// Helper function to save session as a promise
function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save(err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// Export individual controller functions
export const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = cartController;