/**
 * 🔥 JoinKFA 캐시 DB 관리
 * 
 * 사무국이 JoinKFA에서 다운로드한 엑셀을 업로드하면
 * 시스템이 자동으로 매칭하여 verified/mismatch 표시
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";

/**
 * JoinKFA 선수 정보 (캐시)
 */
export interface JoinKfaPlayer {
  name: string;
  birthDate?: string; // YYYY-MM-DD
  birthYear?: number;
  joinKfaId?: string; // JoinKFA 등록번호
  teamName?: string;
  phone?: string;
  verified: boolean; // JoinKFA에 등록되어 있는지
  cachedAt: Timestamp;
}

/**
 * JoinKFA 캐시 문서
 */
export interface JoinKfaCache {
  id: string;
  associationId: string;
  tournamentId: string;
  players: JoinKfaPlayer[];
  uploadedBy: string; // 업로드한 관리자 UID
  uploadedAt: Timestamp;
  fileName: string;
  totalCount: number;
  verifiedCount: number;
}

/**
 * JoinKFA 엑셀 파일 파싱
 * 
 * @param file 엑셀 파일
 * @returns 파싱된 선수 목록
 */
export async function parseJoinKfaExcel(file: File): Promise<JoinKfaPlayer[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

  const players: JoinKfaPlayer[] = [];

  for (const row of json) {
    // 컬럼명 자동 인식 (한국어/영문 혼용)
    const pick = (obj: Record<string, any>, keys: string[]) => {
      for (const k of keys) {
        if (k in obj) return String(obj[k] ?? "").trim();
      }
      // 대소문자/공백 무시 매칭
      const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");
      const map = Object.keys(obj).reduce<Record<string, string>>((acc, key) => {
        acc[norm(key)] = key;
        return acc;
      }, {});
      for (const k of keys) {
        const nk = norm(k);
        if (map[nk]) return String(obj[map[nk]] ?? "").trim();
      }
      return "";
    };

    const name = pick(row, ["이름", "name", "성명", "선수명"]);
    const birthDate = pick(row, ["생년월일", "birthDate", "dob", "생년", "출생", "birth"]);
    const joinKfaId = pick(row, ["등록번호", "joinKfaId", "id", "회원번호"]);
    const teamName = pick(row, ["팀명", "teamName", "team"]);
    const phone = pick(row, ["연락처", "phone", "휴대폰", "전화번호"]);

    if (!name) continue;

    // 생년월일 정규화
    let birthYear: number | undefined;
    let normalizedBirthDate: string | undefined;

    if (birthDate) {
      const cleaned = birthDate.replace(/\s/g, "");
      
      // YYYY-MM-DD 형식
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        normalizedBirthDate = cleaned;
        birthYear = parseInt(cleaned.slice(0, 4));
      }
      // YYYYMMDD 형식
      else if (/^\d{8}$/.test(cleaned)) {
        normalizedBirthDate = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
        birthYear = parseInt(cleaned.slice(0, 4));
      }
      // YYYY 형식만
      else if (/^\d{4}$/.test(cleaned)) {
        birthYear = parseInt(cleaned);
        normalizedBirthDate = `${cleaned}-01-01`;
      }
    }

    players.push({
      name: name.trim(),
      birthDate: normalizedBirthDate,
      birthYear,
      joinKfaId: joinKfaId || undefined,
      teamName: teamName || undefined,
      phone: phone || undefined,
      verified: true, // JoinKFA 엑셀에 있으면 verified
      cachedAt: Timestamp.now(),
    });
  }

  return players;
}

/**
 * JoinKFA 캐시 저장
 */
export async function saveJoinKfaCache(params: {
  associationId: string;
  tournamentId: string;
  players: JoinKfaPlayer[];
  uploadedBy: string;
  fileName: string;
}): Promise<string> {
  const cacheRef = doc(
    db,
    `associations/${params.associationId}/tournaments/${params.tournamentId}/joinKfaCache/current`
  );

  const cacheData: Omit<JoinKfaCache, "id"> = {
    associationId: params.associationId,
    tournamentId: params.tournamentId,
    players: params.players,
    uploadedBy: params.uploadedBy,
    uploadedAt: serverTimestamp() as Timestamp,
    fileName: params.fileName,
    totalCount: params.players.length,
    verifiedCount: params.players.filter(p => p.verified).length,
  };

  await setDoc(cacheRef, cacheData);
  return cacheRef.id;
}

