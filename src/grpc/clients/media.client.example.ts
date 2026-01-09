/**
 * Media Service Client
 *
 * This file shows how other services (property-service, user-service, etc.)
 * can interact with the media service.
 *
 * Copy this file to your service and update the imports/paths as needed.
 */

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "path";
import FormData from "form-data";
import fetch from "node-fetch";

// ============================================================================
// CONFIGURATION
// ============================================================================

const MEDIA_SERVICE_HTTP_URL =
  process.env.MEDIA_SERVICE_URL || "http://localhost:3003";
const MEDIA_SERVICE_GRPC_URL =
  process.env.MEDIA_SERVICE_GRPC_URL || "localhost:50053";

// ============================================================================
// GRPC CLIENT SETUP
// ============================================================================

// Load the proto file (you'll need to copy media.proto to your service)
const PROTO_PATH = join(process.cwd(), "src/grpc/proto/media.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

interface MediaProtoDefinition {
  media: {
    MediaService: grpc.ServiceClientConstructor;
  };
}

const mediaProto = grpc.loadPackageDefinition(
  packageDefinition
) as unknown as MediaProtoDefinition;

// ============================================================================
// TYPES
// ============================================================================

export interface MediaItem {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  type: "image" | "video" | "document";
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  entityType: string;
  entityId: string;
  fieldName: string;
  uploadedBy: string;
  storageProvider: string;
  storagePath: string;
  isProcessed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadOptions {
  entityType: "user" | "property";
  entityId: string;
  fieldName: string;
  uploadedBy: string;
}

export interface GrpcResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  deleted: number;
  failed: string[];
}

// ============================================================================
// MEDIA CLIENT CLASS
// ============================================================================

export class MediaClient {
  private grpcClient: InstanceType<grpc.ServiceClientConstructor>;
  private httpBaseUrl: string;

  constructor(
    httpUrl: string = MEDIA_SERVICE_HTTP_URL,
    grpcUrl: string = MEDIA_SERVICE_GRPC_URL
  ) {
    this.httpBaseUrl = httpUrl;
    this.grpcClient = new mediaProto.media.MediaService(
      grpcUrl,
      grpc.credentials.createInsecure()
    );
  }

  // ==========================================================================
  // HTTP METHODS (for file uploads)
  // ==========================================================================

  /**
   * Upload a single file via HTTP REST API
   * Use this for uploading files from other services
   */
  async uploadFile(
    file: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<MediaItem> {
    const formData = new FormData();
    formData.append("file", file, {
      filename,
      contentType: mimeType,
    });
    formData.append("entityType", options.entityType);
    formData.append("entityId", options.entityId);
    formData.append("fieldName", options.fieldName);

    const response = await fetch(`${this.httpBaseUrl}/api/v1/media/upload`, {
      method: "POST",
      headers: {
        "x-user-id": options.uploadedBy,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        (error as { message?: string }).message || "Upload failed"
      );
    }

    const result = (await response.json()) as { data: MediaItem };
    return result.data;
  }

  /**
   * Upload multiple files via HTTP REST API
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string; mimeType: string }>,
    options: UploadOptions
  ): Promise<MediaItem[]> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file.buffer, {
        filename: file.filename,
        contentType: file.mimeType,
      });
    });

    formData.append("entityType", options.entityType);
    formData.append("entityId", options.entityId);
    formData.append("fieldName", options.fieldName);

    const response = await fetch(
      `${this.httpBaseUrl}/api/v1/media/upload/multiple`,
      {
        method: "POST",
        headers: {
          "x-user-id": options.uploadedBy,
          ...formData.getHeaders(),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        (error as { message?: string }).message || "Upload failed"
      );
    }

    const result = (await response.json()) as { data: MediaItem[] };
    return result.data;
  }

  // ==========================================================================
  // GRPC METHODS (for queries, updates, deletes)
  // ==========================================================================

  /**
   * Get media by ID via gRPC
   */
  getMedia(id: string): Promise<MediaItem | null> {
    return new Promise((resolve, reject) => {
      this.grpcClient.getMedia(
        { id },
        (
          error: grpc.ServiceError | null,
          response: GrpcResponse<MediaItem>
        ) => {
          if (error) {
            reject(error);
            return;
          }
          if (!response.success) {
            resolve(null);
            return;
          }
          resolve(response.data || null);
        }
      );
    });
  }

  /**
   * Get all media for an entity (e.g., all images for a property)
   */
  getMediaByEntity(
    entityType: "user" | "property",
    entityId: string,
    fieldName?: string
  ): Promise<MediaItem[]> {
    return new Promise((resolve, reject) => {
      this.grpcClient.getMediaByEntity(
        { entityType, entityId, fieldName },
        (
          error: grpc.ServiceError | null,
          response: GrpcResponse<MediaItem[]>
        ) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response.data || []);
        }
      );
    });
  }

  /**
   * Update media (soft delete/restore, mark as processed)
   */
  updateMedia(
    id: string,
    data: { isActive?: boolean; isProcessed?: boolean }
  ): Promise<MediaItem | null> {
    return new Promise((resolve, reject) => {
      this.grpcClient.updateMedia(
        { id, ...data },
        (
          error: grpc.ServiceError | null,
          response: GrpcResponse<MediaItem>
        ) => {
          if (error) {
            reject(error);
            return;
          }
          if (!response.success) {
            resolve(null);
            return;
          }
          resolve(response.data || null);
        }
      );
    });
  }

  /**
   * Delete media (soft delete)
   */
  deleteMedia(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.grpcClient.deleteMedia(
        { id },
        (error: grpc.ServiceError | null, response: GrpcResponse<void>) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response.success);
        }
      );
    });
  }

  /**
   * Bulk delete media
   */
  bulkDeleteMedia(
    ids: string[],
    permanent: boolean = false
  ): Promise<BulkDeleteResponse> {
    return new Promise((resolve, reject) => {
      this.grpcClient.bulkDeleteMedia(
        { ids, permanent },
        (error: grpc.ServiceError | null, response: BulkDeleteResponse) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * Get a signed URL for private/temporary access
   */
  getSignedUrl(id: string, expiresIn: number = 3600): Promise<string> {
    return new Promise((resolve, reject) => {
      this.grpcClient.getSignedUrl(
        { id, expiresIn },
        (
          error: grpc.ServiceError | null,
          response: { success: boolean; url: string }
        ) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response.url);
        }
      );
    });
  }

  // ==========================================================================
  // HTTP QUERY METHODS (alternative to gRPC)
  // ==========================================================================

  /**
   * Query media via HTTP (alternative to gRPC)
   */
  async queryMedia(params: {
    entityType?: string;
    entityId?: string;
    fieldName?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: MediaItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const response = await fetch(
      `${this.httpBaseUrl}/api/v1/media?${queryString}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        (error as { message?: string }).message || "Query failed"
      );
    }

    return response.json() as Promise<{
      data: MediaItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>;
  }

  /**
   * Close the gRPC connection
   */
  close(): void {
    this.grpcClient.close();
  }
}

// ============================================================================
// SINGLETON INSTANCE (optional)
// ============================================================================

let mediaClientInstance: MediaClient | null = null;

export function getMediaClient(): MediaClient {
  if (!mediaClientInstance) {
    mediaClientInstance = new MediaClient();
  }
  return mediaClientInstance;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Upload a profile image for a user
const mediaClient = getMediaClient();

const profileImage = await mediaClient.uploadFile(
  imageBuffer,
  "profile.jpg",
  "image/jpeg",
  {
    entityType: "user",
    entityId: "user-123",
    fieldName: "profileImage",
    uploadedBy: "user-123",
  }
);
console.log("Uploaded:", profileImage.url);

// Example 2: Upload multiple property images
const propertyImages = await mediaClient.uploadMultipleFiles(
  [
    { buffer: img1Buffer, filename: "living-room.jpg", mimeType: "image/jpeg" },
    { buffer: img2Buffer, filename: "bedroom.jpg", mimeType: "image/jpeg" },
  ],
  {
    entityType: "property",
    entityId: "property-456",
    fieldName: "images",
    uploadedBy: "agent-789",
  }
);

// Example 3: Get all images for a property
const images = await mediaClient.getMediaByEntity(
  "property",
  "property-456",
  "images"
);

// Example 4: Delete media when property is deleted
await mediaClient.bulkDeleteMedia(
  images.map((img) => img.id),
  true // permanent delete
);

// Example 5: Get signed URL for private document
const signedUrl = await mediaClient.getSignedUrl("media-id", 3600);
*/
