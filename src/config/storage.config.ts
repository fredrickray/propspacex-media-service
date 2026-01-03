import config from "./dotenv.config";

export const storageConfig = {
  provider: config.storageProvider,

  s3: {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
    region: config.aws.region,
    bucket: config.aws.s3Bucket,
  },

  cloudinary: {
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  },

  local: {
    uploadPath: config.localUploadPath,
  },
} as const;

export type StorageConfig = typeof storageConfig;
