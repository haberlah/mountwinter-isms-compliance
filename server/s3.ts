import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// ─── Configuration ────────────────────────────────────────────────────────────

const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_REGION = process.env.S3_REGION || "ap-southeast-2";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const S3_ENDPOINT = process.env.S3_ENDPOINT; // optional — for non-AWS S3-compatible services

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    const config: ConstructorParameters<typeof S3Client>[0] = {
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    };
    if (S3_ENDPOINT) {
      config.endpoint = S3_ENDPOINT;
      config.forcePathStyle = true; // Required for MinIO / non-AWS endpoints
    }
    s3Client = new S3Client(config);
  }
  return s3Client;
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export function isS3Configured(): boolean {
  return !!(S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

/**
 * Verify S3 connectivity at startup. Throws if the bucket is unreachable.
 */
export async function checkS3Connection(): Promise<void> {
  if (!isS3Configured()) {
    console.warn("[S3] S3 is not configured — document upload features will be unavailable");
    return;
  }

  try {
    const client = getClient();
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`[S3] Connected to bucket "${S3_BUCKET}" in region "${S3_REGION}"`);
  } catch (err: any) {
    console.error(`[S3] Failed to connect to bucket "${S3_BUCKET}":`, err.message);
    throw new Error(`S3 health check failed: ${err.message}`);
  }
}

// ─── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate a unique S3 object key for a document upload.
 * Format: documents/{uuid}.{ext}
 */
export function generateS3Key(originalFilename: string): string {
  const ext = originalFilename.split(".").pop()?.toLowerCase() || "bin";
  return `documents/${randomUUID()}.${ext}`;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to S3. Returns the S3 key used.
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<{ key: string; bucket: string }> {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return { key, bucket: S3_BUCKET };
}

// ─── Download (presigned URL) ─────────────────────────────────────────────────

/**
 * Generate a presigned GET URL for downloading a document.
 * Default expiry: 15 minutes.
 */
export async function getDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete an object from S3. Used for cleanup on DB failure.
 */
export async function deleteFromS3(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}
