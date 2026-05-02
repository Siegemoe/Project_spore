"use client";

import React from "react";

/**
 * SkipLink component for accessibility
 * Provides a "skip to main content" link for keyboard users
 */
export default function SkipLink() {
  return (
    <a 
      href="#main-content" 
      className="skip-to-main"
    >
      Skip to main content
    </a>
  );
}
