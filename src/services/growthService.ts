/**
 * 🔥 growthService - 선수 성장 관리 서비스
 * 
 * 역할:
 * - dailyCondition 컬렉션 관리 (date+uid 키로 upsert)
 * - routineCheck 컬렉션 관리 (date+uid 키로 upsert)
 * - 오늘 값 자동 로드
 * - 동시 저장 (batch/transaction)
 * 
 * UX 목적:
 * - 선수 자기관리 시스템
 * - 컨디션/루틴/목표 데이터 일관성 유지
 */

import {
  doc,
  setDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 🔥 일일 컨디션 데이터 타입
 */
export interface DailyCondition {
  uid: string;
  date: string; // YYYY-MM-DD 형식
  sleepHours?: number;
  fatigue?: number; // 1~5
  pain?: number; // 0~10
  mood?: number; // 1~5
  memo?: string;
  readinessScore?: number; // 간이 레디니스 점수
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 🔥 루틴 체크 데이터 타입
 */
export interface RoutineCheck {
  uid: string;
  date: string; // YYYY-MM-DD 형식
  stretch?: boolean;
  strength?: boolean;
  analysis?: boolean;
  mental?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 🔥 목표 데이터 타입
 */
export interface Goal {
  uid: string;
  type: "monthlyTraining" | "weeklyTraining" | "totalMinutes" | "totalSessions";
  target: number; // 목표 값
  current: number; // 현재 값 (자동 집계)
  deadline: string; // YYYY-MM-DD 형식
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 🔥 루틴 Streak 데이터 타입
 */
export interface RoutineStreak {
  uid: string;
  currentStreak: number; // 현재 연속 일수
  longestStreak: number; // 최장 연속 일수
  lastCheckDate: string; // 마지막 체크 날짜 (YYYY-MM-DD)
  streakType: "all" | "stretch" | "strength" | "analysis" | "mental"; // 전체 또는 개별 루틴
  updatedAt?: Timestamp;
}

/**
 * 🔥 오늘 날짜 문자열 반환 (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 🔥 날짜 문자열에서 Date 객체 생성
 */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 🔥 날짜 차이 계산 (일 단위)
 */
function getDaysDifference(date1: string, date2: string): number {
  const d1 = parseDateString(date1);
  const d2 = parseDateString(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 🔥 어제 날짜 문자열 반환 (YYYY-MM-DD)
 */
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 🔥 date+uid로 문서 ID 생성
 */
function getDocumentId(uid: string, date: string): string {
  return `${date}_${uid}`;
}

/**
 * 🔥 오늘 컨디션 조회
 * 
 * @param uid 사용자 UID
 * @returns 오늘 컨디션 데이터 또는 null
 */
export async function getTodayCondition(uid: string): Promise<DailyCondition | null> {
  try {
    const date = getTodayDateString();
    const docId = getDocumentId(uid, date);
    const docRef = doc(db, "dailyCondition", docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as DailyCondition;
    }

    return null;
  } catch (error: any) {
    console.error("❌ [getTodayCondition] 컨디션 조회 실패:", error);
    throw error;
  }
}

/**
 * 🔥 오늘 루틴 체크 조회
 * 
 * @param uid 사용자 UID
 * @returns 오늘 루틴 체크 데이터 또는 null
 */
export async function getTodayRoutine(uid: string): Promise<RoutineCheck | null> {
  try {
    const date = getTodayDateString();
    const docId = getDocumentId(uid, date);
    const docRef = doc(db, "routineCheck", docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as RoutineCheck;
    }

    return null;
  } catch (error: any) {
    console.error("❌ [getTodayRoutine] 루틴 조회 실패:", error);
    throw error;
  }
}

/**
 * 🔥 컨디션 저장 (upsert)
 * 
 * @param uid 사용자 UID
 * @param condition 컨디션 데이터
 */
export async function saveCondition(
  uid: string,
  condition: Omit<DailyCondition, "uid" | "date" | "createdAt" | "updatedAt">
): Promise<void> {
  try {
    const date = getTodayDateString();
    const docId = getDocumentId(uid, date);
    const docRef = doc(db, "dailyCondition", docId);

    // 🔥 기존 문서 확인
    const snap = await getDoc(docRef);
    const existingData = snap.exists() ? (snap.data() as DailyCondition) : null;

    const data: DailyCondition = {
      uid,
      date,
      ...condition,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, data, { merge: true });

    console.log("✅ [saveCondition] 컨디션 저장 성공:", docId);
  } catch (error: any) {
    console.error("❌ [saveCondition] 컨디션 저장 실패:", error);
    throw error;
  }
}

/**
 * 🔥 루틴 체크 저장 (upsert)
 * 
 * @param uid 사용자 UID
 * @param routine 루틴 체크 데이터
 */
export async function saveRoutine(
  uid: string,
  routine: Omit<RoutineCheck, "uid" | "date" | "createdAt" | "updatedAt">
): Promise<void> {
  try {
    const date = getTodayDateString();
    const docId = getDocumentId(uid, date);
    const docRef = doc(db, "routineCheck", docId);

    // 🔥 기존 문서 확인
    const snap = await getDoc(docRef);
    const existingData = snap.exists() ? (snap.data() as RoutineCheck) : null;

    const data: RoutineCheck = {
      uid,
      date,
      ...routine,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, data, { merge: true });

    console.log("✅ [saveRoutine] 루틴 저장 성공:", docId);
  } catch (error: any) {
    console.error("❌ [saveRoutine] 루틴 저장 실패:", error);
    throw error;
  }
}

/**
 * 🔥 컨디션 + 루틴 동시 저장 (batch)
 * 
 * @param uid 사용자 UID
 * @param condition 컨디션 데이터
 * @param routine 루틴 체크 데이터
 */
export async function saveGrowthData(
  uid: string,
  condition: Omit<DailyCondition, "uid" | "date" | "createdAt" | "updatedAt">,
  routine: Omit<RoutineCheck, "uid" | "date" | "createdAt" | "updatedAt">
): Promise<void> {
  try {
    const date = getTodayDateString();
    const batch = writeBatch(db);

    // 🔥 컨디션 문서
    const conditionDocId = getDocumentId(uid, date);
    const conditionRef = doc(db, "dailyCondition", conditionDocId);
    const conditionSnap = await getDoc(conditionRef);
    const existingCondition = conditionSnap.exists()
      ? (conditionSnap.data() as DailyCondition)
      : null;

    const conditionData: DailyCondition = {
      uid,
      date,
      ...condition,
      createdAt: existingCondition?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(conditionRef, conditionData, { merge: true });

    // 🔥 루틴 체크 문서
    const routineDocId = getDocumentId(uid, date);
    const routineRef = doc(db, "routineCheck", routineDocId);
    const routineSnap = await getDoc(routineRef);
    const existingRoutine = routineSnap.exists()
      ? (routineSnap.data() as RoutineCheck)
      : null;

    const routineData: RoutineCheck = {
      uid,
      date,
      ...routine,
      createdAt: existingRoutine?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(routineRef, routineData, { merge: true });

    // 🔥 일괄 실행
    await batch.commit();

    console.log("✅ [saveGrowthData] 성장 데이터 저장 성공:", { conditionDocId, routineDocId });

    // 🔥 루틴 저장 후 Streak 자동 계산
    try {
      await calculateRoutineStreak(uid, "all");
    } catch (error) {
      console.warn("⚠️ [saveGrowthData] Streak 계산 실패 (무시):", error);
    }
  } catch (error: any) {
    console.error("❌ [saveGrowthData] 성장 데이터 저장 실패:", error);
    throw error;
  }
}

/**
 * 🔥 목표 조회
 * 
 * @param uid 사용자 UID
 * @param type 목표 타입
 * @returns 목표 데이터 또는 null
 */
export async function getGoal(
  uid: string,
  type: Goal["type"]
): Promise<Goal | null> {
  try {
    const docId = `${uid}_${type}`;
    const docRef = doc(db, "goals", docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as Goal;
    }

    return null;
  } catch (error: any) {
    console.error("❌ [getGoal] 목표 조회 실패:", error);
    throw error;
  }
}

/**
 * 🔥 목표 생성/업데이트
 * 
 * @param uid 사용자 UID
 * @param goal 목표 데이터
 */
export async function saveGoal(
  uid: string,
  goal: Omit<Goal, "uid" | "current" | "createdAt" | "updatedAt">
): Promise<void> {
  try {
    const docId = `${uid}_${goal.type}`;
    const docRef = doc(db, "goals", docId);

    // 🔥 기존 문서 확인
    const snap = await getDoc(docRef);
    const existingData = snap.exists() ? (snap.data() as Goal) : null;

    // 🔥 current는 자동 집계이므로 기존 값 유지 (없으면 0)
    const data: Goal = {
      uid,
      ...goal,
      current: existingData?.current || 0,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, data, { merge: true });

    console.log("✅ [saveGoal] 목표 저장 성공:", docId);
  } catch (error: any) {
    console.error("❌ [saveGoal] 목표 저장 실패:", error);
    throw error;
  }
}

/**
 * 🔥 이번 달 시작일 계산
 */
function getMonthStart(): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * 🔥 이번 주 시작일 계산 (월요일)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 월요일
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * 🔥 목표 자동 집계 (활동 기록 기반 - Firestore count 쿼리 사용)
 * 
 * @param uid 사용자 UID
 * @param goalType 목표 타입
 * @returns 업데이트된 목표 또는 null
 */
export async function updateGoalProgress(
  uid: string,
  goalType: Goal["type"]
): Promise<Goal | null> {
  try {
    const goal = await getGoal(uid, goalType);
    if (!goal) {
      return null; // 목표가 없으면 집계하지 않음
    }

    const now = new Date();
    const deadline = new Date(goal.deadline);
    deadline.setHours(23, 59, 59, 999);

    // 🔥 목표 기간 계산
    let startDate: Date;
    if (goalType === "monthlyTraining") {
      // 이번 달 1일부터
      startDate = getMonthStart();
    } else if (goalType === "weeklyTraining") {
      // 이번 주 월요일부터
      startDate = getWeekStart();
    } else {
      // totalMinutes, totalSessions는 전체 기간 (시작일 없음)
      startDate = new Date(0);
    }

    let current = 0;

    if (goalType === "monthlyTraining" || goalType === "weeklyTraining" || goalType === "totalSessions") {
      // 🔥 훈련 횟수/세션 수 집계: count 쿼리 사용
      const constraints = [
        where("uid", "==", uid),
        where("endedAt", "<=", Timestamp.fromDate(deadline)),
      ];

      // 🔥 시작일이 있으면 추가
      if (startDate.getTime() > 0) {
        constraints.push(where("endedAt", ">=", Timestamp.fromDate(startDate)));
      }

      const q = query(collection(db, "activityHistory"), ...constraints);
      const countSnapshot = await getCountFromServer(q);
      current = countSnapshot.data().count;
    } else if (goalType === "totalMinutes") {
      // 🔥 총 운동 시간 집계: 전체 문서 조회 필요 (sum 계산)
      const constraints = [
        where("uid", "==", uid),
        where("endedAt", "<=", Timestamp.fromDate(deadline)),
      ];

      // 🔥 시작일이 있으면 추가
      if (startDate.getTime() > 0) {
        constraints.push(where("endedAt", ">=", Timestamp.fromDate(startDate)));
      }

      const q = query(collection(db, "activityHistory"), ...constraints);
      const { getDocs } = await import("firebase/firestore");
      const snap = await getDocs(q);

      snap.docs.forEach((doc) => {
        const data = doc.data();
        const durationMs = data.durationMs || 0;
        current += Math.floor(durationMs / 60000); // 분 단위
      });
    }

    // 🔥 목표 업데이트
    const docId = `${uid}_${goalType}`;
    const docRef = doc(db, "goals", docId);
    await setDoc(
      docRef,
      {
        current,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ [updateGoalProgress] 목표 집계 성공:", { goalType, current });

    return {
      ...goal,
      current,
    };
  } catch (error: any) {
    console.error("❌ [updateGoalProgress] 목표 집계 실패:", error);
    throw error;
  }
}

/**
 * 🔥 모든 목표 자동 집계
 * 
 * @param uid 사용자 UID
 */
export async function updateAllGoalsProgress(uid: string): Promise<void> {
  try {
    const goalTypes: Goal["type"][] = [
      "monthlyTraining",
      "weeklyTraining",
      "totalMinutes",
      "totalSessions",
    ];

    await Promise.all(
      goalTypes.map((type) => updateGoalProgress(uid, type))
    );

    console.log("✅ [updateAllGoalsProgress] 모든 목표 집계 완료");
  } catch (error: any) {
    console.error("❌ [updateAllGoalsProgress] 목표 집계 실패:", error);
    throw error;
  }
}

/**
 * 🔥 루틴 Streak 계산
 * 
 * @param uid 사용자 UID
 * @param streakType Streak 타입 (전체 또는 개별 루틴)
 * @returns 업데이트된 Streak 데이터
 */
export async function calculateRoutineStreak(
  uid: string,
  streakType: RoutineStreak["streakType"] = "all"
): Promise<RoutineStreak | null> {
  try {
    // 🔥 최근 30일 루틴 체크 조회
    const today = getTodayDateString();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`;

    const q = query(
      collection(db, "routineCheck"),
      where("uid", "==", uid),
      where("date", ">=", startDate),
      where("date", "<=", today)
    );

    const { getDocs } = await import("firebase/firestore");
    const snap = await getDocs(q);

    // 🔥 날짜별 체크 여부 확인
    const checkedDates = new Set<string>();
    snap.docs.forEach((doc) => {
      const data = doc.data() as RoutineCheck;
      if (!data.date) return;

      // 🔥 Streak 타입별 체크 여부 확인
      let isChecked = false;
      if (streakType === "all") {
        // 전체: 하나라도 체크되면 OK
        isChecked = data.stretch || data.strength || data.analysis || data.mental;
      } else if (streakType === "stretch") {
        isChecked = data.stretch === true;
      } else if (streakType === "strength") {
        isChecked = data.strength === true;
      } else if (streakType === "analysis") {
        isChecked = data.analysis === true;
      } else if (streakType === "mental") {
        isChecked = data.mental === true;
      }

      if (isChecked) {
        checkedDates.add(data.date);
      }
    });

    // 🔥 연속 일수 계산 (오늘부터 역순으로)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastCheckDate = "";

    // 🔥 최근 30일 날짜 배열 생성 (오늘부터 역순)
    const dates: string[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }

    // 🔥 현재 연속 일수 계산 (오늘부터 역순으로)
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      if (checkedDates.has(date)) {
        currentStreak += 1;
        if (!lastCheckDate) {
          lastCheckDate = date;
        }
      } else {
        // 체크 안 됨 → 연속 끊김
        break;
      }
    }

    // 🔥 최장 연속 일수 계산 (전체 기간에서)
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      if (checkedDates.has(date)) {
        tempStreak += 1;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // 🔥 Streak 데이터 저장
    const docId = `${uid}_${streakType}`;
    const docRef = doc(db, "routineStreak", docId);
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as RoutineStreak)
      : null;

    const streakData: RoutineStreak = {
      uid,
      currentStreak,
      longestStreak: Math.max(longestStreak, existingData?.longestStreak || 0),
      lastCheckDate: lastCheckDate || existingData?.lastCheckDate || "",
      streakType,
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, streakData, { merge: true });

    console.log("✅ [calculateRoutineStreak] Streak 계산 성공:", {
      streakType,
      currentStreak,
      longestStreak: streakData.longestStreak,
    });

    return streakData;
  } catch (error: any) {
    console.error("❌ [calculateRoutineStreak] Streak 계산 실패:", error);
    throw error;
  }
}

/**
 * 🔥 루틴 Streak 조회
 * 
 * @param uid 사용자 UID
 * @param streakType Streak 타입
 * @returns Streak 데이터 또는 null
 */
export async function getRoutineStreak(
  uid: string,
  streakType: RoutineStreak["streakType"] = "all"
): Promise<RoutineStreak | null> {
  try {
    const docId = `${uid}_${streakType}`;
    const docRef = doc(db, "routineStreak", docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as RoutineStreak;
    }

    return null;
  } catch (error: any) {
    console.error("❌ [getRoutineStreak] Streak 조회 실패:", error);
    throw error;
  }
}
