import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OTP } from "../Models/OTP.js";

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Generate cryptographically secure 6-digit OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// Hash OTP before storing in database
const hashOTP = async (otp) => {
    return await bcrypt.hash(otp, 10);
};

// Send OTP via email with enhanced error handling
const sendOTPEmail = async (email, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error('Email configuration environment variables are missing');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email — RB Hardware',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>Email Verification</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;">
                ${otp}
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send OTP email');
    }
};

// Verify OTP — compare plaintext input against hashed DB value
const verifyOTP = async (email, otp) => {
    try {
        // Find all non-expired OTPs for this email (should be just 1 due to rate limiting)
        const otpDocuments = await OTP.find({
            email: email.toLowerCase(),
            expiresAt: { $gt: new Date() }
        });

        // Compare against each (handles edge case of multiple OTPs)
        for (const doc of otpDocuments) {
            const isMatch = await bcrypt.compare(otp, doc.otp);
            if (isMatch) return true;
        }

        return false;
    } catch (error) {
        console.error('OTP verification failed:', error);
        throw new Error('Failed to verify OTP');
    }
};

export {
    generateOTP,
    hashOTP,
    verifyOTP,
    sendOTPEmail,
    isValidEmail
};