/**
 * JoinKFA 캐시 조회
 */
export async function getJoinKfaCache(
  associationId: string,
  tournamentId: string
): Promise<JoinKfaCache | null> {
  const cacheRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/joinKfaCache/current`
  );
  const snap = await getDoc(cacheRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as JoinKfaCache;
}

/**
 * JoinKFA 매칭 결과 타입
 */
export type JoinKfaMatchStatus = "verified" | "mismatch" | "not_found";

export interface JoinKfaMatchResult {
  status: JoinKfaMatchStatus;
  joinKfaPlayer?: JoinKfaPlayer;
  reason?: string; // 불일치 사유
}

/**
 * 선수와 JoinKFA 캐시 매칭 (실전 운영 기준)
 * 
 * 매칭 기준 (순서 중요):
 * 1. 이름 + 생년월일 완전 일치 → verified
 * 2. 이름 일치 + 생년 불일치 → mismatch
 * 3. 이름 없음 → not_found
 * 
 * @param playerName 선수 이름
 * @param playerBirthDate 선수 생년월일 (YYYY-MM-DD 또는 생년월일 원문)
 * @param playerBirthYear 선수 출생연도
 * @param joinKfaCache JoinKFA 캐시
 * @returns 매칭 결과
 */
export function matchPlayerWithJoinKfa(
  playerName: string,
  playerBirthDate: string | undefined,
  playerBirthYear: number | undefined,
  joinKfaCache: JoinKfaCache | null
): JoinKfaMatchResult {
  if (!joinKfaCache || joinKfaCache.players.length === 0) {
    return { status: "not_found", reason: "JoinKFA 캐시가 없습니다" };
  }

  const normalizedName = playerName.trim().replace(/\s/g, "");
  
  // 생년월일 정규화 (비교용)
  const normalizeBirthDate = (date: string | undefined): string | null => {
    if (!date) return null;
    const cleaned = date.replace(/\s/g, "");
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    // YYYYMMDD 형식
    if (/^\d{8}$/.test(cleaned)) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    return null;
  };

  const normalizedPlayerBirthDate = normalizeBirthDate(playerBirthDate);

  // 1. 이름 + 생년월일 완전 일치 → verified
  if (normalizedPlayerBirthDate && playerBirthYear) {
    const exactMatch = joinKfaCache.players.find((p) => {
      const nameMatch = p.name.trim().replace(/\s/g, "") === normalizedName;
      const birthDateMatch = p.birthDate === normalizedPlayerBirthDate;
      const birthYearMatch = p.birthYear === playerBirthYear;
      
      return nameMatch && (birthDateMatch || birthYearMatch);
    });
    
    if (exactMatch) {
      return {
        status: "verified",
        joinKfaPlayer: exactMatch,
        reason: "이름과 생년월일이 일치합니다",
      };
    }
  }

  // 2. 이름 일치 + 생년 불일치 → mismatch
  const nameMatch = joinKfaCache.players.find(
    (p) => p.name.trim().replace(/\s/g, "") === normalizedName
  );
  
  if (nameMatch) {
    let reason = "이름은 일치하지만 생년월일이 다릅니다";
    if (nameMatch.birthDate && normalizedPlayerBirthDate && nameMatch.birthDate !== normalizedPlayerBirthDate) {
      reason = `이름 일치, 생년월일 불일치 (JoinKFA: ${nameMatch.birthDate}, 신청: ${normalizedPlayerBirthDate})`;
    } else if (nameMatch.birthYear && playerBirthYear && nameMatch.birthYear !== playerBirthYear) {
      reason = `이름 일치, 출생연도 불일치 (JoinKFA: ${nameMatch.birthYear}년, 신청: ${playerBirthYear}년)`;
    }
    
    return {
      status: "mismatch",
      joinKfaPlayer: nameMatch,
      reason,
    };
  }

  // 3. 이름 없음 → not_found
  return {
    status: "not_found",
    reason: "JoinKFA 캐시에서 해당 선수를 찾을 수 없습니다",
  };
}

