import User from '../Models/User.js';

// Middleware to protect routes using session authentication
export const protect = async (req, res, next) => {
    try {
        // Check if user exists in session
        if (!req.session || !req.session.user) {
            return res.status(401).json({ 
                message: "Not authorized, please login", 
                success: false 
            });
        }
        
        // Extract user ID based on your session structure
        const userId = req.session.user._id || req.session.user;
        
        if (!userId) {
            return res.status(401).json({ 
                message: "Invalid session, please login again", 
                success: false 
            });
        }
        
        // Find user by id to verify they still exist in database
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            // Clear invalid session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
            });
            
            return res.status(401).json({ 
                message: "User not found or deleted", 
                success: false 
            });
        }
        
        // Attach complete user object to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ 
            message: "Authentication failed", 
            success: false 
        });
    }
};

// Admin only middleware
export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            message: "Not authorized as admin", 
            success: false 
        });
    }
};

// Optional middleware for cart routes that allows guest users
export const optionalAuth = async (req, res, next) => {
    try {
        // If no session or user in session, create guest cart in session
        if (!req.session) {
            req.session = {};
        }
        
        if (!req.session.user) {
            // Initialize cart in session if it doesn't exist
            if (!req.session.cart) {
                req.session.cart = { items: [] };
            }
            // Continue as guest user
            return next();
        }
        
        // Otherwise, behave like protect middleware
        const userId = req.session.user._id || req.session.user;
        
        if (!userId) {
            // Initialize cart in session if it doesn't exist
            if (!req.session.cart) {
                req.session.cart = { items: [] };
            }
            return next();
        }
        
        // Find user by id
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            // Clear invalid session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
            });
            
            // Initialize new session with cart
            req.session = { cart: { items: [] } };
            return next();
        }
        
        // Attach user object to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        // Initialize cart in session if error occurs
        if (!req.session) {
            req.session = {};
        }
        if (!req.session.cart) {
            req.session.cart = { items: [] };
        }
        next();
    }
};