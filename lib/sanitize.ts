/**
 * Input sanitization utilities
 * Prevents XSS attacks and ensures data integrity
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Maximum lengths for different field types
 */
export const MAX_LENGTHS = {
  handle: 30,
  display_name: 50,
  bio: 500,
  caption: 2000,
  comment: 2000,
  email: 255,
  url: 2048,
} as const;

/**
 * Sanitize plain text input
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeText(input: string | null | undefined, maxLength?: number): string {
  if (!input) return "";
  
  // Remove all HTML tags and scripts
  let sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Apply max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize handle (username)
 * Allows only alphanumeric, underscore, and hyphen
 */
export function sanitizeHandle(input: string | null | undefined): string {
  if (!input) return "";
  
  // Convert to lowercase and remove invalid characters
  let handle = input.toLowerCase().trim();
  handle = handle.replace(/[^a-z0-9_-]/g, "");
  
  // Enforce max length
  if (handle.length > MAX_LENGTHS.handle) {
    handle = handle.substring(0, MAX_LENGTHS.handle);
  }
  
  // Must start with letter or number
  handle = handle.replace(/^[^a-z0-9]+/, "");
  
  return handle;
}

/**
 * Sanitize email
 * Basic validation and normalization
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return "";
  
  let email = input.trim().toLowerCase();
  
  // Remove any HTML
  email = DOMPurify.sanitize(email, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  // Enforce max length
  if (email.length > MAX_LENGTHS.email) {
    return "";
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "";
  }
  
  return email;
}

/**
 * Sanitize URL
 * Validates and normalizes URLs
 */
export function sanitizeURL(input: string | null | undefined): string | null {
  if (!input) return null;
  
  let url = input.trim();
  
  // Remove HTML
  url = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  // Enforce max length
  if (url.length > MAX_LENGTHS.url) {
    return null;
  }
  
  // Must start with http:// or https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return null;
  }
  
  // Try to parse as URL
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize markdown-safe text
 * Allows basic markdown but strips dangerous HTML
 */
export function sanitizeMarkdown(input: string | null | undefined, maxLength?: number): string {
  if (!input) return "";
  
  // Allow basic markdown tags but strip scripts and dangerous attributes
  let sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
  });
  
  // Ensure links open in new tab
  sanitized = sanitized.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
  
  // Apply max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize input based on field type
 */
export function sanitizeInput(
  input: string | null | undefined,
  type: keyof typeof MAX_LENGTHS
): string {
  const maxLength = MAX_LENGTHS[type];
  
  switch (type) {
    case "handle":
      return sanitizeHandle(input);
    case "email":
      return sanitizeEmail(input);
    case "url":
      return sanitizeURL(input) || "";
    case "bio":
      return sanitizeMarkdown(input, maxLength);
    default:
      return sanitizeText(input, maxLength);
  }
}

/**
 * Check for potentially malicious patterns
 * Returns true if input appears suspicious
 */
export function isSuspiciousInput(input: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize object with multiple fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  schema: Partial<Record<keyof T, keyof typeof MAX_LENGTHS>>
): T {
  const sanitized = { ...obj } as any;
  
  for (const [key, fieldType] of Object.entries(schema)) {
    if (key in sanitized && typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeInput(sanitized[key], fieldType as keyof typeof MAX_LENGTHS);
    }
  }
  
  return sanitized as T;
}
