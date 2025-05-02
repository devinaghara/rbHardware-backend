import User from '../Models/User.js';

export const isAdmin = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.session.user || !req.session.user._id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const userId = req.session.user._id;
        
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