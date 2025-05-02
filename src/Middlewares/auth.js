/**
 * Middleware to check if a user is authenticated
 */
export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // User is authenticated
        next();
    } else {
        // User is not authenticated
        res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }
};