import multer from "multer";
import type { Request } from "express";

// ─── Configuration ────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB per file
const MAX_FILES = 10; // max files per upload request

// Allowed MIME types → file extensions mapping
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/png": "png",
  "image/jpeg": "jpg",
};

// ─── Multer Setup ─────────────────────────────────────────────────────────────

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed types: PDF, DOCX, XLSX, PNG, JPG`
      )
    );
  }
}

/**
 * Multer middleware configured for document uploads.
 * Use as: upload.array("files", MAX_FILES)
 *
 * Files are stored in memory (buffer) for immediate storage upload.
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

export { MAX_FILE_SIZE, MAX_FILES, ALLOWED_TYPES };
