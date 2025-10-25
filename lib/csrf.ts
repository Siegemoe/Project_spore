/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements token generation and validation for state-changing operations
 */

import { cookies, headers } from "next/headers";
import crypto from "crypto";

const CSRF_TOKEN_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a secure random CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Get or create CSRF token for the current session
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = cookies();
  
  // Check if token exists in cookie
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value;
  
  if (!token) {
    // Generate new token
    token = generateCSRFToken();
    
    // Set in cookie (httpOnly, secure, sameSite)
    cookieStore.set(CSRF_TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
  }
  
  return token;
}

/**
 * Validate CSRF token from request
 * Checks both header and body for token
 */
export async function validateCSRFToken(providedToken?: string): Promise<boolean> {
  const cookieStore = cookies();
  const headersList = headers();
  
  // Get expected token from cookie
  const expectedToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;
  
  if (!expectedToken) {
    return false;
  }
  
  // Get token from header or parameter
  const tokenFromHeader = headersList.get(CSRF_HEADER_NAME);
  const token = providedToken || tokenFromHeader;
  
  if (!token) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedToken),
    Buffer.from(token)
  );
}

/**
 * Validate request origin
 * Ensures request comes from same origin
 */
export function validateOrigin(): boolean {
  const headersList = headers();
  const origin = headersList.get("origin");
  const referer = headersList.get("referer");
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "https://project-spore.vercel.app",
  ].filter(Boolean);
  
  // Check origin header
  if (origin) {
    return allowedOrigins.some(allowed => origin === allowed);
  }
  
  // Fallback to referer
  if (referer) {
    return allowedOrigins.some(allowed => referer.startsWith(allowed!));
  }
  
  // No origin or referer - reject for state-changing operations
  return false;
}

/**
 * Require valid CSRF token
 * Throws error if validation fails
 */
export async function requireCSRFToken(providedToken?: string): Promise<void> {
  const isValid = await validateCSRFToken(providedToken);
  
  if (!isValid) {
    throw new Error("CSRF token validation failed");
  }
}

/**
 * Require valid request origin
 * Throws error if origin validation fails
 */
export function requireValidOrigin(): void {
  const isValid = validateOrigin();
  
  if (!isValid) {
    throw new Error("Invalid request origin");
  }
}

/**
 * Complete CSRF check (token + origin)
 * Use this for all state-changing server actions
 */
export async function validateCSRF(providedToken?: string): Promise<void> {
  // Check origin first (cheaper)
  requireValidOrigin();
  
  // Then check CSRF token
  await requireCSRFToken(providedToken);
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCSRFProtection(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

/**
 * Get CSRF token for client-side use
 * Include this in forms and AJAX requests
 */
export async function getCSRFTokenForClient(): Promise<string> {
  return getCSRFToken();
}
