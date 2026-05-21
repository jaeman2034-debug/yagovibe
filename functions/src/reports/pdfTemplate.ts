/**
 * PDF 템플릿 (reportlab)
 * 
 * 리포트 데이터를 PDF 문서로 변환
 */

import {
  SimpleDocTemplate,
  Paragraph,
  Spacer,
  Table,
  TableStyle,
  PageBreak,
} from "reportlab/platypus";
import { getSampleStyleSheet } from "reportlab/lib/styles";
import { colors } from "reportlab/lib";

export async function buildPdf(bufferPath: string, data: any): Promise<void> {
  const doc = new SimpleDocTemplate(bufferPath, {
    topMargin: 50,
    bottomMargin: 50,
    leftMargin: 50,
    rightMargin: 50,
  });

  const styles = getSampleStyleSheet();
  const story: any[] = [];

  // 제목
  story.push(new Paragraph("Executive Ethics & Policy Report", styles["Title"]));
  story.push(new Spacer(1, 12));

  // 기간
  story.push(
    new Paragraph(
      `Period: ${data.period.from.toISOString().split("T")[0]} ~ ${data.period.to.toISOString().split("T")[0]}`,
      styles["Normal"]
    )
  );
  story.push(new Spacer(1, 20));

  // Audit Events
  story.push(new Paragraph("Audit Events", styles["Heading2"]));
  story.push(new Paragraph(`Total: ${data.auditCount}`, styles["Normal"]));
  story.push(new Spacer(1, 12));

  // Ethics Summary
  story.push(new Paragraph("Ethics Decisions Summary", styles["Heading2"]));
  const ethicsData = [
    ["Verdict", "Count"],
    ["Allow", data.ethics.allow],
    ["Review Required", data.ethics.review],
    ["Block", data.ethics.block],
  ];
  const ethicsTable = new Table(ethicsData, [200, 100]);
  ethicsTable.setStyle(
    TableStyle([
      ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
      ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
      ("ALIGN", (0, 0), (-1, -1), "CENTER"),
      ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
      ("FONTSIZE", (0, 0), (-1, 0), 12),
      ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
      ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
      ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ])
  );
  story.push(ethicsTable);
  story.push(new Spacer(1, 12));

  // Top Ethics Reasons
  if (data.ethics.topReasons.length > 0) {
    story.push(new Paragraph("Top Ethics Reasons", styles["Heading3"]));
    data.ethics.topReasons.forEach(([r, c]: [string, number]) => {
      story.push(new Paragraph(`- ${r}: ${c}회`, styles["Normal"]));
    });
    story.push(new Spacer(1, 12));
  }

  // Approvals
  story.push(new Paragraph("Approval Requests", styles["Heading2"]));
  story.push(new Paragraph(`Total: ${data.approvals.total}`, styles["Normal"]));
  story.push(new Paragraph(`Pending: ${data.approvals.pending}`, styles["Normal"]));
  story.push(new Spacer(1, 12));

  // Latest Policy Change
  if (data.policy) {
    story.push(new Paragraph("Latest Policy Change Summary", styles["Heading3"]));
    const policy = data.policy as any;
    if (policy.simulationResult) {
      story.push(
        new Paragraph(
          `Risk Score: ${policy.simulationResult.riskScore ?? "N/A"}`,
          styles["Normal"]
        )
      );
      story.push(
        new Paragraph(
          `Allow/Review/Block: ${policy.simulationResult.allow ?? 0}/${policy.simulationResult.review ?? 0}/${policy.simulationResult.block ?? 0}`,
          styles["Normal"]
        )
      );
    }
    story.push(new Spacer(1, 12));
  }

  // Footer
  story.push(new Spacer(1, 20));
  story.push(
    new Paragraph(
      `Generated at: ${new Date().toISOString()}`,
      styles["Normal"]
    )
  );

  return new Promise<void>((resolve, reject) => {
    doc.build(story, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}










