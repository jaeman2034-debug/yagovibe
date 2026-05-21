/**
 * 🔥 참가 신청 Repository
 * 팀 수 기반 참가비 자동 산정 포함
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentApplication, Payment, Receipt } from "@/types/tournament";
import { calcEntryFee } from "@/lib/notice/feeCalc";
import type { FeePolicy } from "@/components/notice/FeeSummaryBox";
import { sanitizeForFirestore } from "@/utils/firestoreSanitize";

/**
 * 참가 신청 생성 (참가비 자동 산정 포함)
 */
export async function createTournamentApplication(params: {
  associationId: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  managerName?: string;
  phone?: string;
  teamCount: number;
  feePolicy: FeePolicy;
  dueDate?: Date; // 납부 마감일 (선택)
  createdBy: string; // 🔥 생성자 UID (Rules 읽기 권한용)
}): Promise<string> {
  // 참가비 계산
  const feeCalcResult = calcEntryFee(params.teamCount, params.feePolicy);

  // 신청 문서 생성
  const appRef = collection(
    db,
    `associations/${params.associationId}/tournaments/${params.tournamentId}/applications`
  );

  // 🔥 Firestore는 undefined 값을 허용하지 않음 - 모든 optional 필드는 조건부로 추가
  const rawAppData: Omit<TournamentApplication, "id"> = {
    tournamentId: params.tournamentId,
    associationId: params.associationId,
    teamId: params.teamId,
    teamName: params.teamName,
    teamCount: params.teamCount,
    feePolicySnapshot: {
      baseFee: params.feePolicy.baseFee,
      baseTeamCount: params.feePolicy.baseTeamCount,
      extraFeePerTeam: params.feePolicy.extraFeePerTeam,
    },
    feeCalc: {
      extraTeams: feeCalcResult.extraTeams,
      totalFee: feeCalcResult.total,
      currency: "KRW",
      calculatedAt: serverTimestamp(),
    },
    paymentStatus: "UNPAID",
    paidTotal: 0,
    dueAmount: feeCalcResult.total,
    lastReminderAt: null,
    status: "PENDING", // 🔥 타입 정의에 맞춰 대문자로 통일 (PENDING | APPROVED | REJECTED | HOLD)
    createdBy: params.createdBy, // 🔥 생성자 UID (Rules 읽기 권한용)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // 🔥 optional 필드들은 값이 있을 때만 포함 (undefined는 Firestore에 저장 불가)
    ...(params.managerName && { managerName: params.managerName }),
    ...(params.phone && { phone: params.phone }),
    ...(params.dueDate && {
      dueDate: Timestamp.fromDate(params.dueDate),
    }),
  };

  // 🔥 Firestore 저장 전 undefined 완전 제거 (중첩 객체 포함)
  const appData = sanitizeForFirestore(rawAppData);
  
  // 🔥 디버깅: 실제 저장될 데이터 확인 (addDoc 직전)
  // JSON.stringify로 변환하여 undefined가 완전히 제거되었는지 확인
  const sanitizedForLog = JSON.parse(JSON.stringify(appData));
  console.log("[참가 신청] Firestore 저장 데이터:", sanitizedForLog);
  console.log("[참가 신청] 저장 경로:", appRef.path);
  console.log("[참가 신청] status 값:", appData.status, "(타입:", typeof appData.status, ")");

  try {
    const docRef = await addDoc(appRef, appData);
    console.log("[참가 신청] 저장 성공, 문서 ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    // 🔥 에러 타입을 명확히 로그에 기록 (permission-denied vs invalid-argument 구분)
    console.error("[참가 신청] Firestore 저장 실패:", {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      저장_시도_데이터: sanitizedForLog,
      저장_경로: appRef.path,
    });
    throw error;
  }
}

/**
 * 참가 신청 조회
 */
export async function getTournamentApplication(
  associationId: string,
  tournamentId: string,
  applicationId: string
): Promise<TournamentApplication | null> {
  const appRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
  );
  const snap = await getDoc(appRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TournamentApplication;
}

/**
 * 대회별 참가 신청 목록 조회
 */
export async function getTournamentApplications(
  associationId: string,
  tournamentId: string
): Promise<TournamentApplication[]> {
  const appsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/applications`
  );
  const snap = await getDocs(appsRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentApplication));
}

/**
 * 결제 기록 생성
 */
export async function createPayment(params: {
  associationId: string;
  tournamentId: string;
  applicationId: string;
  amount: number;
  method: Payment["method"];
  memo?: string;
  createdBy: string;
}): Promise<string> {
  const paymentsRef = collection(
    db,
    `associations/${params.associationId}/tournaments/${params.tournamentId}/applications/${params.applicationId}/payments`
  );

  const paymentData: Omit<Payment, "id"> = {
    applicationId: params.applicationId,
    amount: params.amount,
    method: params.method,
    status: "PAID",
    paidAt: serverTimestamp(),
    memo: params.memo || null,
    createdBy: params.createdBy,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(paymentsRef, paymentData);
  return docRef.id;
}

/**
 * 결제 기록 조회
 */
export async function getPayments(
  associationId: string,
  tournamentId: string,
  applicationId: string
): Promise<Payment[]> {
  const paymentsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}/payments`
  );
  const snap = await getDocs(paymentsRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

/**
 * 영수증 생성
 */
export async function createReceipt(params: {
  associationId: string;
  tournamentId: string;
  applicationId: string;
  receiptNo: string;
  issuedBy: string;
  payerName: string;
  teamCount: number;
  totalFee: number;
  paidTotal: number;
  methodSummary: string;
  note?: string;
}): Promise<string> {
  const receiptsRef = collection(
    db,
    `associations/${params.associationId}/tournaments/${params.tournamentId}/applications/${params.applicationId}/receipts`
  );

  const receiptData: Omit<Receipt, "id"> = {
    applicationId: params.applicationId,
    receiptNo: params.receiptNo,
    issuedAt: serverTimestamp(),
    issuedBy: params.issuedBy,
    payerName: params.payerName,
    teamCount: params.teamCount,
    totalFee: params.totalFee,
    paidTotal: params.paidTotal,
    methodSummary: params.methodSummary,
    note: params.note || null,
  };

  const docRef = await addDoc(receiptsRef, receiptData);
  return docRef.id;
}

/**
 * 영수증 조회
 */
export async function getReceipts(
  associationId: string,
  tournamentId: string,
  applicationId: string
): Promise<Receipt[]> {
  const receiptsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}/receipts`
  );
  const snap = await getDocs(receiptsRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Receipt));
}

