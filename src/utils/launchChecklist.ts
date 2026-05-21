/**
 * 🔥 Launch Checklist - 출시 체크리스트
 * 
 * 역할:
 * - 출시 전 필수 체크 항목
 * - 테스트 시나리오
 * 
 * UX 목적:
 * - 베타 출시 준비 완료 확인
 */

/**
 * 🔥 체크리스트 항목
 */
export interface ChecklistItem {
  id: string;
  category: "auth" | "data" | "ui" | "performance" | "security";
  title: string;
  description: string;
  checked: boolean;
}

/**
 * 🔥 기본 출시 체크리스트
 */
export const LAUNCH_CHECKLIST: ChecklistItem[] = [
  // 인증
  {
    id: "auth-1",
    category: "auth",
    title: "로그인/회원가입 정상 동작",
    description: "이메일, 구글 로그인이 정상 작동하는지 확인",
    checked: false,
  },
  {
    id: "auth-2",
    category: "auth",
    title: "로그아웃 정상 동작",
    description: "로그아웃 후 상태 초기화 확인",
    checked: false,
  },
  {
    id: "auth-3",
    category: "auth",
    title: "세션 유지 확인",
    description: "새로고침 후 로그인 상태 유지 확인",
    checked: false,
  },

  // 데이터
  {
    id: "data-1",
    category: "data",
    title: "컨디션 저장/조회 정상",
    description: "일일 컨디션 데이터 저장 및 조회 확인",
    checked: false,
  },
  {
    id: "data-2",
    category: "data",
    title: "루틴 체크 저장/조회 정상",
    description: "루틴 체크 데이터 저장 및 조회 확인",
    checked: false,
  },
  {
    id: "data-3",
    category: "data",
    title: "활동 기록 저장/조회 정상",
    description: "활동 기록 저장 및 조회 확인",
    checked: false,
  },
  {
    id: "data-4",
    category: "data",
    title: "리듬 점수 계산 정상",
    description: "리듬 점수 자동 계산 및 표시 확인",
    checked: false,
  },
  {
    id: "data-5",
    category: "data",
    title: "목표 자동 집계 정상",
    description: "목표 진행률 자동 업데이트 확인",
    checked: false,
  },

  // UI
  {
    id: "ui-1",
    category: "ui",
    title: "성장 탭 정상 표시",
    description: "성장 탭 모든 카드 정상 렌더링 확인",
    checked: false,
  },
  {
    id: "ui-2",
    category: "ui",
    title: "코치 대시보드 정상 표시",
    description: "코치 대시보드 선수 상태 정상 표시 확인",
    checked: false,
  },
  {
    id: "ui-3",
    category: "ui",
    title: "리포트 생성 정상",
    description: "경기 전 리포트 생성 및 다운로드 확인",
    checked: false,
  },
  {
    id: "ui-4",
    category: "ui",
    title: "알림 정상 표시",
    description: "성장 알림 정상 생성 및 표시 확인",
    checked: false,
  },
  {
    id: "ui-5",
    category: "ui",
    title: "모바일 반응형 확인",
    description: "모바일 화면에서 UI 정상 표시 확인",
    checked: false,
  },

  // 성능
  {
    id: "perf-1",
    category: "performance",
    title: "초기 로딩 시간 < 3초",
    description: "앱 첫 로딩 시간 확인",
    checked: false,
  },
  {
    id: "perf-2",
    category: "performance",
    title: "데이터 조회 시간 < 2초",
    description: "Firestore 쿼리 응답 시간 확인",
    checked: false,
  },
  {
    id: "perf-3",
    category: "performance",
    title: "이미지 최적화 확인",
    description: "이미지 로딩 최적화 확인",
    checked: false,
  },

  // 보안
  {
    id: "sec-1",
    category: "security",
    title: "Firestore Rules 확인",
    description: "모든 컬렉션 Rules 정상 작동 확인",
    checked: false,
  },
  {
    id: "sec-2",
    category: "security",
    title: "인증 필수 페이지 보호",
    description: "로그인 필수 페이지 접근 제어 확인",
    checked: false,
  },
  {
    id: "sec-3",
    category: "security",
    title: "사용자 데이터 격리 확인",
    description: "본인 데이터만 조회 가능한지 확인",
    checked: false,
  },
];

/**
 * 🔥 테스트 시나리오
 */
export const TEST_SCENARIOS = [
  {
    id: "scenario-1",
    title: "신규 사용자 온보딩",
    steps: [
      "1. 회원가입/로그인",
      "2. 성장 탭 접속",
      "3. 온보딩 가이드 확인",
      "4. 컨디션 입력",
      "5. 루틴 체크",
      "6. 목표 설정",
    ],
  },
  {
    id: "scenario-2",
    title: "일일 컨디션 기록",
    steps: [
      "1. 성장 탭 접속",
      "2. 컨디션 입력 (수면, 피로도, 통증)",
      "3. 저장 확인",
      "4. 리듬 점수 자동 계산 확인",
      "5. 리듬 그래프 업데이트 확인",
    ],
  },
  {
    id: "scenario-3",
    title: "활동 기록 및 통계",
    steps: [
      "1. 활동 시작 (스포츠 선택)",
      "2. 활동 종료",
      "3. 허브에서 오늘 활동 카드 확인",
      "4. 통계 카드 확인",
      "5. 주간 그래프 확인",
    ],
  },
  {
    id: "scenario-4",
    title: "코치 대시보드 사용",
    steps: [
      "1. 코치 대시보드 접속",
      "2. 팀 선수 상태 확인",
      "3. 위험 선수 필터 확인",
      "4. 경기 전 리포트 생성",
      "5. 리포트 다운로드 확인",
    ],
  },
  {
    id: "scenario-5",
    title: "AI 추천 및 알림",
    steps: [
      "1. 성장 탭 접속",
      "2. AI 훈련 추천 확인",
      "3. 알림 표시 확인",
      "4. 알림 클릭 시 페이지 이동 확인",
    ],
  },
];

/**
 * 🔥 체크리스트 저장 (로컬 스토리지)
 */
export function saveChecklist(checklist: ChecklistItem[]): void {
  try {
    localStorage.setItem("launch_checklist", JSON.stringify(checklist));
  } catch (error) {
    console.error("❌ [saveChecklist] 체크리스트 저장 실패:", error);
  }
}

/**
 * 🔥 체크리스트 로드 (로컬 스토리지)
 */
export function loadChecklist(): ChecklistItem[] {
  try {
    const stored = localStorage.getItem("launch_checklist");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("❌ [loadChecklist] 체크리스트 로드 실패:", error);
  }
  return LAUNCH_CHECKLIST;
}
