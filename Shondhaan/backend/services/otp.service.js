import { createTransporter } from "../config/mailer.js";

export async function sendOtpEmail({ to, otp }) {
  if (!to) throw new Error("Missing 'to' email");
  if (!otp) throw new Error("Missing 'otp'");

  const transporter = createTransporter();

  const from = process.env.SMTP_FROM || `Yess Service <${process.env.SMTP_USER}>`;

  const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  const subject = "Yess Service OTP Code";
  const text = `Your Yess Service OTP code is ${otp}. It will expire in ${expiryMinutes} minutes. Do not share this code.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">Yess Service verification code</h2>
      <p>Your OTP code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:12px 0">${otp}</p>
      <p>It will expire in ${expiryMinutes} minutes.</p>
      <p style="color:#6b7280;font-size:13px">Do not share this code with anyone.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  } catch (error) {
    error.message = `SMTP OTP send failed: ${error.message}`;
    throw error;
  }
}
