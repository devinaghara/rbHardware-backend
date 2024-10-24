import User from "../Models/User.js";
import validator from "validator";

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
        req.session.user = user._id;
        res.status(201).json({ user });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

const LoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials", success: false });
        }
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials", success: false });
        }
        req.session.user = user._id;
        res.status(200).json({ user });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
}

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

const logOut = async (req, res) => {
    try {
        req.session.destroy();
        res.clearCookie('user', {
            path: '/',                         // Match the session cookie path
            httpOnly: true,                    // Ensure cookie is inaccessible via client-side JS
            secure: process.env.NODE_ENV === 'production',  // Only use secure in production
            sameSite: 'strict',                // SameSite flag to prevent CSRF
        })
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

export { CreateUser, LoginUser, getUser, logOut };