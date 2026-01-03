import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import config from "@config/dotenv.config";
import { isAllowedMimeType } from "@utils/file.utils";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (isAllowedMimeType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${file.mimetype}' is not allowed`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
    files: config.maxFilesPerRequest,
  },
});

export const uploadSingle = upload.single("file");
export const uploadMultiple = upload.array("files", config.maxFilesPerRequest);
export const uploadFields = upload.fields([
  { name: "images", maxCount: config.maxFilesPerRequest },
  { name: "videos", maxCount: 5 },
  { name: "documents", maxCount: 5 },
]);
