import prisma from "../config/prisma";
import fs from "fs";
import path from "path";

/**
 * Store file in database
 */
export const storeFileInDatabase = async (
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  type: "user" | "salon" | "review",
  relatedId: string,
  fileType?: "profile" | "cover" | "gallery"
) => {
  const size = fileBuffer.length;

  try {
    if (type === "user") {
      // one-to-one (userId is UNIQUE)
      return await prisma.userFile.upsert({
        where: { userId: relatedId },
        update: {
          data: fileBuffer,
          mimetype,
          filename,
          size,
        },
        create: {
          userId: relatedId,
          data: fileBuffer,
          mimetype,
          filename,
          size,
        },
      });
    }

    if (type === "salon") {
      return await prisma.salonFile.create({
        data: {
          salonId: relatedId,
          data: fileBuffer,
          mimetype,
          filename,
          size,
          type: fileType ?? "gallery",
        },
      });
    }

    if (type === "review") {
      return await prisma.reviewFile.create({
        data: {
          reviewId: relatedId,
          data: fileBuffer,
          mimetype,
          filename,
          size,
        },
      });
    }

    throw new Error("Invalid file type");
  } catch (error) {
    console.error("Error storing file in database:", error);
    throw error;
  }
};

/**
 * Retrieve file from database
 */
export const getFileFromDatabase = async (fileId: string) => {
  try {
    // Try salon file first
    let file: any = await prisma.salonFile.findUnique({
      where: { id: fileId },
    });
    if (file) return file;

    // Try user file
    file = await prisma.userFile.findUnique({
      where: { id: fileId },
    });
    if (file) return file;

    // Try review file
    file = await prisma.reviewFile.findUnique({
      where: { id: fileId },
    });
    if (file) return file;

    return null;
  } catch (error) {
    console.error("Error retrieving file from database:", error);
    throw error;
  }
};

/**
 * Delete file from database
 */
export const deleteFileFromDatabase = async (
  fileId: string,
  type?: "user" | "salon" | "review"
) => {
  try {
    if (type === "user") {
      await prisma.userFile.delete({ where: { id: fileId } });
    } else if (type === "salon") {
      await prisma.salonFile.delete({ where: { id: fileId } });
    } else if (type === "review") {
      await prisma.reviewFile.delete({ where: { id: fileId } });
    }
  } catch (error) {
    console.error("Error deleting file from database:", error);
    throw error;
  }
};

/**
 * Convert file path to base64 for temporary storage (for initial migration)
 */
export const fileToBuffer = async (filePath: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};
