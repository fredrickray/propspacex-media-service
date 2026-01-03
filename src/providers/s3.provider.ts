import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageConfig } from "@config/storage.config";
import type { StorageProvider } from "./index";
import type { UploadResult, MediaThumbnail } from "@media/media.type";

export class S3Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: storageConfig.s3.region,
      credentials: {
        accessKeyId: storageConfig.s3.credentials.accessKeyId,
        secretAccessKey: storageConfig.s3.credentials.secretAccessKey,
      },
    });
    this.bucket = storageConfig.s3.bucket;
  }

  async upload(
    buffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<{ url: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.client.send(command);

    const url = `https://${this.bucket}.s3.${storageConfig.s3.region}.amazonaws.com/${key}`;

    return { url, key };
  }

  async uploadWithThumbnails(
    buffer: Buffer,
    key: string,
    mimeType: string,
    thumbnails: { buffer: Buffer; width: number; height: number }[]
  ): Promise<UploadResult> {
    // Upload main file
    const { url } = await this.upload(buffer, key, mimeType);

    // Upload thumbnails
    const uploadedThumbnails: MediaThumbnail[] = [];
    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i];
      const thumbKey = key.replace(
        /(\.[^.]+)$/,
        `-thumb-${thumb.width}x${thumb.height}$1`
      );
      const { url: thumbUrl } = await this.upload(
        thumb.buffer,
        thumbKey,
        "image/webp"
      );
      uploadedThumbnails.push({
        url: thumbUrl,
        width: thumb.width,
        height: thumb.height,
      });
    }

    return {
      url,
      key,
      thumbnailUrl: uploadedThumbnails[0]?.url,
      thumbnails: uploadedThumbnails,
    };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const command = new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    });

    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
