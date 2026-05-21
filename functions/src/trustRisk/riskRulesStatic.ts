/** 클라 `src/config/riskRules.ts`와 동기화 */
export interface RiskRuleConfig {
  newAccountDays: number;
  highPriceThreshold: number;
  externalContactScore: number;
  duplicatePostWindowHours: number;
  duplicatePostThreshold: number;
  duplicatePostScore: number;
  excessivePostWindowDays: number;
  excessivePostThreshold: number;
  excessivePostScore: number;
  noHistoryHighPriceScore: number;
  shadowBanThreshold: number;
  highRiskThreshold: number;
  mediumRiskThreshold: number;
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

export const EXTERNAL_CONTACT_PATTERNS: RegExp[] = [
  /카톡|카카오톡|kakao|kakaotalk/i,
  /텔레그램|telegram|텔레/i,
  /010-\d{4}-\d{4}/,
  /010\d{8}/,
  /연락.*문자|문자.*연락/i,
  /직접.*연락|연락.*직접/i,
  /외부.*연락|연락.*외부/i,
];
