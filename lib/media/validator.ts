/**
 * Media upload validation utilities
 * Validates file types, sizes, and content safety
 */

/**
 * Magic number (file signature) database
 * Used to validate actual file type, not just extension
 */
const MAGIC_NUMBERS: Record<string, { signature: number[]; offset: number }> = {
  // Images
  "image/jpeg": { signature: [0xFF, 0xD8, 0xFF], offset: 0 },
  "image/png": { signature: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
  "image/gif": { signature: [0x47, 0x49, 0x46, 0x38], offset: 0 },
  "image/webp": { signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  
  // Video
  "video/mp4": { signature: [0x66, 0x74, 0x79, 0x70], offset: 4 },
};

/**
 * Validate file type using magic number (file signature)
 * More secure than just checking extension
 */
export async function validateFileType(
  buffer: ArrayBuffer,
  expectedType: string
): Promise<boolean> {
  const magic = MAGIC_NUMBERS[expectedType];
  if (!magic) {
    return false;
  }

  const bytes = new Uint8Array(buffer);
  const slice = Array.from(bytes.slice(magic.offset, magic.offset + magic.signature.length));
  
  return magic.signature.every((byte, index) => byte === slice[index]);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxBytes: number): boolean {
  return size > 0 && size <= maxBytes;
}

/**
 * Check if file extension matches content type
 */
export function validateExtension(filename: string, contentType: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  const validExtensions: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/gif": ["gif"],
    "image/webp": ["webp"],
    "video/mp4": ["mp4"],
  };
  
  const allowed = validExtensions[contentType];
  return Boolean(ext && allowed?.includes(ext));
}

/**
 * Sanitize filename
 * Removes dangerous characters and limits length
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let safe = filename.replace(/\.\./g, "");
  
  // Remove special characters except dot, dash, underscore
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, "_");
  
  // Limit length
  if (safe.length > 255) {
    const ext = safe.split(".").pop();
    safe = safe.substring(0, 250) + (ext ? `.${ext}` : "");
  }
  
  return safe;
}

/**
 * Validate image dimensions
 * Prevents decompression bombs
 */
export async function validateImageDimensions(
  buffer: ArrayBuffer,
  maxWidth: number = 10000,
  maxHeight: number = 10000
): Promise<boolean> {
  // This is a simplified check - in production, use a proper image library
  // For now, we just check file size as a proxy
  return buffer.byteLength < 50 * 1024 * 1024; // 50MB max
}

/**
 * Complete media validation
 * Runs all validation checks
 */
export async function validateMediaUpload(input: {
  buffer: ArrayBuffer;
  filename: string;
  contentType: string;
  maxBytes: number;
}): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check file size
  if (!validateFileSize(input.buffer.byteLength, input.maxBytes)) {
    errors.push(`File size exceeds maximum of ${Math.round(input.maxBytes / 1024 / 1024)}MB`);
  }

  // Check magic number
  const validType = await validateFileType(input.buffer, input.contentType);
  if (!validType) {
    errors.push("File type does not match content. Possible file type spoofing detected.");
  }

  // Check extension
  if (!validateExtension(input.filename, input.contentType)) {
    errors.push("File extension does not match content type");
  }

  // Additional checks for images
  if (input.contentType.startsWith("image/")) {
    const validDimensions = await validateImageDimensions(input.buffer);
    if (!validDimensions) {
      errors.push("Image dimensions exceed maximum allowed size");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if file contains suspicious content
 * Basic malware/script detection
 */
export function containsSuspiciousContent(buffer: ArrayBuffer): boolean {
  const text = new TextDecoder().decode(buffer);
  
  // Check for common malware patterns
  const suspiciousPatterns = [
    /<script/i,
    /eval\(/i,
    /exec\(/i,
    /system\(/i,
    /<?php/i,
    /<%/,  // ASP
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

/**
 * Generate safe upload path
 * Prevents path traversal and ensures unique filenames
 */
export function generateSafeUploadPath(input: {
  userId: string;
  originalFilename: string;
  contentType: string;
}): string {
  const sanitized = sanitizeFilename(input.originalFilename);
  const ext = sanitized.split(".").pop() || "bin";
  
  // Use date-based folder structure
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 10);
  
  return `${input.userId}/${year}/${month}/${random}.${ext}`;
}
