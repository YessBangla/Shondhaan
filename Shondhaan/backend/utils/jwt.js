import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.AUTH_TOKEN_SECRET || "secret";

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
  return jwt.verify(token, JWT_SECRET);
};
