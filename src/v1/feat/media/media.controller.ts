import { Request, Response, NextFunction } from "express";
import { mediaService } from "./media.service";
import type { MediaQueryOptions } from "./media.service";
import {
  uploadMediaSchema,
  updateMediaSchema,
  queryMediaSchema,
  bulkDeleteSchema,
  getByEntitySchema,
} from "@validations/media.validation";
import { BadRequestError } from "@middlewares/error.middleware";
import { EntityType, MediaType } from "./media.type";

export class MediaController {
  async uploadSingle(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError("No file uploaded");
      }

      const { body } = uploadMediaSchema.parse({ body: req.body });
      const uploadedBy = (req.headers["x-user-id"] as string) || "anonymous";

      const media = await mediaService.uploadMedia(req.file, {
        entityType: body.entityType as EntityType,
        entityId: body.entityId,
        fieldName: body.fieldName,
        uploadedBy,
      });

      res.status(201).json({
        success: true,
        message: "Media uploaded successfully",
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadMultiple(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new BadRequestError("No files uploaded");
      }

      const { body } = uploadMediaSchema.parse({ body: req.body });
      const uploadedBy = (req.headers["x-user-id"] as string) || "anonymous";

      const media = await mediaService.uploadMultipleMedia(files, {
        entityType: body.entityType as EntityType,
        entityId: body.entityId,
        fieldName: body.fieldName,
        uploadedBy,
      });

      res.status(201).json({
        success: true,
        message: `${media.length} media files uploaded successfully`,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { query } = queryMediaSchema.parse({ query: req.query });

      // Convert string values to enum types
      const serviceQuery: MediaQueryOptions = {
        page: query.page,
        limit: query.limit,
        isActive: query.isActive,
        uploadedBy: query.uploadedBy,
        entityId: query.entityId,
        fieldName: query.fieldName,
      };

      if (query.entityType) {
        serviceQuery.entityType =
          query.entityType === "user" ? EntityType.USER : EntityType.PROPERTY;
      }

      if (query.type) {
        serviceQuery.type =
          query.type === "image"
            ? MediaType.IMAGE
            : query.type === "video"
            ? MediaType.VIDEO
            : MediaType.DOCUMENT;
      }

      const result = await mediaService.getMedia(serviceQuery);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMediaById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const media = await mediaService.getMediaById(id);

      res.json({
        success: true,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMediaByEntity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { params, query } = getByEntitySchema.parse({
        params: req.params,
        query: req.query,
      });

      const media = await mediaService.getMediaByEntity(
        params.entityType as EntityType,
        params.entityId,
        query.fieldName
      );

      res.json({
        success: true,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { params, body } = updateMediaSchema.parse({
        params: req.params,
        body: req.body,
      });

      const media = await mediaService.updateMedia(params.id, body);

      res.json({
        success: true,
        message: "Media updated successfully",
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await mediaService.deleteMedia(id);

      res.json({
        success: true,
        message: "Media deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMediaPermanently(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await mediaService.deleteMediaPermanently(id);

      res.json({
        success: true,
        message: "Media permanently deleted",
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { body } = bulkDeleteSchema.parse({ body: req.body });

      const result = body.permanent
        ? await mediaService.bulkDeletePermanently(body.ids)
        : await mediaService.bulkDelete(body.ids);

      res.json({
        success: true,
        message: `${result.deleted} media files deleted`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSignedUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
      const url = await mediaService.getSignedUrl(id, expiresIn);

      res.json({
        success: true,
        data: { url },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();
