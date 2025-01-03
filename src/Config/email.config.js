// // const nodemailer = require('nodemailer');
// import nodemailer from 'nodemailer';
// import { OTP } from "../Models/OTP.js"
// // Generate 6-digit OTP
// const generateOTP = () => {
//     return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Verify OTP
// const verifyOTP = async (email, otp) => {
//     const otpDocument = await OTP.findOne({
//         email,
//         otp,
//         expiresAt: { $gt: new Date() }
//     });

//     return !!otpDocument;
// };

// // Send OTP via email
// const sendOTPEmail = async (email, otp) => {
//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_APP_PASSWORD,
//         }
//     });

//     const mailOptions = {
//         from: process.env.Google_Email,
//         to: email,
//         subject: 'OTP for Placement Portal Registration',
//         text: `Your OTP for registration is ${otp}. It will expire in 10 minutes.`
//     };

//     await transporter.sendMail(mailOptions);
// };


import nodemailer from 'nodemailer';
import { OTP } from "../Models/OTP.js";

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email with enhanced error handling
const sendOTPEmail = async (email, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD || !process.env.EMAIL_USER) {
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
        subject: 'OTP for Placement Portal Registration',
        text: `Your OTP for registration is ${otp}. It will expire in 10 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send OTP email');
    }
};

// Verify OTP with enhanced error handling
const verifyOTP = async (email, otp) => {
    try {
        const otpDocument = await OTP.findOne({
            email,
            otp,
            expiresAt: { $gt: new Date() }
        });
        return !!otpDocument;
    } catch (error) {
        console.error('OTP verification failed:', error);
        throw new Error('Failed to verify OTP');
    }
};

export {
    generateOTP,
    verifyOTP,
    sendOTPEmail,
    isValidEmail
};