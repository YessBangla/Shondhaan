export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("AUTH HEADER:", authHeader); // 👈 ADD THIS

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    console.log("TOKEN:", token);

    const decoded = verifyToken(token);

    console.log("DECODED:", decoded); 

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message); 
    return res.status(401).json({ message: "Invalid token" });
  }
};