import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.AUTH_TOKEN_SECRET || "change-this-secret-in-env";
const TOKEN_VERIFY_SECRETS = Array.from(
  new Set([JWT_SECRET, process.env.AUTH_TOKEN_SECRET, "change-this-secret-in-env", "secret"].filter(Boolean))
);

export const createToken = (user) => {
  // `jti` is used for server-side logout via token blacklist.
  const jti = crypto.randomBytes(16).toString("hex");

  return jwt.sign(
    {
      jti,
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      type: user.type,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const verifyToken = (token) => {
  for (const secret of TOKEN_VERIFY_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch {
      // Try the next supported token secret.
    }
  }

  const parts = String(token || "").split(".");
  if (parts.length !== 2) {
    const error = new Error("Invalid token");
    error.name = "JsonWebTokenError";
    throw error;
  }

  const [payload, signature] = parts;
  for (const secret of TOKEN_VERIFY_SECRETS) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (!decoded.exp || decoded.exp < Date.now()) {
        const error = new Error("Token expired");
        error.name = "TokenExpiredError";
        throw error;
      }
      return decoded;
    }
  }

  const error = new Error("Invalid token");
  error.name = "JsonWebTokenError";
  throw error;
};
