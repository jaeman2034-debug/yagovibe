/**
 * 🔥 사기 의심 패턴 탐지 룰 설정
 * v1: 가벼운 룰 기반 탐지
 */

export interface RiskRuleConfig {
  // 🔥 신규 계정 + 고가 + 외부 연락처
  newAccountDays: number; // 신규 계정 기준 일수 (기본: 7)
  highPriceThreshold: number; // 고가 임계값 (기본: 500000)
  externalContactScore: number; // 외부 연락처 포함 시 점수 (기본: 30)
  
  // 🔥 동일 이미지/유사 제목 다수 업로드
  duplicatePostWindowHours: number; // 중복 게시글 탐지 기간 (기본: 24)
  duplicatePostThreshold: number; // 중복 게시글 임계값 (기본: 3)
  duplicatePostScore: number; // 중복 게시글 점수 (기본: 20)
  
  // 🔥 거래완료 없이 게시글 과다 생성
  excessivePostWindowDays: number; // 과다 게시글 탐지 기간 (기본: 7)
  excessivePostThreshold: number; // 과다 게시글 임계값 (기본: 10)
  excessivePostScore: number; // 과다 게시글 점수 (기본: 15)
  
  // 🔥 리뷰/거래 이력 0인데 고가 + 외부연락처
  noHistoryHighPriceScore: number; // 이력 없음 + 고가 점수 (기본: 25)
  
  // 🔥 Shadow Ban 임계값
  shadowBanThreshold: number; // Shadow Ban 적용 임계값 (기본: 50)
  
  // 🔥 Risk Tier 기준
  highRiskThreshold: number; // 고위험 기준 (기본: 70)
  mediumRiskThreshold: number; // 중위험 기준 (기본: 40)
}

export const DEFAULT_RISK_RULES: RiskRuleConfig = {
  newAccountDays: 7,
  highPriceThreshold: 500000,
  externalContactScore: 30,
  duplicatePostWindowHours: 24,
  duplicatePostThreshold: 3,
  duplicatePostScore: 20,
  excessivePostWindowDays: 7,
  excessivePostThreshold: 10,
  excessivePostScore: 15,
  noHistoryHighPriceScore: 25,
  shadowBanThreshold: 50,
  highRiskThreshold: 70,
  mediumRiskThreshold: 40,
};

/**
 * 🔥 외부 연락처 패턴 (정규식)
 */
export const EXTERNAL_CONTACT_PATTERNS = [
  /카톡|카카오톡|kakao|kakaotalk/i,
  /텔레그램|telegram|텔레/i,
  /010-\d{4}-\d{4}/, // 전화번호 패턴
  /010\d{8}/, // 전화번호 패턴 (하이픈 없음)
  /연락.*문자|문자.*연락/i,
  /직접.*연락|연락.*직접/i,
  /외부.*연락|연락.*외부/i,
];
