import mongoose, { Schema } from "mongoose";
import type { IMediaDocument } from "./media.type";
import { MediaType, EntityType, StorageProvider } from "./media.type";

const mediaThumbnailSchema = new Schema(
  {
    url: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const mediaDimensionsSchema = new Schema(
  {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const mediaMetadataSchema = new Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    dimensions: { type: mediaDimensionsSchema },
    duration: { type: Number },
    format: { type: String },
  },
  { _id: false }
);

const mediaSchema = new Schema<IMediaDocument>(
  {
    // File info
    fileName: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: mediaThumbnailSchema,
      required: true,
    },

    // File metadata
    type: {
      type: String,
      enum: Object.values(MediaType),
      required: true,
      index: true,
    },
    metadata: {
      type: mediaMetadataSchema,
      required: true,
    },

    // Entity relationship
    entityType: {
      type: String,
      enum: Object.values(EntityType),
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    fieldName: {
      type: String,
      required: true,
    },

    // Tracking
    uploadedBy: {
      type: String,
      required: true,
      index: true,
    },
    storageProvider: {
      type: String,
      enum: Object.values(StorageProvider),
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },

    // Status
    isProcessed: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret): Record<string, unknown> => {
        const transformed = { ...ret, id: ret._id };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, __v, ...rest } = transformed;
        return rest;
      },
    },
  }
);

// Indexes for common queries
mediaSchema.index({ entityType: 1, entityId: 1, fieldName: 1 });
mediaSchema.index({ uploadedBy: 1, type: 1, createdAt: -1 });
mediaSchema.index({ isActive: 1, createdAt: -1 });

// Soft delete - exclude inactive documents by default
mediaSchema.pre("find", function () {
  this.where({ isActive: true });
});

mediaSchema.pre("findOne", function () {
  this.where({ isActive: true });
});

export const Media = mongoose.model<IMediaDocument>("Media", mediaSchema);
