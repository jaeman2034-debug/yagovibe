function sanitizeOklchStyles(doc: Document): void {
  const nodes = doc.querySelectorAll<HTMLElement>("*");
  nodes.forEach((el) => {
    const style = doc.defaultView?.getComputedStyle(el);
    if (!style) return;
    const replaceIfOklch = (value: string, fallback: string) =>
      value.includes("oklch(") ? fallback : value;
    el.style.color = replaceIfOklch(style.color, "rgb(15, 23, 42)");
    el.style.backgroundColor = replaceIfOklch(style.backgroundColor, "rgb(255, 255, 255)");
    el.style.borderColor = replaceIfOklch(style.borderColor, "rgb(203, 213, 225)");
  });
}

const PDF_MARGIN_MM = 10;
/** html2canvas scale — slice bounds must use the same factor */
export const PDF_CANVAS_SCALE = 2;
const PDF_MIN_SLICE_PX = 48;
/** A4 printable width at 96dpi: (210mm − 2×10mm margin) ≈ 718px */
export const PDF_CONTENT_WIDTH_PX = 718;

type PdfSectionBounds = { top: number; bottom: number };

function collectPdfSectionBounds(root: HTMLElement, scale: number): PdfSectionBounds[] {
  const rootRect = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll<HTMLElement>(".yago-pdf-section"))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        top: Math.max(0, Math.round((r.top - rootRect.top) * scale)),
        bottom: Math.round((r.bottom - rootRect.top) * scale),
      };
    })
    .sort((a, b) => a.top - b.top);
}

/** Avoid slicing through .yago-pdf-section — move whole section to next page when possible */
function adjustSliceEnd(
  offsetY: number,
  pageSliceHeightPx: number,
  canvasHeight: number,
  sections: PdfSectionBounds[]
): number {
  const defaultEnd = Math.min(offsetY + pageSliceHeightPx, canvasHeight);
  if (defaultEnd >= canvasHeight) return defaultEnd;

  for (const { top, bottom } of sections) {
    if (bottom <= offsetY) continue;
    if (top >= defaultEnd) break;

    if (top < defaultEnd && bottom > defaultEnd) {
      const spaceBefore = top - offsetY;
      const sectionHeight = bottom - top;
      if (sectionHeight <= pageSliceHeightPx) {
        if (spaceBefore >= PDF_MIN_SLICE_PX) return top;
        if (top > offsetY) return top;
      }
    }
  }

  return defaultEnd;
}

/** Section/card — always span full PDF content column */
export const PDF_FULL_WIDTH_STYLE =
  "width:100%;max-width:100%;box-sizing:border-box;";

async function waitForIframeLayout(iframe: HTMLIFrameElement): Promise<void> {
  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    if (iframe.contentDocument?.readyState === "complete") resolve();
  });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 320));
}

function sliceCanvasToPdfPages(
  canvas: HTMLCanvasElement,
  pdf: InstanceType<Awaited<ReturnType<typeof import("jspdf")["default"]>>>,
  imgData: string,
  sections: PdfSectionBounds[] = []
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidthMm = pageWidth - PDF_MARGIN_MM * 2;
  const contentHeightMm = pageHeight - PDF_MARGIN_MM * 2;

  const pxPerMm = canvas.width / contentWidthMm;
  const pageSliceHeightPx = Math.floor(contentHeightMm * pxPerMm);

  if (pageSliceHeightPx <= 0 || canvas.height <= pageSliceHeightPx) {
    const imgHeightMm = (canvas.height * contentWidthMm) / canvas.width;
    pdf.addImage(
      imgData,
      "PNG",
      PDF_MARGIN_MM,
      PDF_MARGIN_MM,
      contentWidthMm,
      Math.min(imgHeightMm, contentHeightMm)
    );
    return;
  }

  const sliceCanvas = document.createElement("canvas");
  const ctx = sliceCanvas.getContext("2d");
  if (!ctx) throw new Error("PDF slice canvas를 초기화하지 못했습니다.");

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < canvas.height) {
    const sliceEnd = adjustSliceEnd(offsetY, pageSliceHeightPx, canvas.height, sections);
    const sliceHeight = Math.max(1, sliceEnd - offsetY);
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    );

    const sliceData = sliceCanvas.toDataURL("image/png");
    const sliceHeightMm = (sliceHeight * contentWidthMm) / canvas.width;

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(
      sliceData,
      "PNG",
      PDF_MARGIN_MM,
      PDF_MARGIN_MM,
      contentWidthMm,
      sliceHeightMm
    );

    offsetY += sliceHeight;
    pageIndex += 1;
  }
}

