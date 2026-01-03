import type { Document } from "mongoose";

export type MediaStatus = "pending" | "processing" | "ready" | "failed";

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  DOCUMENT = "document",
}

export enum EntityType {
  USER = "user",
  PROPERTY = "property",
  // Add more as needed
}

export enum StorageProvider {
  S3 = "s3",
  CLOUDINARY = "cloudinary",
  LOCAL = "local",
}

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface MediaMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  dimensions?: MediaDimensions;
  duration?: number; // For videos
  format?: string;
}

export interface IMedia {
  _id?: string;
  fileName: string; // Generated unique filename
  url: string;
  thumbnail: MediaThumbnail;
  type: MediaType;
  metadata: MediaMetadata;

  entityType: EntityType; // Which service owns this
  entityId: string; // ID of the owner document
  fieldName: string; // Which field it belongs to (e.g., "profileImage", "images", "videos")

  uploadedBy: string;
  storageProvider: StorageProvider;
  storagePath: string; // Path/key in storage (for deletion)

  // Status
  isProcessed: boolean; // Has it been optimized/transcoded?
  isActive: boolean;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMediaDocument extends Omit<IMedia, "_id">, Document {}

export interface CreateMediaInput {
  propertyId?: string;
  userId: string;
  type: MediaType;
  file: Express.Multer.File;
  alt?: string;
  caption?: string;
  order?: number;
  isPublic?: boolean;
}

export interface UpdateMediaInput {
  alt?: string;
  caption?: string;
  order?: number;
  isPublic?: boolean;
}

export interface MediaQueryInput {
  propertyId?: string;
  userId?: string;
  type?: MediaType;
  status?: MediaStatus;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}

export interface UploadResult {
  url: string;
  key: string;
  thumbnailUrl?: string;
  thumbnails?: MediaThumbnail[];
}

export interface ProcessedFile {
  buffer: Buffer;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    size: number;
  };
}
