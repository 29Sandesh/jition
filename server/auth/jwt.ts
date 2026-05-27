import jwt from "jsonwebtoken";
import crypto from "crypto";

let privateKey: string;
let publicKey: string;

// Load keys from env (replacing newlines) or generate them dynamically for local development
if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
  privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
  publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
} else {
  // Fallback to dynamic keypair generation for development ease
  const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" }
  });
  privateKey = priv;
  publicKey = pub;
}

export const generateAccessToken = (userId: string): string => {
  // Sign using RS256 private key
  return jwt.sign({ userId }, privateKey, { 
    algorithm: "RS256", 
    expiresIn: "15m" 
  });
};

export const verifyAccessToken = (token: string): { userId: string } | null => {
  try {
    // Verify using RS256 public key
    return jwt.verify(token, publicKey, { 
      algorithms: ["RS256"] 
    }) as { userId: string };
  } catch (error) {
    return null;
  }
};
export { publicKey, privateKey };
