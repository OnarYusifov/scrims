import nodemailer from "nodemailer";

// Helper function to get frontend URL from env ports
function getFrontendUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const port = Number(process.env.FRONTEND_PORT);
  if (!port) throw new Error("FRONTEND_PORT must be set in root .env file");
  return `http://localhost:${port}`;
}

// Create reusable transporter using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "mail.spacemail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === "true" || true, // Default to true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export interface SendVerificationEmailParams {
  email: string;
  username: string;
  verificationCode: string;
}

export interface SendLoginOTPParams {
  email: string;
  username: string;
  loginCode: string;
}

export interface SendPasswordResetOTPParams {
  email: string;
  username: string;
  resetCode: string;
}

export const sendVerificationEmail = async ({
  email,
  username,
  verificationCode,
}: SendVerificationEmailParams): Promise<void> => {
  const transporter = createTransporter();
  const baseUrl = getFrontendUrl();
  const verificationUrl = `${baseUrl}/verify-email`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verify your email address",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h1 style="color: #333; margin-top: 0;">Verify Your Email Address</h1>
            <p>Hi ${username},</p>
            <p>Thank you for registering! Please use the following verification code to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #ffffff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; display: inline-block;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff; font-family: 'Courier New', monospace;">
                  ${verificationCode}
                </div>
              </div>
            </div>
            <p style="text-align: center; margin-top: 20px;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Verification Page
              </a>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
              This verification code will expire in 15 minutes. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hi ${username},
      
      Thank you for registering! Please use the following verification code to verify your email address:
      
      Verification Code: ${verificationCode}
      
      Visit ${verificationUrl} to enter this code.
      
      This verification code will expire in 15 minutes. If you didn't create an account, please ignore this email.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

export const sendLoginOTP = async ({
  email,
  username,
  loginCode,
}: SendLoginOTPParams): Promise<void> => {
  const transporter = createTransporter();
  const baseUrl = getFrontendUrl();
  const loginUrl = `${baseUrl}/verify-email?type=login`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your login verification code",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h1 style="color: #333; margin-top: 0;">Login Verification Code</h1>
            <p>Hi ${username},</p>
            <p>You requested to sign in to your account. Please use the following verification code to complete your login:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #ffffff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; display: inline-block;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff; font-family: 'Courier New', monospace;">
                  ${loginCode}
                </div>
              </div>
            </div>
            <p style="text-align: center; margin-top: 20px;">
              <a href="${loginUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Verification Page
              </a>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
              This verification code will expire in 10 minutes. If you didn't request this login, please ignore this email and secure your account.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hi ${username},
      
      You requested to sign in to your account. Please use the following verification code to complete your login:
      
      Login Code: ${loginCode}
      
      Visit ${loginUrl} to enter this code.
      
      This verification code will expire in 10 minutes. If you didn't request this login, please ignore this email and secure your account.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending login OTP email:", error);
    throw new Error("Failed to send login OTP email");
  }
};

export const sendPasswordResetOTP = async ({
  email,
  username,
  resetCode,
}: SendPasswordResetOTPParams): Promise<void> => {
  const transporter = createTransporter();
  const baseUrl = getFrontendUrl();
  const resetUrl = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Password Reset Verification Code",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h1 style="color: #333; margin-top: 0;">Password Reset Verification</h1>
            <p>Hi ${username},</p>
            <p>You requested to reset your password. Please use the following verification code to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #ffffff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; display: inline-block;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff; font-family: 'Courier New', monospace;">
                  ${resetCode}
                </div>
              </div>
            </div>
            <p style="text-align: center; margin-top: 20px;">
              <a href="${resetUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Password Reset Page
              </a>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
              This verification code will expire in 15 minutes. If you didn't request a password reset, please ignore this email and secure your account.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hi ${username},
      
      You requested to reset your password. Please use the following verification code to reset your password:
      
      Reset Code: ${resetCode}
      
      Visit ${resetUrl} to enter this code and reset your password.
      
      This verification code will expire in 15 minutes. If you didn't request a password reset, please ignore this email and secure your account.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending password reset OTP email:", error);
    throw new Error("Failed to send password reset OTP email");
  }
};
