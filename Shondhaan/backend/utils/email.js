import nodemailer from "nodemailer";
import { OTP_EXPIRY_MINUTES } from "../config/env.js";

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

export async function sendOtpEmail(email, otp) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your Shondhaan signup OTP",
    text: `Your Shondhaan OTP is ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Shondhaan signup OTP</h2>
        <p>Your OTP code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p>
        <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
  });
}