import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { storageConfig } from "@config/storage.config";
import type { StorageProvider } from "./index";
import type { UploadResult, MediaThumbnail } from "@media/media.type";

export class CloudinaryProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: storageConfig.cloudinary.cloud_name,
      api_key: storageConfig.cloudinary.api_key,
      api_secret: storageConfig.cloudinary.api_secret,
    });
  }

  private uploadToCloudinary(
    buffer: Buffer,
    publicId: string,
    resourceType: "image" | "video" | "raw" = "image"
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          overwrite: true,
        },
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error("Upload failed with no result"));
        }
      );

      uploadStream.end(buffer);
    });
  }

  async upload(
    buffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<{ url: string; key: string }> {
    const resourceType = this.getResourceType(mimeType);
    const publicId = key.replace(/\.[^.]+$/, ""); // Remove extension

    const result = await this.uploadToCloudinary(
      buffer,
      publicId,
      resourceType
    );

    return {
      url: result.secure_url,
      key: result.public_id,
    };
  }

  async uploadWithThumbnails(
    buffer: Buffer,
    key: string,
    mimeType: string,
    thumbnails: { buffer: Buffer; width: number; height: number }[]
  ): Promise<UploadResult> {
    const { url, key: uploadedKey } = await this.upload(buffer, key, mimeType);

    // Cloudinary generates thumbnails via transformations, but we can also upload pre-generated ones
    const uploadedThumbnails: MediaThumbnail[] = [];
    for (const thumb of thumbnails) {
      const thumbKey = `${uploadedKey}-thumb-${thumb.width}x${thumb.height}`;
      const thumbResult = await this.uploadToCloudinary(
        thumb.buffer,
        thumbKey,
        "image"
      );
      uploadedThumbnails.push({
        url: thumbResult.secure_url,
        width: thumb.width,
        height: thumb.height,
      });
    }

    // Alternatively, use Cloudinary transformations
    const cloudinaryThumbnail = cloudinary.url(uploadedKey, {
      width: 300,
      height: 200,
      crop: "fill",
      format: "webp",
    });

    return {
      url,
      key: uploadedKey,
      thumbnailUrl: cloudinaryThumbnail,
      thumbnails:
        uploadedThumbnails.length > 0
          ? uploadedThumbnails
          : [
              {
                url: cloudinaryThumbnail,
                width: 300,
                height: 200,
              },
            ],
    };
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await cloudinary.api.delete_resources(keys);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const expireAt = Math.floor(Date.now() / 1000) + expiresIn;
    return cloudinary.url(key, {
      sign_url: true,
      type: "authenticated",
      expires_at: expireAt,
    });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await cloudinary.api.resource(key);
      return true;
    } catch {
      return false;
    }
  }

  private getResourceType(mimeType: string): "image" | "video" | "raw" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    return "raw";
  }
}
