/**
 * 브라우저에서 PDF / TXT / DOCX 텍스트 추출 (연혁 가져오기 등)
 *
 * PDF는 pdf.js 텍스트 레이어만 사용합니다. 스캔·사진 PDF는 지원하지 않습니다.
 * (브라우저 Worker·버퍼 전송 이슈로 인해 클라이언트 OCR 경로는 사용하지 않습니다.)
 */

import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/build/pdf.mjs";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/** pdf.js가 구조 오류로 거절한 경우(손상·비PDF·빈 파일 등) — UI에서 스캔 PDF와 구분 */
export class PdfInvalidStructureError extends Error {
  constructor(message = "유효하지 않은 PDF입니다. 크롬·Adobe에서 열리는지 확인하고, 확장자만 바꾼 파일은 아닌지 확인해 주세요.") {
    super(message);
    this.name = "PdfInvalidStructureError";
  }

  static isPdfJsInvalid(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const o = err as { name?: string; message?: string };
    if (o.name === "InvalidPDFException") return true;
    const m = String(o.message || "");
    return m.includes("Invalid PDF structure") || m.includes("Invalid Root reference") || m.includes("empty, i.e. its size is zero");
  }
}

/** 암호 걸린 PDF */
export class PdfPasswordRequiredError extends Error {
  constructor() {
    super("암호가 걸린 PDF는 지원하지 않습니다. 암호를 해제한 뒤 다시 시도해 주세요.");
    this.name = "PdfPasswordRequiredError";
  }

  static isPassword(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    return (err as { name?: string }).name === "PasswordException";
  }
}

/** PDF에서 문자열을 얻은 경로 (로그·디버깅용) */
export type PdfTextExtractionSource = "text_layer" | "empty";

/**
 * pdf.js가 원본 ArrayBuffer를 전송(transfer)해 분리(detach)하는 경우가 있어,
 * 호출자·재시도에 영향 없도록 복사본만 넘깁니다.
 */
function copyPdfBytes(data: ArrayBuffer): Uint8Array {
  return new Uint8Array(data.slice(0));
}

async function extractPdfTextLayer(data: ArrayBuffer): Promise<string> {
  const bytes = copyPdfBytes(data);
  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]> | undefined;
  try {
    pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      parts.push(line);
    }
    return parts.join("\n\n").trim();
  } catch (err) {
    if (err instanceof pdfjs.InvalidPDFException || PdfInvalidStructureError.isPdfJsInvalid(err)) {
      const detail = err instanceof Error ? err.message : "";
      throw new PdfInvalidStructureError(
        detail ? `PDF를 열 수 없습니다: ${detail}` : undefined
      );
    }
    if (PdfPasswordRequiredError.isPassword(err)) {
      throw new PdfPasswordRequiredError();
    }
    throw err;
  } finally {
    if (pdf) await pdf.destroy().catch(() => {});
  }
}

export async function extractTextFromPdfWithMeta(
  data: ArrayBuffer
): Promise<{ text: string; source: PdfTextExtractionSource }> {
  const text = await extractPdfTextLayer(data);
  const trimmed = text.trim();
  if (trimmed.length > 0) {
    return { text: trimmed, source: "text_layer" };
  }
  return { text: "", source: "empty" };
}

export async function extractTextFromPDF(data: ArrayBuffer): Promise<string> {
  const { text } = await extractTextFromPdfWithMeta(data);
  return text;
}

export async function extractTextFromDocx(data: ArrayBuffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ arrayBuffer: data });
  return (value || "").trim();
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/**
 * File 또는 Blob + 파일명으로 텍스트 추출
 */
export async function extractDocumentText(file: File | Blob, fileName: string): Promise<string> {
  const ext = extOf(fileName);
  const buf = await file.arrayBuffer();

  if (ext === "pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPDF(buf);
  }
  if (ext === "docx" || fileName.toLowerCase().endsWith(".docx")) {
    return extractTextFromDocx(buf);
  }
  if (ext === "txt" || fileName.toLowerCase().endsWith(".txt")) {
    return new TextDecoder("utf-8").decode(buf).trim();
  }

  const t = file instanceof File ? file.type : "";
  if (t === "application/pdf") return extractTextFromPDF(buf);
  if (
    t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    t === "application/msword"
  ) {
    return extractTextFromDocx(buf);
  }
  if (t.startsWith("text/")) {
    return new TextDecoder("utf-8").decode(buf).trim();
  }

  throw new Error("지원 형식: PDF, TXT, DOCX");
}
