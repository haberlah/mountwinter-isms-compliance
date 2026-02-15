import { createHash } from "crypto";

// ─── File Hashing ─────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hex digest of a file buffer for deduplication.
 */
export function computeFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// ─── Text Extraction ──────────────────────────────────────────────────────────

interface ExtractionResult {
  text: string;
  pageCount?: number;
}

/**
 * Extract plain text from a document buffer based on its MIME type.
 * Returns the extracted text and (for PDFs) page count.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  switch (mimeType) {
    case "application/pdf":
      return extractFromPdf(buffer);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractFromDocx(buffer);

    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return extractFromXlsx(buffer);

    case "image/png":
    case "image/jpeg":
      // No OCR for now — store metadata only
      return { text: `[Image file — text extraction not available]` };

    default:
      return { text: "" };
  }
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const info = await parser.getInfo();
  const textResult = await parser.getText();
  await parser.destroy();
  return {
    text: textResult.text,
    pageCount: info.total,
  };
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

async function extractFromXlsx(buffer: Buffer): Promise<ExtractionResult> {
  // Lightweight XLSX parsing without a full library —
  // The xlsx package isn't in deps, so we'll do a basic unzip + XML parse approach.
  // For now, use a simpler representation.
  // TODO: Consider adding 'xlsx' package if richer extraction is needed
  return {
    text: `[Spreadsheet file — basic text extraction. Content available for manual review.]`,
  };
}

// ─── Text Sanitisation ────────────────────────────────────────────────────────

/**
 * Suspicious patterns that may indicate prompt injection attempts.
 * These are stripped from text before sending to Claude.
 */
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?prior\s+instructions/gi,
  /disregard\s+(all\s+)?previous/gi,
  /you\s+are\s+now\s+a/gi,
  /system\s*:\s*/gi,
  /assistant\s*:\s*/gi,
  /human\s*:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,
  /\bprompt\s+injection\b/gi,
  /\bjailbreak\b/gi,
];

const MAX_TEXT_LENGTH = 500_000; // 500k characters max

/**
 * Sanitise extracted text before sending to AI.
 * - Strips control characters
 * - Truncates to safe length
 * - Removes potential prompt injection patterns
 * - Logs warnings for suspicious content
 */
export function sanitiseTextForAI(text: string, filename?: string): string {
  if (!text) return "";

  let sanitised = text;

  // Strip control characters (keep newlines, tabs, carriage returns)
  sanitised = sanitised.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Check for and strip suspicious patterns
  let suspiciousCount = 0;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = sanitised.match(pattern);
    if (matches) {
      suspiciousCount += matches.length;
      sanitised = sanitised.replace(pattern, "[REDACTED]");
    }
  }

  if (suspiciousCount > 0) {
    console.warn(
      `[DocumentProcessor] Suspicious content detected in ${filename || "document"}: ` +
        `${suspiciousCount} pattern(s) redacted`
    );
  }

  // Truncate to maximum safe length
  if (sanitised.length > MAX_TEXT_LENGTH) {
    console.warn(
      `[DocumentProcessor] Text truncated from ${sanitised.length} to ${MAX_TEXT_LENGTH} characters`
    );
    sanitised = sanitised.slice(0, MAX_TEXT_LENGTH);
  }

  return sanitised;
}

// ─── Text Chunking ────────────────────────────────────────────────────────────

interface ChunkResult {
  content: string;
  chunkIndex: number;
  charStart: number;
  charEnd: number;
  sectionHeading: string | null;
  tokenCount: number;
}

interface ChunkOptions {
  maxTokensPerChunk?: number; // Default ~4,000 tokens
  overlapTokens?: number; // Default ~200 tokens
}

/**
 * Approximate token count. Rough heuristic: ~4 chars per token for English text.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extract a section heading from a line of text if it looks like a heading.
 */
function extractHeading(line: string): string | null {
  const trimmed = line.trim();
  // Markdown-style headings
  if (/^#{1,4}\s+/.test(trimmed)) {
    return trimmed.replace(/^#{1,4}\s+/, "");
  }
  // ALL-CAPS short lines (likely section titles)
  if (
    trimmed.length > 3 &&
    trimmed.length < 100 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed)
  ) {
    return trimmed;
  }
  // Numbered section headings (e.g. "1. Introduction", "3.2.1 Scope")
  if (/^\d+(\.\d+)*\.?\s+[A-Z]/.test(trimmed) && trimmed.length < 120) {
    return trimmed;
  }
  return null;
}

/**
 * Chunk text into segments suitable for AI analysis.
 *
 * Strategy:
 * - Split at paragraph boundaries (double newlines)
 * - Respect section headings — carry them forward as context
 * - Target ~4,000 tokens per chunk with ~200 token overlap
 * - Record char offsets for citation mapping
 */
export function chunkText(text: string, options?: ChunkOptions): ChunkResult[] {
  const maxTokens = options?.maxTokensPerChunk ?? 4000;
  const overlapTokens = options?.overlapTokens ?? 200;

  // If the entire text fits in one chunk, return as-is
  if (estimateTokens(text) <= maxTokens) {
    return [
      {
        content: text,
        chunkIndex: 0,
        charStart: 0,
        charEnd: text.length,
        sectionHeading: null,
        tokenCount: estimateTokens(text),
      },
    ];
  }

  // Split into paragraphs (double newline boundaries)
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: ChunkResult[] = [];

  let currentContent = "";
  let currentCharStart = 0;
  let currentCharEnd = 0;
  let currentHeading: string | null = null;
  let charOffset = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraTokens = estimateTokens(para);

    // Check if this paragraph looks like a heading
    const heading = extractHeading(para.split("\n")[0]);
    if (heading) {
      currentHeading = heading;
    }

    // Would adding this paragraph exceed the chunk limit?
    if (estimateTokens(currentContent) + paraTokens > maxTokens && currentContent.length > 0) {
      // Finalise current chunk
      chunks.push({
        content: currentContent.trim(),
        chunkIndex,
        charStart: currentCharStart,
        charEnd: currentCharEnd,
        sectionHeading: currentHeading,
        tokenCount: estimateTokens(currentContent),
      });
      chunkIndex++;

      // Overlap: carry trailing text from previous chunk
      const overlapChars = overlapTokens * 4;
      const overlapText =
        currentContent.length > overlapChars
          ? currentContent.slice(-overlapChars)
          : "";

      currentContent = overlapText;
      currentCharStart = currentCharEnd - overlapText.length;
    }

    // First paragraph in a new chunk — set start
    if (currentContent.length === 0) {
      currentCharStart = charOffset;
    }

    // Append paragraph
    if (currentContent.length > 0) {
      currentContent += "\n\n";
    }
    currentContent += para;
    charOffset += para.length + 2; // +2 for the double-newline separator
    currentCharEnd = Math.min(charOffset, text.length);
  }

  // Don't forget the final chunk
  if (currentContent.trim().length > 0) {
    chunks.push({
      content: currentContent.trim(),
      chunkIndex,
      charStart: currentCharStart,
      charEnd: currentCharEnd,
      sectionHeading: currentHeading,
      tokenCount: estimateTokens(currentContent),
    });
  }

  return chunks;
}
