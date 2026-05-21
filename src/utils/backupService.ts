// src/utils/backupService.ts
// 🔒 데이터 백업 & 복구 (최후의 안전망)

import { collection, query, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { type TeamMember } from "./teamRules";

export interface BackupManifest {
  teamId: string;
  yyyymm: string;
  backupDate: string;
  files: {
    members: string; // JSON 파일 경로
    ledger: string;
    attendance: string;
    report?: string; // PDF 파일 경로
  };
  metadata: {
    totalMembers: number;
    totalRevenue: number;
    ruleVersion: string;
  };
}

// 🔒 1. 월간 백업 실행 (정산 후 자동)
export async function createMonthlyBackup(
  teamId: string,
  yyyymm: string,
  pdfBlob?: Blob
): Promise<BackupManifest> {
  const backupDate = new Date().toISOString().split("T")[0];
  const backupPath = `backups/${teamId}/${yyyymm}`;

  // 1. 회원 데이터 백업
  const membersData = await exportMembers(teamId);
  const membersJson = JSON.stringify(membersData, null, 2);
  const membersBlob = new Blob([membersJson], { type: "application/json" });
  const membersRef = ref(storage, `${backupPath}/members.json`);
  await uploadBytes(membersRef, membersBlob);
  const membersUrl = await getDownloadURL(membersRef);

  // 2. 정산 데이터 백업
  const ledgerData = await exportLedger(teamId, yyyymm);
  const ledgerJson = JSON.stringify(ledgerData, null, 2);
  const ledgerBlob = new Blob([ledgerJson], { type: "application/json" });
  const ledgerRef = ref(storage, `${backupPath}/ledger.json`);
  await uploadBytes(ledgerRef, ledgerBlob);
  const ledgerUrl = await getDownloadURL(ledgerRef);

  // 3. 출석 데이터 백업
  const attendanceData = await exportAttendance(teamId, yyyymm);
  const attendanceJson = JSON.stringify(attendanceData, null, 2);
  const attendanceBlob = new Blob([attendanceJson], { type: "application/json" });
  const attendanceRef = ref(storage, `${backupPath}/attendance.json`);
  await uploadBytes(attendanceRef, attendanceBlob);
  const attendanceUrl = await getDownloadURL(attendanceRef);

  // 4. PDF 리포트 백업 (있는 경우)
  let reportUrl: string | undefined;
  if (pdfBlob) {
    const reportRef = ref(storage, `${backupPath}/report.pdf`);
    await uploadBytes(reportRef, pdfBlob);
    reportUrl = await getDownloadURL(reportRef);
  }

  // 5. 메타데이터 계산
  const metadata = {
    totalMembers: membersData.length,
    totalRevenue: ledgerData.reduce((sum: number, item: any) => sum + (item.paidAmount || 0), 0),
    ruleVersion: ledgerData[0]?.calculatedByRuleVersion || "2025.1",
  };

  // 6. 백업 매니페스트 저장
  const manifest: BackupManifest = {
    teamId,
    yyyymm,
    backupDate,
    files: {
      members: membersUrl,
      ledger: ledgerUrl,
      attendance: attendanceUrl,
      report: reportUrl,
    },
    metadata,
  };

  // Firestore에 백업 기록 저장
  await addDoc(collection(db, "teams", teamId, "backups"), {
    ...manifest,
    createdAt: new Date(),
  });

  console.log(`[Backup] 월간 백업 완료: ${teamId}/${yyyymm}`);
  return manifest;
}

// 🔒 2. 회원 데이터 내보내기
async function exportMembers(teamId: string): Promise<any[]> {
  const membersRef = collection(db, "teams", teamId, "members");
  const membersSnapshot = await getDocs(membersRef);

  const members: any[] = [];
  membersSnapshot.forEach((doc) => {
    const data = doc.data();
    members.push({
      id: doc.id,
      ...data,
      // Date 객체를 문자열로 변환
      joinedAt: data.joinedAt?.toDate?.()?.toISOString() || data.joinedAt,
      lastAccessAt: data.lastAccessAt?.toDate?.()?.toISOString() || data.lastAccessAt,
    });
  });

  return members;
}

// 🔒 3. 정산 데이터 내보내기
async function exportLedger(teamId: string, yyyymm: string): Promise<any[]> {
  const ledgerRef = collection(db, "teams", teamId, "ledger", yyyymm, "items");
  const ledgerSnapshot = await getDocs(ledgerRef);

  const ledger: any[] = [];
  ledgerSnapshot.forEach((doc) => {
    const data = doc.data();
    ledger.push({
      id: doc.id,
      ...data,
      recordedAt: data.recordedAt?.toDate?.()?.toISOString() || data.recordedAt,
    });
  });

  return ledger;
}

// 🔒 4. 출석 데이터 내보내기
async function exportAttendance(teamId: string, yyyymm: string): Promise<any[]> {
  // 해당 월의 모든 출석 날짜 조회
  const year = yyyymm.split("-")[0];
  const month = yyyymm.split("-")[1];

  const attendanceData: any[] = [];

  // 해당 월의 모든 날짜 (1일~31일)
  for (let day = 1; day <= 31; day++) {
    const dateStr = `${year}-${month}-${String(day).padStart(2, "0")}`;
    
    try {
      const attendanceRef = collection(db, "teams", teamId, "attendance", dateStr, "items");
      const attendanceSnapshot = await getDocs(attendanceRef);

      if (!attendanceSnapshot.empty) {
        const items: any[] = [];
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            ...data,
            recordedAt: data.recordedAt?.toDate?.()?.toISOString() || data.recordedAt,
          });
        });

        attendanceData.push({
          date: dateStr,
          items,
        });
      }
    } catch (error) {
      // 해당 날짜 데이터가 없으면 스킵
      continue;
    }
  }

  return attendanceData;
}

// 🔒 5. 백업 목록 조회
export async function getBackupList(teamId: string): Promise<BackupManifest[]> {
  const backupsRef = collection(db, "teams", teamId, "backups");
  const backupsSnapshot = await getDocs(backupsRef);

  const backups: BackupManifest[] = [];
  backupsSnapshot.forEach((doc) => {
    backups.push({
      ...doc.data(),
    } as BackupManifest);
  });

  // yyyymm 기준 내림차순 정렬
  backups.sort((a, b) => b.yyyymm.localeCompare(a.yyyymm));

  return backups;
}

// 🔒 6. 백업 복구 (향후 구현)
export async function restoreFromBackup(
  teamId: string,
  backupManifest: BackupManifest
): Promise<void> {
  // TODO: 백업 파일 다운로드 및 복구 로직
  // 주의: 실제 복구는 매우 신중하게 진행해야 함
  console.log(`[Backup] 복구 준비: ${backupManifest.yyyymm}`);
  throw new Error("복구 기능은 향후 구현 예정입니다.");
}

