export const MEDIA_BUCKET = "media-public";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;

export const ALLOWED_VIDEO_TYPES = ["video/mp4"] as const;

export function contentTypeToExt(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    default:
      return "bin";
  }
}
