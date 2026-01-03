import sharp from "sharp";
import config from "@config/dotenv.config";
import type { ProcessedFile } from "@media/media.type";

export interface ImageProcessingOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: "jpeg" | "png" | "webp";
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  fit?: keyof sharp.FitEnum;
}

const defaultThumbnailSizes: ThumbnailOptions[] = [
  { width: 150, height: 150, fit: "cover" },
  { width: 300, height: 200, fit: "cover" },
  { width: 600, height: 400, fit: "inside" },
];

export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedFile> {
  const {
    quality = config.imageProcessing.quality,
    maxWidth = config.imageProcessing.maxWidth,
    maxHeight = config.imageProcessing.maxHeight,
    format = "webp",
  } = options;

  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Resize if larger than max dimensions
  let processedImage = image;
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      processedImage = image.resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
  }

  // Convert to target format with quality
  let outputBuffer: Buffer;
  switch (format) {
    case "jpeg":
      outputBuffer = await processedImage.jpeg({ quality }).toBuffer();
      break;
    case "png":
      outputBuffer = await processedImage.png({ quality }).toBuffer();
      break;
    case "webp":
    default:
      outputBuffer = await processedImage.webp({ quality }).toBuffer();
      break;
  }

  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    metadata: {
      width: outputMetadata.width,
      height: outputMetadata.height,
      format: outputMetadata.format,
      size: outputBuffer.length,
    },
  };
}

export async function generateThumbnails(
  buffer: Buffer,
  sizes: ThumbnailOptions[] = defaultThumbnailSizes
): Promise<{ buffer: Buffer; width: number; height: number }[]> {
  const thumbnails: { buffer: Buffer; width: number; height: number }[] = [];

  for (const size of sizes) {
    const thumbnail = await sharp(buffer)
      .resize(size.width, size.height, {
        fit: size.fit || "cover",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();

    const meta = await sharp(thumbnail).metadata();
    thumbnails.push({
      buffer: thumbnail,
      width: meta.width || size.width,
      height: meta.height || size.height,
    });
  }

  return thumbnails;
}

export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: buffer.length,
  };
}

export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  const result = await processImage(buffer, {
    quality: config.imageProcessing.quality,
    maxWidth: config.imageProcessing.maxWidth,
    maxHeight: config.imageProcessing.maxHeight,
    format: "webp",
  });
  return result.buffer;
}

export async function createThumbnail(
  buffer: Buffer,
  width: number = config.imageProcessing.thumbnailWidth,
  height: number = config.imageProcessing.thumbnailHeight
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();
}
