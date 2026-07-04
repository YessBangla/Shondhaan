import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const bool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export function createTransporter() {
  const {
    SMTP_HOST,
    SMTP_SERVICE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_REJECT_UNAUTHORIZED,
  } = process.env;

  if ((!SMTP_HOST && !SMTP_SERVICE) || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST or SMTP_SERVICE, plus SMTP_USER and SMTP_PASS."
    );
  }

  const port = Number(SMTP_PORT || 587);
  const secure = bool(SMTP_SECURE, port === 465);

  return nodemailer.createTransport({
    ...(SMTP_SERVICE ? { service: SMTP_SERVICE } : { host: SMTP_HOST }),
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: bool(SMTP_REJECT_UNAUTHORIZED, true),
    },
  });
}

export async function verifySmtpConnection() {
  const transporter = createTransporter();
  await transporter.verify();
  return true;
}
