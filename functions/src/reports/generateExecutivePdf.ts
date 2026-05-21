/**
 * 경영용 PDF 리포트 생성
 * 
 * 리포트 데이터를 수집하여 PDF로 변환하고 Storage에 저장
 */

import * as admin from "firebase-admin";
import * as os from "os";
import * as path from "path";
import { collectReportData } from "./reportData";
import { buildPdf } from "./pdfTemplate";

const db = admin.firestore();
const storage = admin.storage().bucket();

export async function generateExecutivePdf(input: {
  tenantId: string;
  from: Date;
  to: Date;
}): Promise<{ fileName: string; url: string }> {
  // 리포트 데이터 수집
  const data = await collectReportData(input);

  // 임시 파일 경로
  const fileName = `reports/${input.tenantId}_${Date.now()}.pdf`;
  const tmpPath = path.join(os.tmpdir(), path.basename(fileName));

  // PDF 생성
  await buildPdf(tmpPath, data);

  // Storage에 업로드
  await storage.upload(tmpPath, {
    destination: fileName,
    contentType: "application/pdf",
  });

  // Signed URL 생성 (7일 유효)
  const fileRef = storage.file(fileName);
  const [url] = await fileRef.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
  });

  // 리포트 메타데이터 저장
  await db.collection("_executiveReports").add({
    tenantId: input.tenantId,
    period: {
      from: admin.firestore.Timestamp.fromDate(input.from),
      to: admin.firestore.Timestamp.fromDate(input.to),
    },
    fileName,
    url,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { fileName, url };
}










