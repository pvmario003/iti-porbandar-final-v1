/// <reference types="vite/client" />
import { supabase, isSupabaseConfigured, verifyConnection } from "../lib/supabase";

export { supabase, isSupabaseConfigured, verifyConnection };

// Buckets mapping
export const BUCKETS = {
  PHOTOS: "student-photos",
  DOCUMENTS: "student-documents",
  LETTERS: "letter-files"
};

/**
 * Utility to convert base64 to Blob
 */
export function base64ToBlob(base64: string, contentType = ""): Blob {
  // If the base64 string includes data url prefix, strip it
  const base64Clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const byteCharacters = atob(base64Clean);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

/**
 * Upload a student document/photo file to Supabase storage.
 * Supports File object or Base64 string.
 */
export async function uploadToStorage(
  bucketName: string,
  filePath: string,
  fileOrBase64: File | string,
  contentType?: string
): Promise<string | null> {
  if (!isSupabaseConfigured) {
    console.warn("Supabase is not configured, skipping storage upload.");
    return null;
  }

  try {
    let fileBody: Blob | File;
    let type = contentType;

    if (typeof fileOrBase64 === "string") {
      // Determine content type from base64 prefix if possible
      if (fileOrBase64.startsWith("data:")) {
        const match = fileOrBase64.match(/data:([^;]+);base64,/);
        if (match) {
          type = match[1];
        }
      }
      fileBody = base64ToBlob(fileOrBase64, type || "application/octet-stream");
    } else {
      fileBody = fileOrBase64;
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBody, {
        upsert: true,
        contentType: type
      });

    if (error) {
      console.error(`Error uploading to bucket ${bucketName}:`, error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error("Storage upload failed:", err);
    throw new Error(`Failed to upload file to ${bucketName}: ${err.message}`);
  }
}

/**
 * Helper to delete a file from Supabase storage
 */
export async function deleteFromStorage(bucketName: string, filePath: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    if (error) {
      console.error(`Error deleting file from bucket ${bucketName}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Storage delete failed:", err);
    return false;
  }
}
