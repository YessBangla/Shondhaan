export function resetPasswordEmailTemplate({ resetLink, expiryMinutes }) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset your Shondhaan password</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6f9">
<tr><td align="center" style="padding:40px 15px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="background:#021543;padding:24px 20px;">
<h1 style="margin:0;font-size:28px;color:#ffffff;">Reset your password</h1>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:18px;color:#222;">Hello,</p>
<p style="font-size:16px;line-height:28px;color:#555;">We received a request to reset your Shondhaan account password. Click the button below to choose a new password.</p>
<p style="text-align:center;margin:30px 0;"><a href="${resetLink}" style="display:inline-block;padding:14px 26px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:7px;font-weight:bold;">Reset password</a></p>
<p style="font-size:14px;line-height:24px;color:#666;">This link will expire in ${expiryMinutes} minutes. If you did not request this, you can safely ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
