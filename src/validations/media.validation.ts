import { z } from "zod";

export const uploadMediaSchema = z.object({
  body: z.object({
    entityType: z.enum(["user", "property"]),
    entityId: z.string().min(1, "Entity ID is required"),
    fieldName: z.string().min(1, "Field name is required"),
  }),
});

export const updateMediaSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Media ID is required"),
  }),
  body: z.object({
    isActive: z.boolean().optional(),
    isProcessed: z.boolean().optional(),
  }),
});

export const getMediaSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Media ID is required"),
  }),
});

export const deleteMediaSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Media ID is required"),
  }),
});

export const queryMediaSchema = z.object({
  query: z.object({
    entityType: z.enum(["user", "property"]).optional(),
    entityId: z.string().optional(),
    fieldName: z.string().optional(),
    uploadedBy: z.string().optional(),
    type: z.enum(["image", "video", "document"]).optional(),
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const bulkDeleteSchema = z.object({
  body: z.object({
    ids: z
      .array(z.string())
      .min(1, "At least one ID is required")
      .max(50, "Maximum 50 items allowed"),
    permanent: z.boolean().optional().default(false),
  }),
});

export const getByEntitySchema = z.object({
  params: z.object({
    entityType: z.enum(["user", "property"]),
    entityId: z.string().min(1, "Entity ID is required"),
  }),
  query: z.object({
    fieldName: z.string().optional(),
  }),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type QueryMediaInput = z.infer<typeof queryMediaSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type GetByEntityInput = z.infer<typeof getByEntitySchema>;
