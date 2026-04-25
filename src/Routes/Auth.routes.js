import { Router } from "express";
import {
  CreateUser,
  getProfile,
  getUser,
  LoginUser,
  logOut,
  updateProfile,
  authVerifyController,
} from "../Controllers/Auth.controller.js";
import { isAuthenticated } from "../Middlewares/auth.js";
import passport from "passport";

const router = Router();

// ─── Public routes ───────────────────────────────────────────────────────────
router.post("/sign-up", CreateUser);
router.post("/login", LoginUser);
router.get("/logout", logOut);
router.get("/me", getUser);

// ─── OTP & Password Reset (public) ──────────────────────────────────────────
router.post("/send-otp", authVerifyController.sendOTP);
router.post("/verify-otp", authVerifyController.verifyOTPHandler);
router.post("/forgot-password", authVerifyController.forgotPassword);
router.post("/reset-password", authVerifyController.resetPassword);

// ─── Protected routes ────────────────────────────────────────────────────────
router.put("/update-profile", isAuthenticated, updateProfile);
router.get("/get-profile", isAuthenticated, getProfile);

// ─── Google OAuth ────────────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login/failed",
  }),
  (req, res) => {
    // After successful Google auth, also set session.user for consistency
    if (req.user) {
      req.session.user = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      };
      req.session.save((err) => {
        if (err) console.error("Session save error after Google auth:", err);
      });
    }

    // Redirect to frontend — use env var, not hardcoded localhost
    res.redirect(`${process.env.FRONTEND_URL}/login-success`);
  }
);

router.get("/login/success", (req, res) => {
  // Check both Passport user and session user
  const user = req.user || null;

  if (!user && req.session?.user?._id) {
    // Session-based user — already handled by getUser, but for Google success page:
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: req.session.user,
    });
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  res.status(200).json({
    success: true,
    message: "Login successful",
    user,
  });
});

router.get("/login/failed", (req, res) => {
  res.status(401).json({
    success: false,
    message: "Login failed",
  });
});

export default router;
