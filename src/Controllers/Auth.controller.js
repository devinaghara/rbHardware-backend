import User from "../Models/User.js";
import validator from "validator";

// const CreateUser = async (req, res) => {
//     try {
//         const { name, email, password } = req.body;
//         if (!validator.isEmail(email)) {
//             return res.status(400).json({ message: "Invalid email", success: false });
//         }
//         const lowercaseEmail = email.toLowerCase();
//         if (password.length < 6) {
//             return res.status(400).json({ message: "Password length should be greater than 6", success: false });
//         }
//         const existingUser = await User.findOne({ email: lowercaseEmail });
//         if (existingUser) {
//             return res.status(400).json({ message: "User already exists", success: false });
//         }
//         const user = await User.create({ name: name, email: lowercaseEmail, password });
//         req.session.user = user._id;
//         res.status(201).json({ user });
//     } catch (err) {
//         res.status(400).json({ message: err.message });
//     }
// }

// const LoginUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email: email });
//         if (!user) {
//             return res.status(400).json({ message: "Invalid credentials", success: false });
//         }
//         const isPasswordCorrect = await user.comparePassword(password);
//         if (!isPasswordCorrect) {
//             return res.status(400).json({ message: "Invalid credentials", success: false });
//         }
//         req.session.user = user._id;
//         res.status(200).json({ user });
//     }
//     catch (err) {
//         res.status(400).json({ message: err.message });
//     }
// }

// const logOut = async (req, res) => {
//     try {
//         console.log('Session at logout:', req.session); // Debug log
//         console.log('Session ID:', req.sessionID); // Debug log

//         // More permissive session check
//         if (!req.session) {
//             return res.status(401).json({
//                 message: "Session not initialized",
//                 success: false
//             });
//         }

//         // Destroy session even if user ID is not present
//         req.session.destroy((err) => {
//             if (err) {
//                 console.error('Session destruction error:', err); // Debug log
//                 return res.status(500).json({
//                     message: "Error during logout",
//                     error: err.message,
//                     success: false
//                 });
//             }

//             // Clear session cookie
//             res.clearCookie('connect.sid', {
//                 path: '/',
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === 'production',
//                 sameSite: 'strict'
//             });

//             return res.status(200).json({
//                 message: "Logged out successfully",
//                 success: true
//             });
//         });

//     } catch (error) {
//         console.error('Logout error:', error); // Debug log
//         return res.status(500).json({
//             error: error.message,
//             success: false
//         });
//     }
// };

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

const LoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ 
                message: "User not found", 
                success: false 
            });
        }

        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ 
                message: "Invalid password", 
                success: false 
            });
        }

        // Store essential user data in session
        req.session.user = {
            _id: user._id,
            email: user.email,
            name: user.name
        };

        // Save session explicitly
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                resolve();
            });
        });

        console.log('Session after login:', req.session); // Debug log
        console.log('Session ID:', req.sessionID); // Debug log

        res.status(200).json({ 
            message: "Login successful",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            },
            success: true 
        });
    }
    catch (err) {
        console.error('Login error:', err); // Debug log
        res.status(500).json({ 
            message: err.message, 
            success: false 
        });
    }
}

const logOut = async (req, res) => {
    try {
        console.log('Session at logout:', req.session); // Debug log
        console.log('Session ID:', req.sessionID); // Debug log

        if (!req.session) {
            return res.status(401).json({
                message: "Session not initialized",
                success: false
            });
        }

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err); // Debug log
                return res.status(500).json({
                    message: "Error during logout",
                    error: err.message,
                    success: false
                });
            }

            // Clear session cookie with secure options
            res.clearCookie('connect.sid', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            return res.status(200).json({
                message: "Logged out successfully",
                success: true
            });
        });

    } catch (error) {
        console.error('Logout error:', error); // Debug log
        return res.status(500).json({
            error: error.message,
            success: false
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