import { Router } from "express";
import { mediaController } from "./media.controller";
import { uploadSingle, uploadMultiple } from "@middlewares/upload.middleware";

const router = Router();

// Upload routes
router.post(
  "/upload",
  uploadSingle,
  mediaController.uploadSingle.bind(mediaController)
);
router.post(
  "/upload/multiple",
  uploadMultiple,
  mediaController.uploadMultiple.bind(mediaController)
);

// Query routes
router.get("/", mediaController.getMedia.bind(mediaController));
router.get("/:id", mediaController.getMediaById.bind(mediaController));
router.get(
  "/entity/:entityType/:entityId",
  mediaController.getMediaByEntity.bind(mediaController)
);
router.get(
  "/:id/signed-url",
  mediaController.getSignedUrl.bind(mediaController)
);

// Update routes
router.patch("/:id", mediaController.updateMedia.bind(mediaController));

// Delete routes
router.delete("/:id", mediaController.deleteMedia.bind(mediaController));
router.delete(
  "/:id/permanent",
  mediaController.deleteMediaPermanently.bind(mediaController)
);
router.post("/bulk-delete", mediaController.bulkDelete.bind(mediaController));

export default router;
