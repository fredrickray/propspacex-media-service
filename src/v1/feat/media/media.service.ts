import { v4 as uuidv4 } from "uuid";
import { Media } from "./media.model";
import { storageProvider } from "@providers/index";
import config from "@config/dotenv.config";
import {
  getMediaTypeFromMime,
  validateFile,
  getFileExtension,
} from "@utils/file.utils";
import { processImage, getImageMetadata } from "../../../utils/image.utils";
import { NotFoundError, BadRequestError } from "@middlewares/error.middleware";
import { MediaType, EntityType, StorageProvider } from "./media.type";
import type { IMedia, MediaThumbnail, MediaMetadata } from "./media.type";

export interface UploadMediaOptions {
  entityType: EntityType;
  entityId: string;
  fieldName: string;
  uploadedBy: string;
}

export interface MediaQueryOptions {
  entityType?: EntityType;
  entityId?: string;
  fieldName?: string;
  uploadedBy?: string;
  type?: MediaType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateMediaOptions {
  isActive?: boolean;
  isProcessed?: boolean;
}

export class MediaService {
  private generateFileName(originalName: string): string {
    const ext = getFileExtension(originalName);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uniqueId}${ext}`;
  }

  private generateStoragePath(
    entityType: EntityType,
    entityId: string,
    fieldName: string,
    fileName: string
  ): string {
    return `${entityType}/${entityId}/${fieldName}/${fileName}`;
  }

  async uploadMedia(
    file: Express.Multer.File,
    options: UploadMediaOptions
  ): Promise<IMedia> {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new BadRequestError(validation.error);
    }

    const mediaType = getMediaTypeFromMime(file.mimetype);
    const fileName = this.generateFileName(file.originalname);
    const storagePath = this.generateStoragePath(
      options.entityType,
      options.entityId,
      options.fieldName,
      fileName
    );

    let uploadBuffer = file.buffer;
    let thumbnail: MediaThumbnail = { url: "", width: 0, height: 0 };
    let width: number | undefined;
    let height: number | undefined;
    let isProcessed = false;

    // Process images
    if (mediaType === MediaType.IMAGE) {
      const processed = await processImage(file.buffer);
      uploadBuffer = processed.buffer;

      const imageMeta = await getImageMetadata(uploadBuffer);
      width = imageMeta.width;
      height = imageMeta.height;
      isProcessed = true;

      // Generate and upload thumbnail
      const { createThumbnail } = await import("../../../utils/image.utils");
      const thumbBuffer = await createThumbnail(file.buffer);
      const thumbPath = storagePath.replace(/(\.[^.]+)$/, "-thumb.webp");
      const thumbResult = await storageProvider.upload(
        thumbBuffer,
        thumbPath,
        "image/webp"
      );

      // Get thumbnail dimensions
      if (mediaType === MediaType.IMAGE) {
        const thumbMeta = await getImageMetadata(thumbBuffer);
        thumbnail = {
          url: thumbResult.url,
          width: thumbMeta.width || 200,
          height: thumbMeta.height || 200,
        };
      }
    }

    // Upload main file
    const uploadResult = await storageProvider.upload(
      uploadBuffer,
      storagePath,
      file.mimetype
    );

    // Build metadata
    const metadata: MediaMetadata = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: uploadBuffer.length,
      dimensions: width && height ? { width, height } : undefined,
      format: getFileExtension(file.originalname).replace(".", ""),
    };

    // Create media record
    const media = await Media.create({
      fileName,
      url: uploadResult.url,
      thumbnail,
      type: mediaType,
      metadata,
      entityType: options.entityType,
      entityId: options.entityId,
      fieldName: options.fieldName,
      uploadedBy: options.uploadedBy,
      storageProvider: config.storageProvider as StorageProvider,
      storagePath,
      isProcessed,
      isActive: true,
    });

    return media.toJSON() as unknown as IMedia;
  }

  async uploadMultipleMedia(
    files: Express.Multer.File[],
    options: UploadMediaOptions
  ): Promise<IMedia[]> {
    const results: IMedia[] = [];

    for (const file of files) {
      const media = await this.uploadMedia(file, options);
      results.push(media);
    }

    return results;
  }

  async getMediaById(id: string): Promise<IMedia> {
    const media = await Media.findById(id);
    if (!media) {
      throw new NotFoundError("Media not found");
    }
    return media.toJSON() as unknown as IMedia;
  }

  async getMedia(query: MediaQueryOptions): Promise<{
    data: IMedia[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      entityType,
      entityId,
      fieldName,
      uploadedBy,
      type,
      isActive = true,
      page = 1,
      limit = 20,
    } = query;

    const filter: Record<string, unknown> = { isActive };
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (fieldName) filter.fieldName = fieldName;
    if (uploadedBy) filter.uploadedBy = uploadedBy;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Media.countDocuments(filter),
    ]);

    return {
      data: data.map((d) => d.toJSON() as unknown as IMedia),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMediaByEntity(
    entityType: EntityType,
    entityId: string,
    fieldName?: string
  ): Promise<IMedia[]> {
    const filter: Record<string, unknown> = {
      entityType,
      entityId,
      isActive: true,
    };
    if (fieldName) filter.fieldName = fieldName;

    const media = await Media.find(filter).sort({ createdAt: -1 });
    return media.map((m) => m.toJSON() as unknown as IMedia);
  }

  async updateMedia(id: string, data: UpdateMediaOptions): Promise<IMedia> {
    const media = await Media.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!media) {
      throw new NotFoundError("Media not found");
    }

    return media.toJSON() as unknown as IMedia;
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await Media.findById(id);
    if (!media) {
      throw new NotFoundError("Media not found");
    }

    // Soft delete
    await Media.findByIdAndUpdate(id, { isActive: false });
  }

  async deleteMediaPermanently(id: string): Promise<void> {
    const media = await Media.findById(id).setOptions({ strictQuery: false });
    if (!media) {
      throw new NotFoundError("Media not found");
    }

    // Delete from storage
    await storageProvider.delete(media.storagePath);
    if (media.thumbnail?.url) {
      const thumbPath = media.storagePath.replace(/(\.[^.]+)$/, "-thumb.webp");
      await storageProvider.delete(thumbPath);
    }

    // Hard delete
    await Media.findByIdAndDelete(id);
  }

  async bulkDelete(
    ids: string[]
  ): Promise<{ deleted: number; failed: string[] }> {
    const media = await Media.find({ _id: { $in: ids } });
    const foundIds = media.map((m) => m._id.toString());
    const failedIds = ids.filter((id) => !foundIds.includes(id));

    if (foundIds.length > 0) {
      // Soft delete
      await Media.updateMany({ _id: { $in: foundIds } }, { isActive: false });
    }

    return {
      deleted: foundIds.length,
      failed: failedIds,
    };
  }

  async bulkDeletePermanently(
    ids: string[]
  ): Promise<{ deleted: number; failed: string[] }> {
    const media = await Media.find({ _id: { $in: ids } }).setOptions({
      strictQuery: false,
    });
    const paths = media.map((m) => m.storagePath);
    const foundIds = media.map((m) => m._id.toString());
    const failedIds = ids.filter((id) => !foundIds.includes(id));

    if (paths.length > 0) {
      await storageProvider.deleteMany(paths);
      await Media.deleteMany({ _id: { $in: foundIds } });
    }

    return {
      deleted: foundIds.length,
      failed: failedIds,
    };
  }

  async getSignedUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const media = await Media.findById(id);
    if (!media) {
      throw new NotFoundError("Media not found");
    }

    return storageProvider.getSignedUrl(media.storagePath, expiresIn);
  }
}

export const mediaService = new MediaService();
