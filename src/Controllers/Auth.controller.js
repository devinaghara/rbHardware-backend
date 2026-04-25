import User from "../Models/User.js";
import validator from "validator";
import {
  sendOTPEmail,
  generateOTP,
  hashOTP,
  verifyOTP,
  isValidEmail,
} from "../Config/email.config.js";
import { OTP } from "../Models/OTP.js";
import crypto from "crypto";
import { ResetPasswordEmail } from "../Config/resetPasswordEmail.js";

// ─── Helper: save session as a proper Promise ────────────────────────────────
const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

// ─── Helper: sanitize text input ─────────────────────────────────────────────
const sanitizeName = (name) => {
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return null;
  return trimmed;
};

// ─── GET /auth/me — Check current session ────────────────────────────────────
const getUser = async (req, res) => {
  try {
    // Check Passport-authenticated user (Google OAuth)
    if (req.user) {
      return res.status(200).json({ user: req.user });
    }

    // Check session-authenticated user (email/password login)
    if (req.session?.user?._id) {
      const user = await User.findById(req.session.user._id).select("-password");
      if (user) {
        return res.status(200).json({ user });
      }
    }

    return res.status(401).json({ message: "Unauthorized" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── POST /auth/sign-up — Register a new user ───────────────────────────────
const CreateUser = async (req, res) => {
  try {
    const { name, email, password, otpToken } = req.body;

    // Validate name
    const cleanName = sanitizeName(name);
    if (!cleanName) {
      return res.status(400).json({
        message: "Name must be 2-50 characters",
        success: false,
      });
    }

    // Validate email
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        message: "Valid email is required",
        success: false,
      });
    }

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
        success: false,
      });
    }

    const lowercaseEmail = email.toLowerCase();

    // Verify OTP token — signup requires a verified OTP
    if (!otpToken) {
      return res.status(400).json({
        message: "Email verification is required",
        success: false,
      });
    }

    // Validate the OTP token
    const isOTPValid = await verifyOTP(lowercaseEmail, otpToken);
    if (!isOTPValid) {
      return res.status(400).json({
        message: "Invalid or expired verification code",
        success: false,
      });
    }

    // Delete all OTPs for this email — they're consumed after verification
    await OTP.deleteMany({ email: lowercaseEmail });

    // Check if user already exists
    const existingUser = await User.findOne({ email: lowercaseEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
        success: false,
      });
    }

    // Create user
    const user = await User.create({
      name: cleanName,
      email: lowercaseEmail,
      password,
      isVerified: true,
    });

    // Store session — include all fields needed by middleware
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    await saveSession(req);

    // Return user WITHOUT password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ user: userResponse, success: true });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(400).json({ message: err.message, success: false });
  }
};

// ─── POST /auth/login — Email/password login ─────────────────────────────────
const LoginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find the user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Don't reveal whether email exists — use same message for both cases
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Google-only accounts don't have a password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google login. Please sign in with Google.",
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Transfer session cart items to user's cart if they exist
    if (
      req.session.cart &&
      req.session.cart.items &&
      req.session.cart.items.length > 0
    ) {
      for (const item of req.session.cart.items) {
        await user.addToCart({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          color: item.color,
          size: item.size,
        });
      }

      // Clear session cart after transfer
      req.session.cart = { items: [] };
    }

    // Set user in session — include all fields needed by middleware
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Wait for session save before responding
    await saveSession(req);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ─── GET /auth/logout — Destroy session ──────────────────────────────────────
// ✅ Fix — nest destroy() inside logout callback
const logOut = async (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        console.error("Passport logout error:", err);
        return res.status(500).json({ success: false, message: "Logout failed" });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ success: false, message: "Logout failed" });
        }

        res.clearCookie("user", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        return res.status(200).json({ success: true, message: "Logged out successfully" });
      });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

