/**
 * Middleware to check if a user is authenticated.
 * Supports both session-based (email/password) and Passport-based (Google OAuth) authentication.
 * 
 * IMPORTANT: This middleware normalizes req.user so that ALL controllers
 * can consistently use req.user._id regardless of auth method.
 */
export const isAuthenticated = (req, res, next) => {
    // Passport-based (Google OAuth) — req.user is already set by passport.deserializeUser
    if (req.user) {
        // Sync to session for consistency (in case session.user is missing)
        if (req.session && !req.session.user) {
            req.session.user = {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
            };
        }
        return next();
    }

    // Session-based (email/password login)
    if (req.session && req.session.user) {
        // Set req.user from session so controllers can always use req.user
        req.user = req.session.user;
        return next();
    }

    res.status(401).json({
        success: false,
        message: "Authentication required"
    });
};