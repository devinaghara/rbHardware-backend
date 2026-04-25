import nodemailer from 'nodemailer';

/**
 * Send password reset email.
 * Returns a Promise so the caller can properly await and handle errors.
 */
export const ResetPasswordEmail = async (email, link) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error('Email configuration environment variables are missing');
    }

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset Your Password — RB Hardware",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Click the button below to reset your password. This link expires in 10 minutes.</p>
            <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Reset Password
            </a>
            <p style="margin-top: 16px; color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending reset password email:', error);
        throw new Error('Failed to send password reset email');
    }
};
