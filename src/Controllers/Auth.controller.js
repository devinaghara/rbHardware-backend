import User from "../Models/User.js";
import validator from "validator";
import { sendOTPEmail, generateOTP, verifyOTP, isValidEmail } from "../Config/email.config.js"
import { OTP } from "../Models/OTP.js";
import crypto from "crypto";
import { ResetPasswordEmail } from "../Config/resetPasswordEmail.js";

const getUser = async (req, res) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            res.status(200).json({ user });
        }
        else {
            res.status(401).json({ message: "Unauthorized" });
        }

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

const CreateUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email", success: false });
        }
        const lowercaseEmail = email.toLowerCase();
        if (password.length < 6) {
            return res.status(400).json({ message: "Password length should be greater than 6", success: false });
        }
        const existingUser = await User.findOne({ email: lowercaseEmail });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists", success: false });
        }
        const user = await User.create({ name: name, email: lowercaseEmail, password });

        // Store essential user data in session
        req.session.user = {
            _id: user._id,
            email: user.email
        };

        // Save session explicitly
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                resolve();
            });
        });

        console.log('Session after registration:', req.session); // Debug log
        res.status(201).json({ user });
    } catch (err) {
        console.error('Registration error:', err); // Debug log
        res.status(400).json({ message: err.message, success: false });
    }
}

// Login user
const LoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        
        // Find the user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check if password matches
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Transfer session cart items to user's cart if they exist
        if (req.session.cart && req.session.cart.items && req.session.cart.items.length > 0) {
            // Add each session cart item to user's cart
            for (const item of req.session.cart.items) {
                await user.addToCart({
                    productId: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image,
                    color: item.color,
                    size: item.size
                });
            }
            
            // Clear session cart after transfer
            req.session.cart = { items: [] };
        }
        
        // Set user in session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        // Save session
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
            }
        });
        
        // Remove password from response
        user.password = undefined;
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Logout user
const logOut = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Logout failed',
                    error: err.message
                });
            }
            
            res.clearCookie('connect.sid'); // Adjust cookie name based on your session config
            
            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const userId = req.session.user;

        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized", success: false });
        }

        // Validate email if provided
        if (email) {
            if (!validator.isEmail(email)) {
                return res.status(400).json({ message: "Invalid email", success: false });
            }

            // Check if new email already exists for another user
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: userId } // exclude current user
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Email already in use by another account",
                    success: false
                });
            }
        }

        // Validate phone if provided
        if (phone && !validator.isMobilePhone(phone)) {
            return res.status(400).json({
                message: "Invalid phone number",
                success: false
            });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                ...(name && { name }),
                ...(email && { email: email.toLowerCase() }),
                ...(phone && { phone })
            },
            {
                new: true,
                select: '-password' // Exclude password from the response
            }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser,
            success: true
        });

    } catch (err) {
        res.status(400).json({
            message: err.message,
            success: false
        });
    }
};

export const authVerifyController = {
    async sendOTP(req, res) {
        try {
            const { email } = req.body;

            // Validate request
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }

            // Check for existing non-expired OTP
            const existingOTP = await OTP.findOne({
                email,
                expiresAt: { $gt: new Date() }
            });

            if (existingOTP) {
                return res.status(400).json({
                    error: 'An OTP has already been sent. Please wait before requesting a new one.'
                });
            }

            const otp = generateOTP();

            // Save OTP to database
            await OTP.create({
                email,
                otp,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
            });

            await sendOTPEmail(email, otp);

            res.status(200).json({
                message: 'OTP sent successfully',
                expiresIn: '10 minutes'
            });

        } catch (error) {
            console.error('OTP sending error:', error);

            // Send appropriate error message based on the error type
            const errorMessage = error.message === 'Failed to send OTP email'
                ? 'Failed to send OTP email. Please try again later.'
                : 'An error occurred while processing your request';

            res.status(500).json({ error: errorMessage });
        }
    },

    async verifyOTPHandler(req, res) {
        try {
            const { email, otp } = req.body;
            const isValid = await verifyOTP(email, otp);

            if (!isValid) {
                return res.status(400).json({ error: 'Invalid or expired OTP' });
            }

            await OTP.deleteOne({ email, otp });
            res.status(200).json({ message: 'OTP verified successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');
            user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

            await user.save();

            const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            await ResetPasswordEmail(email, resetUrl);

            res.status(200).json({ message: 'Password reset email sent' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({
                    error: 'Please provide both token and new password'
                });
            }

            // Hash the token from the URL to compare with stored hash
            const resetPasswordToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // Find user with valid token
            const user = await User.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({
                    error: 'Invalid or expired reset token. Please request a new password reset.'
                });
            }

            // Set new password and clear reset token fields
            user.password = newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save();

            res.status(200).json({
                success: true,
                message: 'Password reset successful. You can now login with your new password.'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                error: 'An error occurred while resetting your password. Please try again.'
            });
        }
    }
};

// Get profile information
const getProfile = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false
            });
        }

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        res.status(200).json({
            user,
            success: true
        });

    } catch (err) {
        res.status(400).json({
            message: err.message,
            success: false
        });
    }
};

export {
    CreateUser,
    LoginUser,
    getUser,
    logOut,
    updateProfile,
    getProfile
};