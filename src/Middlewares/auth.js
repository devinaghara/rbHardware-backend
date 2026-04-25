/**
 * Middleware to check if a user is authenticated.
 * Supports both session-based (email/password) and Passport-based (Google OAuth) authentication.
 */
export const isAuthenticated = (req, res, next) => {
    if ((req.session && req.session.user) || req.user) {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }
};