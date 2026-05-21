// src/services/reportService.ts
// 🔥 리포트 생성 서비스: PDF/CSV 자동 생성
//
// 🎯 핵심 원칙:
// - 멱등성 보장 (teamId + yyyyMM + format = 유니크 키)
// - 리포트 생성과 발송 완전 분리
// - 생성 완료 후 Outbox에 등록

import { collection, doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import type { MonthlyReportArtifact, GenerateReportParams, GenerateReportResult } from "@/domain/report/types";
import { generateMonthlyReportCSV, generateMonthlyReportPDF } from "@/utils/reportGenerator";

/**
 * 리포트 생성 (멱등성 보장)
 * 
 * 🔥 동작:
 * - 이미 존재하면 그대로 반환
 * - 없으면 생성 후 저장
 * 
 * @param params 리포트 생성 파라미터
 * @returns 생성 결과
 */
export async function generateMonthlyReport(
  params: GenerateReportParams
): Promise<GenerateReportResult> {
  const { teamId, yyyyMM, format, forceRegenerate = false } = params;
  
  // 멱등 키 생성
  const artifactId = `${teamId}:${yyyyMM}:${format}`;
  const artifactRef = doc(collection(db, "monthlyReports"), artifactId);
  
  // 기존 레코드 확인
  const existing = await getDoc(artifactRef);
  
  if (existing.exists() && !forceRegenerate) {
    const existingData = existing.data() as MonthlyReportArtifact;
    console.log(`[Report] 기존 리포트 반환: ${artifactId}`);
    return {
      artifact: existingData,
      isNew: false,
    };
  }
  
  // 리포트 데이터 조회
  const reportData = await fetchMonthlyReportData(teamId, yyyyMM);
  
  // 리포트 생성
  let fileBuffer: ArrayBuffer;
  let mimeType: string;
  let fileName: string;
  
  if (format === "CSV") {
    const csv = await generateMonthlyReportCSV(reportData);
    fileBuffer = new TextEncoder().encode(csv);
    mimeType = "text/csv";
    fileName = `report-${teamId}-${yyyyMM}.csv`;
  } else {
    const pdf = await generateMonthlyReportPDF(reportData);
    fileBuffer = pdf;
    mimeType = "application/pdf";
    fileName = `report-${teamId}-${yyyyMM}.pdf`;
  }
  
  // Cloud Storage에 업로드
  const storage = getStorage();
  const storageKey = `reports/${teamId}/${yyyyMM}/${fileName}`;
  const storageRef = ref(storage, storageKey);
  
  await uploadBytes(storageRef, fileBuffer, {
    contentType: mimeType,
    cacheControl: "public, max-age=31536000", // 1년
  });
  
  // Presigned URL 생성 (7일 유효)
  const url = await getDownloadURL(storageRef);
  
  // Artifact 레코드 저장
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
  
  const artifact: MonthlyReportArtifact = {
    id: artifactId,
    teamId,
    yyyyMM,
    format,
    storageKey,
    url,
    size: fileBuffer.byteLength,
    mimeType,
    createdAt: now,
    expiresAt,
  };
  
  await setDoc(artifactRef, {
    ...artifact,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  
  console.log(`[Report] 리포트 생성 완료: ${artifactId}`, {
    format,
    size: fileBuffer.byteLength,
    url,
  });
  
  return {
    artifact,
    isNew: true,
  };
}

/**
 * 월간 리포트 데이터 조회
 */
async function fetchMonthlyReportData(teamId: string, yyyyMM: string) {
  // TODO: 실제 데이터 조회 로직
  // - 회비 납부/미납 현황
  // - 멤버 현황
  // - 알림 통계 등
  
  // 스텁 데이터
  return {
    teamId,
    yyyyMM,
    memberStats: {
      total: 40,
      active: 35,
      paused: 3,
      deleted: 2,
    },
    feeStats: {
      baseAmount: 20000,
      targetCount: 35,
      paidCount: 30,
      unpaidCount: 5,
      expectedAmount: 700000,
      paidAmount: 600000,
      unpaidAmount: 100000,
    },
    alerts: [
      { type: "UNPAID_2_MONTHS", count: 2 },
      { type: "PAUSED_OVER_3_MONTHS", count: 1 },
      { type: "ANNUAL_FEE_UNPAID", count: 4 },
    ],
  };
}

