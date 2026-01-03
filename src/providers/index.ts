import type { UploadResult } from "../v1/feat/media/media.type";
import config from "@config/dotenv.config";
import { S3Provider } from "./s3.provider";
import { CloudinaryProvider } from "./cloudinary.provider";
import { LocalProvider } from "./local.provider";

export interface StorageProvider {
  upload(
    buffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<{ url: string; key: string }>;

  uploadWithThumbnails(
    buffer: Buffer,
    key: string,
    mimeType: string,
    thumbnails: { buffer: Buffer; width: number; height: number }[]
  ): Promise<UploadResult>;

  delete(key: string): Promise<void>;

  deleteMany(keys: string[]): Promise<void>;

  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  exists(key: string): Promise<boolean>;
}

export { S3Provider, CloudinaryProvider, LocalProvider };

export function createStorageProvider(): StorageProvider {
  switch (config.storageProvider) {
    case "s3":
      return new S3Provider();
    case "cloudinary":
      return new CloudinaryProvider();
    case "local":
    default:
      return new LocalProvider();
  }
}

export const storageProvider = createStorageProvider();
