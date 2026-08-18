import type { TranscriptSegment } from "@/components/ai-growth/types";

/** Matches syncTranscriptText output: [00:08-00:12] coach line */
const TIMESTAMP_LINE = /^\[(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\]\s*(.+)$/;

function mmssToSeconds(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}

function splitManualTranscriptLines(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const byNewline = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;

  if (trimmed.length > 60) {
    const sentences = trimmed
      .split(/(?<=[.!?…])\s+|\s*[•·]\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (sentences.length > 1) return sentences;
  }

  return [trimmed];
}

/** Plain lines get 5s windows; timestamp lines preserve start/end. */
export function parseManualTranscriptSegments(raw: string): TranscriptSegment[] {
  const lines = splitManualTranscriptLines(raw);
  if (!lines.length) return [];

  const out: TranscriptSegment[] = [];
  let plainCursor = 0;

  for (const line of lines) {
    const match = line.match(TIMESTAMP_LINE);
    if (match) {
      const start = mmssToSeconds(Number(match[1]), Number(match[2]));
      const end = mmssToSeconds(Number(match[3]), Number(match[4]));
      const text = match[5].trim();
      if (text && end > start) {
        out.push({ id: `seg-${out.length + 1}`, start, end, text });
      }
      continue;
    }

    const start = plainCursor;
    const end = start + 5;
    plainCursor = end;
    out.push({ id: `seg-${out.length + 1}`, start, end, text: line });
  }

  return out;
}
