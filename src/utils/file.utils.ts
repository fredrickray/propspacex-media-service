import config from "@config/dotenv.config";
import { MediaType } from "@media/media.type";

const imageExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
];
const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".wmv"];
const documentExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

export function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return MediaType.IMAGE;
  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  if (mimeType.startsWith("application/")) return MediaType.DOCUMENT;
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

export function isAllowedMimeType(mimeType: string): boolean {
  const allAllowedTypes = [
    ...config.allowedImageTypes,
    ...config.allowedVideoTypes,
    ...config.allowedDocumentTypes,
  ];
  return allAllowedTypes.includes(mimeType);
}

export function isAllowedFileSize(size: number): boolean {
  return size <= config.maxFileSize;
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : "";
}

export function getMediaTypeFromExtension(filename: string): MediaType | null {
  const ext = getFileExtension(filename);

  if (imageExtensions.includes(ext)) return MediaType.IMAGE;
  if (videoExtensions.includes(ext)) return MediaType.VIDEO;
  if (documentExtensions.includes(ext)) return MediaType.DOCUMENT;

  return null;
}

export function generateStorageKey(
  userId: string,
  type: MediaType,
  filename: string
): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = getFileExtension(filename);
  const sanitizedName = filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 50);

  return `${type}s/${userId}/${timestamp}-${randomStr}-${sanitizedName}${
    ext ? "" : ""
  }`;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 100);
}

export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function validateFile(file: Express.Multer.File): {
  valid: boolean;
  error?: string;
} {
  if (!isAllowedMimeType(file.mimetype)) {
    return {
      valid: false,
      error: `File type '${file.mimetype}' is not allowed`,
    };
  }

  if (!isAllowedFileSize(file.size)) {
    return {
      valid: false,
      error: `File size ${formatFileSize(
        file.size
      )} exceeds maximum allowed size of ${formatFileSize(config.maxFileSize)}`,
    };
  }

  return { valid: true };
}
