import User from '../Models/User.js';

/**
 * Middleware to check if the authenticated user is an admin.
 * Supports both session-based and Passport-based authentication.
 */
export const isAdmin = async (req, res, next) => {
    try {
        // Get userId from session or Passport
        const userId = req.session?.user?._id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        // Fetch user from database to get up-to-date role information
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        // Check if user is an admin
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }
        
        // User is admin, continue
        next();
    } catch (error) {
        console.error("Admin authorization error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during authorization check"
        });
    }
};