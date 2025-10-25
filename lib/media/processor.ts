/**
 * Media processing utilities
 * Handles image optimization, resizing, and metadata stripping
 */

/**
 * Strip EXIF data from image
 * Removes potentially sensitive metadata (GPS, camera info, etc.)
 * 
 * Note: This is a placeholder. In production, use a library like 'sharp' or 'jimp'
 * For now, we rely on Supabase Storage to handle this
 */
export async function stripEXIFData(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  // In production, use sharp:
  // const sharp = require('sharp');
  // const processed = await sharp(Buffer.from(buffer))
  //   .rotate() // Auto-rotate based on EXIF
  //   .withMetadata(false) // Strip all metadata
  //   .toBuffer();
  // return processed.buffer;
  
  // For now, return as-is
  // Supabase Storage can handle EXIF stripping via transforms
  return buffer;
}

/**
 * Optimize image for web
 * Reduces file size while maintaining quality
 */
export async function optimizeImage(
  buffer: ArrayBuffer,
  contentType: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<ArrayBuffer> {
  // In production, use sharp:
  // const sharp = require('sharp');
  // const processed = await sharp(Buffer.from(buffer))
  //   .resize(options?.maxWidth, options?.maxHeight, {
  //     fit: 'inside',
  //     withoutEnlargement: true
  //   })
  //   .jpeg({ quality: options?.quality || 85 })
  //   .toBuffer();
  // return processed.buffer;
  
  // For now, return as-is
  // Consider using Supabase Image Transformations or Cloudinary
  return buffer;
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(
  buffer: ArrayBuffer,
  size: number = 200
): Promise<ArrayBuffer> {
  // In production, use sharp to generate thumbnail
  // For now, return original
  return buffer;
}

/**
 * Validate and process uploaded media
 * Complete pipeline: validate → strip EXIF → optimize
 */
export async function processMediaUpload(input: {
  buffer: ArrayBuffer;
  filename: string;
  contentType: string;
  maxBytes: number;
}): Promise<{
  success: boolean;
  processedBuffer?: ArrayBuffer;
  errors?: string[];
}> {
  // Import validator
  const { validateMediaUpload, containsSuspiciousContent } = await import("./validator");
  
  // Validate
  const validation = await validateMediaUpload(input);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  // Check for suspicious content
  if (containsSuspiciousContent(input.buffer)) {
    return {
      success: false,
      errors: ["File contains suspicious content and cannot be uploaded"],
    };
  }

  // Process based on type
  let processed = input.buffer;
  
  if (input.contentType.startsWith("image/")) {
    // Strip EXIF
    processed = await stripEXIFData(processed);
    
    // Optimize
    processed = await optimizeImage(processed, input.contentType, {
      maxWidth: 4000,
      maxHeight: 4000,
      quality: 85,
    });
  }

  return {
    success: true,
    processedBuffer: processed,
  };
}

/**
 * Media processing configuration
 */
export const MEDIA_PROCESSING_CONFIG = {
  // Image optimization
  MAX_IMAGE_WIDTH: 4000,
  MAX_IMAGE_HEIGHT: 4000,
  IMAGE_QUALITY: 85,
  
  // Thumbnail generation
  THUMBNAIL_SIZE: 200,
  
  // Video processing (future)
  MAX_VIDEO_DURATION_SECONDS: 60,
  VIDEO_QUALITY: "medium",
} as const;

/**
 * Check if file needs processing
 */
export function needsProcessing(contentType: string): boolean {
  // Currently only process images
  return contentType.startsWith("image/");
}

/**
 * Get recommended Supabase Storage policy
 */
export const STORAGE_POLICY_RECOMMENDATIONS = {
  // Restrict file types
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
  ],
  
  // Size limits
  maxUploadSize: 10 * 1024 * 1024, // 10MB for images
  maxVideoSize: 100 * 1024 * 1024, // 100MB for videos
  
  // Security
  enableVirusScan: true, // If available
  stripMetadata: true,
  blockExecutables: true,
} as const;