/** iframe + html2canvas + jsPDF — 한글 PDF 공통 렌더 */
async function renderHtmlToPdfCore(
  html: string,
  rootId: string
): Promise<{
  pdf: InstanceType<Awaited<ReturnType<typeof import("jspdf")["default"]>>>;
  cleanup: () => void;
}> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${PDF_CONTENT_WIDTH_PX + 80}px`;
  iframe.style.height = "400px";
  iframe.style.border = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const doc = iframe.contentDocument;
  if (!doc) {
    cleanup();
    throw new Error("PDF 렌더링 문서를 초기화하지 못했습니다.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  doc.documentElement.style.width = `${PDF_CONTENT_WIDTH_PX}px`;
  doc.documentElement.style.margin = "0";
  doc.body.style.width = `${PDF_CONTENT_WIDTH_PX}px`;
  doc.body.style.margin = "0";
  doc.body.style.overflow = "visible";

  await waitForIframeLayout(iframe);

  const target = doc.getElementById(rootId);
  if (!target) {
    cleanup();
    throw new Error("PDF 본문 요소를 찾지 못했습니다.");
  }

  const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, target.clientHeight) + 48;
  iframe.style.height = `${contentHeight}px`;
  iframe.style.width = `${PDF_CONTENT_WIDTH_PX + 80}px`;

  await waitForIframeLayout(iframe);

  const captureWidth = PDF_CONTENT_WIDTH_PX;
  const captureHeight = Math.max(target.scrollHeight, target.offsetHeight);

  const sectionBounds = collectPdfSectionBounds(target, PDF_CANVAS_SCALE);

  const canvas = await html2canvas(target, {
    scale: PDF_CANVAS_SCALE,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: captureWidth,
    height: captureHeight,
    windowWidth: captureWidth,
    windowHeight: captureHeight,
    onclone: (clonedDoc) => {
      sanitizeOklchStyles(clonedDoc);
      const root = clonedDoc.getElementById(rootId);
      if (root) {
        root.style.width = `${PDF_CONTENT_WIDTH_PX}px`;
        root.style.maxWidth = `${PDF_CONTENT_WIDTH_PX}px`;
        root.style.margin = "0";
      }
      clonedDoc.documentElement.style.width = `${PDF_CONTENT_WIDTH_PX}px`;
      clonedDoc.body.style.width = `${PDF_CONTENT_WIDTH_PX}px`;
    },
  });

  const imgData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  sliceCanvasToPdfPages(canvas, pdf, imgData, sectionBounds);
  cleanup();
  return { pdf, cleanup: () => {} };
}

/** Sprint D-1b — Storage upload용 PDF Blob */
export async function renderHtmlToPdfBlob(
  html: string,
  _filename: string,
  rootId: string
): Promise<Blob> {
  const { pdf } = await renderHtmlToPdfCore(html, rootId);
  return pdf.output("blob") as Blob;
}

export async function renderHtmlToPdf(html: string, filename: string, rootId: string): Promise<string> {
  const { pdf } = await renderHtmlToPdfCore(html, rootId);
  pdf.save(filename);
  return filename;
}

export function escapeHtmlForPdf(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** PDF section wrapper — avoid awkward card splits in print-oriented HTML */
export function pdfSection(innerHtml: string, extraStyle = ""): string {
  return `<div class="yago-pdf-section" style="page-break-inside:avoid;break-inside:avoid;-webkit-column-break-inside:avoid;margin-bottom:20px;${extraStyle}">${innerHtml}</div>`;
}
