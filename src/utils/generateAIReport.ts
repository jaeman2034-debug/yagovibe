import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type AIProduct = {
  name: string;
  desc?: string;
  category?: string;
  price?: number;
  score?: number;
  createdAt?: Date;
};

function wrapText(text: string, maxChars = 80) {
  const regex = new RegExp(`(.{1,${maxChars}})(\s|$)`, "g");
  return text.replace(regex, "$1\n");
}

export async function buildReportPdf(product: AIProduct, analysisText: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("YAGO VIBE AI 분석 리포트", {
    x: 40,
    y: height - 70,
    size: 20,
    font: bold,
    color: rgb(0.1, 0.12, 0.18),
  });

  const metaLines = [
    `상품명 : ${product.name}`,
    `카테고리 : ${product.category || "-"}`,
    `가격 : ${product.price ? `${product.price}원` : "-"}`,
    `AI 점수 : ${product.score ?? "-"}`,
    `생성일 : ${new Date().toLocaleString()}`,
  ].join("\n");

  page.drawText(metaLines, {
    x: 40,
    y: height - 120,
    size: 12,
    font,
    lineHeight: 16,
  });

  const body = wrapText(analysisText, 80);
  page.drawText(body, {
    x: 40,
    y: height - 180,
    size: 12,
    font,
    lineHeight: 16,
  });

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
