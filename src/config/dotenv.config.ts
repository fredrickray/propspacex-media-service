import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3003", 10),
  grpcPort: parseInt(process.env.GRPC_PORT || "50053", 10),
  mongodbUri: process.env.MONGODB_URI as string,

  // Storage Provider
  storageProvider: (process.env.STORAGE_PROVIDER || "local") as
    | "s3"
    | "cloudinary"
    | "local",
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "us-east-1",
    s3Bucket: process.env.AWS_S3_BUCKET || "propspacex-media",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  localUploadPath: process.env.LOCAL_UPLOAD_PATH || "./uploads",
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "52428800", 10), // 50MB default
  maxFilesPerRequest: parseInt(process.env.MAX_FILES_PER_REQUEST || "10", 10),
  allowedImageTypes: (
    process.env.ALLOWED_IMAGE_TYPES ||
    "image/jpeg,image/png,image/webp,image/gif"
  ).split(","),
  allowedVideoTypes: (
    process.env.ALLOWED_VIDEO_TYPES || "video/mp4,video/webm,video/quicktime"
  ).split(","),
  allowedDocumentTypes: (
    process.env.ALLOWED_DOCUMENT_TYPES || "application/pdf"
  ).split(","),

  imageProcessing: {
    quality: parseInt(process.env.IMAGE_QUALITY || "80", 10),
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || "1920", 10),
    maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || "1080", 10),
    thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || "300", 10),
    thumbnailHeight: parseInt(process.env.THUMBNAIL_HEIGHT || "200", 10),
  },

  videoProcessing: {
    maxDuration: parseInt(process.env.VIDEO_MAX_DURATION || "300", 10),
    outputFormat: process.env.VIDEO_OUTPUT_FORMAT || "mp4",
  },
};

export default config;
