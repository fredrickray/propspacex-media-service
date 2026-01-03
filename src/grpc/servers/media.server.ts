import * as grpc from "@grpc/grpc-js";
import { mediaService } from "@media/media.service";
import { EntityType } from "@media/media.type";
import type { IMedia } from "@media/media.type";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GrpcCall = grpc.ServerUnaryCall<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GrpcCallback = grpc.sendUnaryData<any>;

interface ProtoMedia {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  type: string;
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

function transformMediaToProto(media: IMedia): ProtoMedia {
  return {
    id: media._id || "",
    fileName: media.fileName,
    url: media.url,
    thumbnailUrl: media.thumbnail?.url,
    thumbnailWidth: media.thumbnail?.width,
    thumbnailHeight: media.thumbnail?.height,
    type: media.type,
    originalName: media.metadata.originalName,
    mimeType: media.metadata.mimeType,
    size: media.metadata.size,
    width: media.metadata.dimensions?.width,
    height: media.metadata.dimensions?.height,
    duration: media.metadata.duration,
    entityType: media.entityType,
    entityId: media.entityId,
    fieldName: media.fieldName,
    uploadedBy: media.uploadedBy,
    storageProvider: media.storageProvider,
    storagePath: media.storagePath,
    isProcessed: media.isProcessed,
    isActive: media.isActive,
    createdAt: media.createdAt?.toISOString() || "",
    updatedAt: media.updatedAt?.toISOString() || "",
  };
}

export const mediaGrpcService = {
  async getMedia(call: GrpcCall, callback: GrpcCallback): Promise<void> {
    try {
      const { id } = call.request;
      const media = await mediaService.getMediaById(id);

      callback(null, {
        success: true,
        data: transformMediaToProto(media),
      });
    } catch (error) {
      callback(null, {
        success: false,
        message: (error as Error).message,
      });
    }
  },

  async getMediaByEntity(
    call: GrpcCall,
    callback: GrpcCallback
  ): Promise<void> {
    try {
      const { entityType, entityId, fieldName } = call.request;
      const media = await mediaService.getMediaByEntity(
        entityType as EntityType,
        entityId,
        fieldName
      );

      callback(null, {
        success: true,
        data: media.map(transformMediaToProto),
      });
    } catch (error) {
      callback(null, {
        success: false,
        message: (error as Error).message,
      });
    }
  },

  async updateMedia(call: GrpcCall, callback: GrpcCallback): Promise<void> {
    try {
      const { id, isActive, isProcessed } = call.request;

      const updateData: { isActive?: boolean; isProcessed?: boolean } = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isProcessed !== undefined) updateData.isProcessed = isProcessed;

      const media = await mediaService.updateMedia(id, updateData);

      callback(null, {
        success: true,
        data: transformMediaToProto(media),
      });
    } catch (error) {
      callback(null, {
        success: false,
        message: (error as Error).message,
      });
    }
  },

  async deleteMedia(call: GrpcCall, callback: GrpcCallback): Promise<void> {
    try {
      const { id } = call.request;
      await mediaService.deleteMedia(id);

      callback(null, {
        success: true,
        message: "Media deleted successfully",
      });
    } catch (error) {
      callback(null, {
        success: false,
        message: (error as Error).message,
      });
    }
  },

  async bulkDeleteMedia(call: GrpcCall, callback: GrpcCallback): Promise<void> {
    try {
      const { ids, permanent } = call.request;
      const result = permanent
        ? await mediaService.bulkDeletePermanently(ids)
        : await mediaService.bulkDelete(ids);

      callback(null, {
        success: true,
        message: `${result.deleted} media files deleted`,
        deleted: result.deleted,
        failed: result.failed,
      });
    } catch (error) {
      callback(null, {
        success: false,
        message: (error as Error).message,
      });
    }
  },

  async getSignedUrl(call: GrpcCall, callback: GrpcCallback): Promise<void> {
    try {
      const { id, expiresIn } = call.request;
      const url = await mediaService.getSignedUrl(id, expiresIn || 3600);

      callback(null, {
        success: true,
        url,
      });
    } catch {
      callback(null, {
        success: false,
        url: "",
      });
    }
  },
};
