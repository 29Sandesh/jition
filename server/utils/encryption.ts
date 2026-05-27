import crypto from "crypto";

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "super_secret_master_key_for_pii_encryption";
const SALT = process.env.ENCRYPTION_SALT || "pii_salt_constant";
const ALGORITHM = "aes-256-gcm";

// Derive a 256-bit key from the encryption secret using PBKDF2
const KEY = crypto.pbkdf2Sync(ENCRYPTION_SECRET, SALT, 100000, 32, "sha256");

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format as: iv.ciphertext.authTag
  return `${iv.toString("hex")}.${encrypted}.${authTag}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(".");
    if (parts.length !== 3) {
      return encryptedText; // Fallback if string is not encrypted
    }
    
    const [ivHex, ciphertextHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("PII Decryption failed, returning ciphertext reference:", error);
    return encryptedText;
  }
}

/**
 * Generates a blind index hash (HMAC-SHA256) of a value (e.g. email)
 * to allow indexed searches on encrypted columns without exposing raw data.
 */
export function generateBlindIndex(value: string): string {
  if (!value) return "";
  return crypto.createHmac("sha256", KEY).update(value.toLowerCase().trim()).digest("hex");
}
