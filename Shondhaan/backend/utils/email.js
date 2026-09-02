import nodemailer from "nodemailer";
import { OTP_EXPIRY_MINUTES } from "../config/env.js";
import { otpEmailTemplate } from "../templates/email/otpEmail.js";
import { resetPasswordEmailTemplate } from "../templates/email/resetPasswordEmail.js";

export function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const error = new Error("Email service is not configured. Please set SMTP_HOST, SMTP_USER and SMTP_PASS in Backend/.env.");
    error.code = "SMTP_CONFIG_MISSING";
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });
}

export async function sendOtpEmail(email, otp, password = null) {
  const transporter = createTransporter();
  const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);

  let textContent = `Your Shondhaan OTP is ${otp}. It will expire in ${expiryMinutes} minutes.`;
  if (password) {
    textContent += `\n\nYour account password is: ${password}`;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "🔐 Your Shondhaan Verification Code",
    text: textContent,
    html: otpEmailTemplate({ otp, expiryMinutes, password }),
  });
}

export async function sendResetPasswordEmail(email, resetLink) {
  const transporter = createTransporter();
  const expiryMinutes = 15; // keep in sync with RESET_EXPIRY_MINUTES in passwordReset controller

  const textContent = `Reset your Shondhaan password using this link: ${resetLink}\n\nThis link will expire in ${expiryMinutes} minutes. If you did not request this, please ignore this email.`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "🔑 Reset Your Shondhaan Password",
    text: textContent,
    html: resetPasswordEmailTemplate({ resetLink, expiryMinutes }),
  });
}