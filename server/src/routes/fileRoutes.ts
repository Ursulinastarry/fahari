import { Router, Request, Response } from "express";
import { getFileFromDatabase } from "../services/fileService";
import asyncHandler from "../middlewares/asyncHandler";

const router = Router();

/**
 * GET /api/files/:fileId
 * Retrieve file from database
 */
router.get("/:fileId", asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;

  const file = await getFileFromDatabase(fileId);

  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  // Set headers
  res.setHeader("Content-Type", file.mimetype || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${file.filename}"`);
  res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

  // Send file data
  res.send(file.data);
}));

export default router;
