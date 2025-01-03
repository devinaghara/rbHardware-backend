import nodemailer from 'nodemailer';

export const ResetPasswordEmail = (email, link) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // Set your email service provider (e.g., Gmail, Outlook)
        auth: {
            user: process.env.EMAIL_USER, // Email address from environment variable
            pass: process.env.EMAIL_APP_PASSWORD, // Password or app-specific password from environment variable
        },
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset Password",
        html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${link}">${link}</a>
        `,
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log("Error sending email:", err);
        } else {
            console.log("Email sent successfully:", info.response);
        }
    });
}