// ─── PUT /auth/update-profile ────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    // Validate name if provided
    if (name !== undefined) {
      const cleanName = sanitizeName(name);
      if (!cleanName) {
        return res.status(400).json({
          message: "Name must be 2-50 characters",
          success: false,
        });
      }
    }

    // Validate email if provided
    if (email) {
      if (!validator.isEmail(email)) {
        return res
          .status(400)
          .json({ message: "Invalid email", success: false });
      }

      // Check if new email already exists for another user
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Email already in use by another account",
          success: false,
        });
      }
    }

    // Validate phone if provided
    if (phone && !validator.isMobilePhone(phone)) {
      return res.status(400).json({
        message: "Invalid phone number",
        success: false,
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(name && { name: sanitizeName(name) }),
        ...(email && { email: email.toLowerCase() }),
        ...(phone && { phone }),
      },
      {
        new: true,
        select: "-password",
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Update session to reflect changes
    req.session.user = {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    };
    await saveSession(req);

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
      success: true,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
      success: false,
    });
  }
};

// ─── OTP & Password Reset ────────────────────────────────────────────────────
export const authVerifyController = {
  // POST /auth/send-otp
  async sendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const lowercaseEmail = email.toLowerCase();

      // Check for existing non-expired OTP (rate limiting)
      const existingOTP = await OTP.findOne({
        email: lowercaseEmail,
        expiresAt: { $gt: new Date() },
      });

      if (existingOTP) {
        return res.status(429).json({
          error:
            "An OTP has already been sent. Please wait before requesting a new one.",
        });
      }

      const otp = generateOTP();
      const hashedOTP = await hashOTP(otp);

      // Save hashed OTP to database — plaintext is never stored
      await OTP.create({
        email: lowercaseEmail,
        otp: hashedOTP,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      await sendOTPEmail(lowercaseEmail, otp);

      res.status(200).json({
        message: "OTP sent successfully",
        expiresIn: "10 minutes",
      });
    } catch (error) {
      console.error("OTP sending error:", error);

      const errorMessage =
        error.message === "Failed to send OTP email"
          ? "Failed to send OTP email. Please try again later."
          : "An error occurred while processing your request";

      res.status(500).json({ error: errorMessage });
    }
  },

  // POST /auth/verify-otp — Verifies OTP and returns the verified OTP token for signup
  async verifyOTPHandler(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required" });
      }

      const lowercaseEmail = email.toLowerCase();
      const isValid = await verifyOTP(lowercaseEmail, otp);

      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Return the OTP as a verification token — signup will validate it again
      res.status(200).json({
        message: "OTP verified successfully",
        otpToken: otp,
      });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  },

  // POST /auth/forgot-password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({
          error: "Valid email is required",
        });
      }

      // Always return the same response to prevent user enumeration
      const genericResponse = {
        message: "If that email exists, a password reset link has been sent",
      };

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Return OK even if user doesn't exist — prevents enumeration
        return res.status(200).json(genericResponse);
      }

      // Google-only accounts can't reset password
      if (!user.password && user.googleId) {
        return res.status(200).json(genericResponse);
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      try {
        await ResetPasswordEmail(user.email, resetUrl);
      } catch (emailError) {
        // Roll back token if email fails
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        return res.status(500).json({
          error: "Failed to send reset email. Please try again.",
        });
      }

      res.status(200).json(genericResponse);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "An error occurred" });
    }
  },

  // POST /auth/reset-password
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: "Please provide both token and new password",
        });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters",
        });
      }

      // Hash the token from the URL to compare with stored hash
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // Find user with valid token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          error:
            "Invalid or expired reset token. Please request a new password reset.",
        });
      }

      // Set new password and clear reset token fields
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save();

      res.status(200).json({
        success: true,
        message:
          "Password reset successful. You can now login with your new password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        error:
          "An error occurred while resetting your password. Please try again.",
      });
    }
  },
};

// ─── GET /auth/get-profile ───────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const userId = req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    res.status(200).json({
      user,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

export { CreateUser, LoginUser, getUser, logOut, updateProfile, getProfile };
