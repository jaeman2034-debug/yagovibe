/**
 * 🔥 PersonaP1Individual - 개인 체육인 (🔥 핵심)
 * 
 * PR 4 설계 원칙:
 * - 팀 강요 없음
 * - 대회 참가 강요 없음
 * - 개인 활동 중심
 * - 정보 제공 중심
 * - "당신은 이미 체육인이고, 이 플랫폼은 당신을 위해 존재합니다"
 * - props 없이도 렌더링 가능
 * - 데이터 0개 계정에서도 '완성 화면'처럼 보임
 */

import { MySportProfileCard } from "./cards/MySportProfileCard";
import { PersonalSummaryCard } from "./cards/PersonalSummaryCard";
import { RecommendedContentCard } from "./cards/RecommendedContentCard";
import { ActivityHintCard } from "./cards/ActivityHintCard";
import MyActivityHistoryCard from "@/components/me/MyActivityHistoryCard";

/**
 * 🔥 PersonaP1Individual - P1 최소 카드 세트 (4개)
 * 
 * PR 4 목표:
 * - 팀·대회·데이터 0개 계정에서도 /me가 '완성 화면'처럼 보이게
 * - Empty State ❌ / Error ❌
 * - 카드 4종 전부 단독 렌더 가능
 * - props 없음 (데이터 없어도 렌더링됨)
 * 
 * 카드 구성:
 * 1. MySportProfileCard - 내 종목 정보
 * 2. PersonalSummaryCard - 이번 달 훈련 요약
 * 3. RecommendedContentCard - 추천 콘텐츠
 * 4. ActivityHintCard - 활동 힌트 (CTA 없음)
 */
export function PersonaP1Individual() {
  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 1️⃣ MySportProfileCard - 내 종목 정보 */}
      <MySportProfileCard />

      {/* 2️⃣ PersonalSummaryCard - 이번 달 훈련 요약 */}
      <PersonalSummaryCard />

      {/* 3️⃣ MyActivityHistoryCard - 내 활동 기록 (이번 달 훈련 요약 아래) */}
      <MyActivityHistoryCard />

      {/* 4️⃣ RecommendedContentCard - 추천 콘텐츠 */}
      <RecommendedContentCard />

      {/* 5️⃣ ActivityHintCard - 활동 힌트 (CTA 없음) */}
      <ActivityHintCard />
    </section>
  );
}
