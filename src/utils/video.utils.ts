import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import config from "@config/dotenv.config";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  codec: string;
  bitrate: number;
  fps: number;
}

export interface VideoProcessingOptions {
  maxDuration?: number;
  outputFormat?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  resolution?: string;
}

export function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );
      if (!videoStream) {
        reject(new Error("No video stream found"));
        return;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        format: metadata.format.format_name || "unknown",
        codec: videoStream.codec_name || "unknown",
        bitrate: (metadata.format.bit_rate || 0) / 1000, // kbps
        fps: videoStream.r_frame_rate ? eval(videoStream.r_frame_rate) : 0,
      });
    });
  });
}

export function validateVideoDuration(duration: number): boolean {
  return duration <= config.videoProcessing.maxDuration;
}

export function generateVideoThumbnail(
  inputPath: string,
  outputPath: string,
  timestamp: string = "00:00:01"
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: "thumbnail.png",
        folder: outputPath,
        size: "320x240",
      })
      .on("end", () => {
        resolve(`${outputPath}/thumbnail.png`);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

export function extractVideoThumbnailBuffer(
  inputPath: string,
  timestamp: string = "00:00:01"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const passThrough = new PassThrough();

    passThrough.on("data", (chunk) => chunks.push(chunk));
    passThrough.on("end", () => resolve(Buffer.concat(chunks)));
    passThrough.on("error", reject);

    ffmpeg(inputPath)
      .seekInput(timestamp)
      .frames(1)
      .format("image2pipe")
      .outputOptions(["-vcodec png"])
      .pipe(passThrough, { end: true })
      .on("error", reject);
  });
}

export function compressVideo(
  inputPath: string,
  outputPath: string,
  options: VideoProcessingOptions = {}
): Promise<string> {
  const {
    outputFormat = config.videoProcessing.outputFormat,
    videoBitrate = "1000k",
    audioBitrate = "128k",
    resolution = "1280x720",
  } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .format(outputFormat)
      .videoBitrate(videoBitrate)
      .audioBitrate(audioBitrate)
      .size(resolution)
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

export function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}
