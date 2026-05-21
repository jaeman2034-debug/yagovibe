/**
 * 🔥 Association API - 협회 API 클라이언트
 * 
 * 협회 데이터 조회 (실패 시 null 반환)
 */

import type { AssocLeague, AssocNotice, AssocRecruitment } from "../domain/assoc.types";

const API_BASE = import.meta.env.VITE_ASSOC_API_BASE || "/api/assoc";

/**
 * 협회 대회 조회
 */
export async function fetchAssocLeagues(): Promise<AssocLeague[] | null> {
  try {
    const res = await fetch(`${API_BASE}/leagues`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.warn("[AssocAPI] 대회 조회 실패:", res.status);
      return null;
    }

    return (await res.json()) as AssocLeague[];
  } catch (error) {
    console.warn("[AssocAPI] 대회 조회 오류:", error);
    return null;
  }
}

/**
 * 협회 공지 조회
 */
export async function fetchAssocNotices(): Promise<AssocNotice[] | null> {
  try {
    const res = await fetch(`${API_BASE}/notices`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.warn("[AssocAPI] 공지 조회 실패:", res.status);
      return null;
    }

    return (await res.json()) as AssocNotice[];
  } catch (error) {
    console.warn("[AssocAPI] 공지 조회 오류:", error);
    return null;
  }
}

/**
 * 협회 모집 조회
 */
export async function fetchAssocRecruitments(): Promise<AssocRecruitment[] | null> {
  try {
    const res = await fetch(`${API_BASE}/recruitments`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.warn("[AssocAPI] 모집 조회 실패:", res.status);
      return null;
    }

    return (await res.json()) as AssocRecruitment[];
  } catch (error) {
    console.warn("[AssocAPI] 모집 조회 오류:", error);
    return null;
  }
}

/**
 * 협회 데이터 일괄 조회
 */
export async function fetchAllAssocData(): Promise<{
  leagues: AssocLeague[];
  notices: AssocNotice[];
  recruitments: AssocRecruitment[];
} | null> {
  try {
    const [leagues, notices, recruitments] = await Promise.all([
      fetchAssocLeagues(),
      fetchAssocNotices(),
      fetchAssocRecruitments(),
    ]);

    // 하나라도 실패하면 null 반환 (기존 데이터 유지)
    if (leagues === null || notices === null || recruitments === null) {
      return null;
    }

    return {
      leagues,
      notices,
      recruitments,
    };
  } catch (error) {
    console.warn("[AssocAPI] 일괄 조회 오류:", error);
    return null;
  }
}
