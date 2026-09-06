export function otpEmailTemplate({ otp, expiryMinutes, password = null }) {
  // Conditionally render the password block only if password exists
  const passwordBlock = password ? `
    <!-- PASSWORD BOX -->
    <div
      style="
        margin-top:25px;
        padding:18px;
        background:#eff6ff;
        border-left:4px solid #3b82f6;
        border-radius:6px;
      ">
      <p
        style="
          margin:0;
          font-size:16px;
          font-weight:bold;
          color:#333;
        ">
        🔑 Your Account Password
      </p>
      <p
        style="
          margin:10px 0 0;
          font-size:14px;
          line-height:24px;
          color:#555;
        ">
        You can use the following temporary password to log in to your Shondhaan account:
      </p>
      <div
        style="
          margin-top:12px;
          text-align:center;
          font-size:22px;
          font-weight:bold;
          color:#1d4ed8;
          letter-spacing:2px;
        ">
        ${password}
      </div>
      <p
        style="
          margin-top:12px;
          font-size:13px;
          color:#666;
          text-align:center;
        ">
        For your security, please change this password after logging in.
      </p>
    </div>
  ` : '';

  return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shondhaan Email Verification</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background: #f4f6f9;
      font-family: Arial, Helvetica, sans-serif;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="#f4f6f9"
    >
      <tr>
        <td align="center" style="padding: 40px 15px">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              max-width: 400px;
              width: 100%;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            "
          >
            <!-- ================= HEADER ================= -->
            <tr>
              <td align="center" style="background: #021543; padding: 24px 20px">
                <img
                  src="https://shondhaan.com/fullLogo.png"
                  alt="Shondhaan"
                  width="100"
                  style="display: block; margin: 0 auto 12px; padding:5px; border-radius: 10px; max-width: 160px; background: #ffffff;"
                />

                <h1 style=" margin: 0; font-size: 12px; font-weight: bold; color: #ffffff;">
                  Email Verification
                </h1>

                <p
                  style="
                    margin: 5px 0 0;
                    font-size: 12px;
                    line-height: 10px;
                    color: #d9e6ff;
                  "
                >
                  Secure verification for your Shondhaan account
                </p>
              </td>
            </tr>

            <!-- ================= BODY ================= -->

            <tr>
              <td style="padding: 10px 20px">
                <p style="margin-top: 0; font-size: 12px; color: #222">
                  Hello,
                </p>

                <p
                  style="
                    font-size: 12px;
                    line-height: 16px;
                    color: #555;
                    margin-bottom: 5px;
                    font-style: bold;
                  "
                >
                  Thank you for registering with
                  <strong>Shondhaan</strong>. To complete your account
                  verification, please enter the One-Time Password (OTP) below.
                </p>

                <!-- OTP BOX -->

                <table
                  align="center"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    margin: 0 auto;
                    background: #f7fffb;
                    border: 2px dashed #16a34a;
                    border-radius: 12px;
                    width: 200px;
                  ">
                  <tr>
                    <td align="center" style="padding: 12px">
                      <p style="margin: 0; font-size: 12px; color: #666">
                        Your Verification Code
                      </p>

                      <div
                        style="
                          margin-top: 5px;
                          font-size: 16px;
                          font-weight: bold;
                          letter-spacing: 10px;
                          color: #16a34a;
                          font-family: Arial, Helvetica, sans-serif;
                        "
                        >
                        ${otp}
                      </div>
                    </td>
                  </tr>
                </table>

                <p
                  style="
                    margin-top: 10px;
                    font-size: 14px;
                    line-height: 14px;
                    color: #444;
                  "
                    >
                  This verification code will expire in
                  <strong>${expiryMinutes} minutes</strong>.
                </p>
                <!-- SECURITY NOTICE -->
                <div
                  style="
                    margin-top: 10px;
                    padding: 10px;
                    background: #fff8e8;
                    border-left: 4px solid #f4b400;
                    border-radius: 6px;
                  "
                    >
                  <p
                    style="
                      margin: 0;
                      font-size: 14px;
                      font-weight: bold;
                      color: #333;
                    "
                  >
                    🔒 Security Notice
                  </p>

                  <p
                    style="
                      margin: 10px 0 0;
                      font-size: 12px;
                      line-height: 14px;
                      color: #555;
                    "
                  >
                    Never share this verification code with anyone. Shondhaan
                    employees will never ask for your OTP via phone, email, or
                    message.
                  </p>
                </div>

                <!-- 🔑 PASSWORD BLOCK (Only shows if password is provided) -->
                <p style="
                    font-size: 12px;
                    font-style: bold;
                  ">${passwordBlock}</p>
              </td>
            </tr>

            <!-- ================= FOOTER ================= -->

         
            <tr>
              <td
                align="center"
                style="
                  background: #afbbc6;
                  padding: 10px 20px;
                  border-top: 1px solid #e4e4e4;
                "
              >
                <img
                  src="https://shondhaan.com/fullLogo.png"
                  alt="Shondhaan"
                  width="95"
                  style="display: block; margin: 0 auto 14px"
                />

                <p
                  style="
                    margin: 0;
                    font-size: 12px;
                    font-weight: 600;
                    color: #000000;
                  "
                >
                  Helping People Find Trusted Services
                </p>

                <p style="margin: 5px 0 0; font-size: 12px; color: #050505">
                  © ${new Date().getFullYear()} <strong>Shondhaan</strong>. All
                  Rights Reserved.
                </p>

                <p
                  style="
                    margin-top: 5px;
                    font-size: 12px;
                    line-height: 15px;
                    color: #000000;
                  "
                >
                  This is an automated email.<br />
                  Please do not reply to this message.
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}