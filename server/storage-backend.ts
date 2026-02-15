/**
 * Unified storage backend abstraction.
 *
 * Auto-selects the appropriate file storage backend at startup:
 *   1. S3 — if S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY are set
 *   2. Replit Object Storage — if running on Replit (detected via REPL_ID env var)
 *   3. None — uploads disabled, warning logged
 *
 * The database schema columns (s3Key, s3Bucket) are reused as-is:
 *   - s3Key stores the object key (same format for both backends)
 *   - s3Bucket stores "replit" for Replit Object Storage, or the S3 bucket name
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { Readable } from "stream";

// ─── Storage Backend Interface ───────────────────────────────────────────────

interface StorageBackend {
  name: string;
  upload(buffer: Buffer, key: string, mimeType: string): Promise<{ key: string; bucket: string }>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  checkConnection(): Promise<void>;
}

// ─── Environment Detection ───────────────────────────────────────────────────

function hasS3Config(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

function isReplitEnvironment(): boolean {
  return !!(process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT);
}

// ─── S3 Backend ──────────────────────────────────────────────────────────────

function createS3Backend(): StorageBackend {
  const bucket = process.env.S3_BUCKET || "";
  const region = process.env.S3_REGION || "ap-southeast-2";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
  const endpoint = process.env.S3_ENDPOINT;

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region,
    credentials: { accessKeyId, secretAccessKey },
  };
  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle = true; // Required for MinIO / non-AWS endpoints
  }

  const client = new S3Client(config);

  return {
    name: "S3",

    async upload(buffer, key, mimeType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );
      return { key, bucket };
    },

    async download(key) {
      const response = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      // Convert the readable stream to a Buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key })
      );
    },

    async checkConnection() {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      console.log(`[Storage] Connected to S3 bucket "${bucket}" in region "${region}"`);
    },
  };
}

// ─── Replit Object Storage Backend ───────────────────────────────────────────

async function createReplitBackend(): Promise<StorageBackend> {
  // Dynamic import to avoid errors when running outside Replit
  const { Client } = await import("@replit/object-storage");
  const client = new Client();

  return {
    name: "Replit Object Storage",

    async upload(buffer, key, _mimeType) {
      const result = await client.uploadFromBytes(key, buffer);
      if (!result.ok) {
        throw new Error(`Replit storage upload failed: ${result.error}`);
      }
      return { key, bucket: "replit" };
    },

    async download(key) {
      const result = await client.downloadAsBytes(key);
      if (!result.ok) {
        throw new Error(`Replit storage download failed: ${result.error}`);
      }
      // downloadAsBytes returns a tuple [Buffer]
      return result.value[0];
    },

    async delete(key) {
      const result = await client.delete(key);
      if (!result.ok) {
        throw new Error(`Replit storage delete failed: ${result.error}`);
      }
    },

    async checkConnection() {
      const result = await client.list({ maxResults: 1 });
      if (!result.ok) {
        throw new Error(`Replit storage connection check failed: ${result.error}`);
      }
      console.log("[Storage] Connected to Replit Object Storage");
    },
  };
}

// ─── Backend Singleton ───────────────────────────────────────────────────────

let activeBackend: StorageBackend | null = null;
let backendInitialised = false;

async function getBackend(): Promise<StorageBackend> {
  if (!backendInitialised) {
    backendInitialised = true;
    if (hasS3Config()) {
      activeBackend = createS3Backend();
    } else if (isReplitEnvironment()) {
      activeBackend = await createReplitBackend();
    }
  }
  if (!activeBackend) {
    throw new Error("No storage backend configured");
  }
  return activeBackend;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check whether any storage backend is available (S3 or Replit).
 */
export function isStorageConfigured(): boolean {
  return hasS3Config() || isReplitEnvironment();
}

/**
 * Verify storage connectivity at startup. Logs the active backend name.
 */
export async function checkStorageConnection(): Promise<void> {
  if (!isStorageConfigured()) {
    console.warn("[Storage] No storage configured — document upload features will be unavailable");
    return;
  }

  try {
    const backend = await getBackend();
    await backend.checkConnection();
  } catch (err: any) {
    console.error(`[Storage] Connection check failed:`, err.message);
    throw new Error(`Storage health check failed: ${err.message}`);
  }
}

/**
 * Generate a unique object key for a document upload.
 * Format: documents/{uuid}.{ext}
 */
export function generateStorageKey(originalFilename: string): string {
  const ext = originalFilename.split(".").pop()?.toLowerCase() || "bin";
  return `documents/${randomUUID()}.${ext}`;
}

/**
 * Upload a file buffer to the active storage backend.
 * Returns the object key and bucket/backend identifier.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<{ key: string; bucket: string }> {
  const backend = await getBackend();
  return backend.upload(buffer, key, mimeType);
}

/**
 * Download a file from the active storage backend as a Buffer.
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const backend = await getBackend();
  return backend.download(key);
}

/**
 * Delete an object from the active storage backend.
 * Used for cleanup on DB failure or document deletion.
 */
export async function deleteFile(key: string): Promise<void> {
  const backend = await getBackend();
  await backend.delete(key);
}

/**
 * Get the name of the active storage backend (for logging).
 * Returns null if no backend is configured.
 */
export async function getBackendName(): Promise<string | null> {
  if (!isStorageConfigured()) return null;
  const backend = await getBackend();
  return backend.name;
}
