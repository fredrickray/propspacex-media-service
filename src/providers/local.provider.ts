import fs from "fs/promises";
import path from "path";
import { storageConfig } from "@config/storage.config";
import config from "@config/dotenv.config";
import type { StorageProvider } from "./index";
import type { UploadResult, MediaThumbnail } from "@media/media.type";
export class LocalProvider implements StorageProvider {
  private uploadPath: string;
  private baseUrl: string;

  constructor() {
    this.uploadPath = path.resolve(
      process.cwd(),
      storageConfig.local.uploadPath
    );
    this.baseUrl = `http://localhost:${config.port}/uploads`;
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.uploadPath, key);
  }

  async upload(
    buffer: Buffer,
    key: string,
    _mimeType: string
  ): Promise<{ url: string; key: string }> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    const url = `${this.baseUrl}/${key}`;

    return { url, key };
  }

  async uploadWithThumbnails(
    buffer: Buffer,
    key: string,
    mimeType: string,
    thumbnails: { buffer: Buffer; width: number; height: number }[]
  ): Promise<UploadResult> {
    const { url } = await this.upload(buffer, key, mimeType);

    const uploadedThumbnails: MediaThumbnail[] = [];
    for (const thumb of thumbnails) {
      const thumbKey = key.replace(
        /(\.[^.]+)$/,
        `-thumb-${thumb.width}x${thumb.height}.webp`
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
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(key)));
  }

  async getSignedUrl(key: string, _expiresIn: number = 3600): Promise<string> {
    // Local storage doesn't support signed URLs
    // Return the direct URL
    return `${this.baseUrl}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
