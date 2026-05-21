/**
 * 🔔 미납 알림 메시지 템플릿
 * 정책: 감정 없음, 판단 없음, 사실 + 시스템 통지
 */

export interface NotificationTemplate {
  type: string;
  channel: ('PUSH' | 'SMS' | 'EMAIL')[];
  variables: string[];
  getMessage: (variables: Record<string, any>) => string;
}

/**
 * 1개월 미납 - 리마인드 (부드러움)
 */
export const UNPAID_1_MONTH: NotificationTemplate = {
  type: 'UNPAID_1_MONTH',
  channel: ['PUSH'],
  variables: ['memberName', 'month', 'amount'],
  getMessage: (vars) => {
    return `[회비 안내]\n\n${vars.memberName}님, ${vars.month}월 회비 납부를 확인해 주세요.\n\n- 기준 월: ${vars.month}\n- 미납 금액: ${vars.amount}원\n\n납부 완료 시 별도 조치는 없습니다.\n\n문의가 필요한 경우 운영진에게 연락해 주세요.`;
  },
};

/**
 * 2개월 미납 - 공식 알림 (고정 문구)
 */
export const UNPAID_2_MONTHS: NotificationTemplate = {
  type: 'UNPAID_2_MONTHS',
  channel: ['PUSH', 'SMS'],
  variables: ['memberName', 'month', 'amount', 'unpaidMonths'],
  getMessage: (vars) => {
    return `[회비 안내]\n\n회원님은 현재 회비 미납 상태로 확인되었습니다.\n\n- 기준 월: ${vars.month}\n- 미납 기간: ${vars.unpaidMonths}개월\n- 미납 금액: ${vars.amount}원\n\n본 알림은 시스템 기준에 따라 자동 발송되었습니다.\n납부 완료 시 별도 조치는 없습니다.\n\n문의가 필요한 경우 운영진에게 연락해 주세요.`;
  },
};

/**
 * 3개월 이상 미납 - 조치 예고
 */
export const UNPAID_3_MONTHS_PLUS: NotificationTemplate = {
  type: 'UNPAID_3_MONTHS_PLUS',
  channel: ['PUSH', 'SMS', 'EMAIL'],
  variables: ['memberName', 'month', 'amount', 'unpaidMonths', 'teamName'],
  getMessage: (vars) => {
    return `[회비 안내]\n\n${vars.memberName}님, 회비 미납 상태가 지속되고 있습니다.\n\n- 기준 월: ${vars.month}\n- 미납 기간: ${vars.unpaidMonths}개월\n- 미납 금액: ${vars.amount}원\n\n본 알림은 시스템 기준에 따라 자동 발송되었습니다.\n\n미납 상태가 지속될 경우 팀 운영 정책에 따라 조치가 진행될 수 있습니다.\n\n문의가 필요한 경우 운영진에게 연락해 주세요.`;
  },
};

/**
 * 연회비 납부 안내
 */
export const ANNUAL_FEE_REMINDER: NotificationTemplate = {
  type: 'ANNUAL_FEE_REMINDER',
  channel: ['PUSH', 'SMS'],
  variables: ['memberName', 'year', 'deadline', 'amount', 'teamName'],
  getMessage: (vars) => {
    return `[연회비 안내]\n\n${vars.memberName}님, ${vars.year}년 연회비 납부 안내입니다.\n\n- 납부 기한: ${vars.deadline}\n- 납부 금액: ${vars.amount}원\n\n본 알림은 시스템 기준에 따라 자동 발송되었습니다.\n\n문의가 필요한 경우 운영진에게 연락해 주세요.`;
  },
};

/**
 * 템플릿 조회 함수
 */
export function getTemplate(type: string): NotificationTemplate | null {
  const templates: Record<string, NotificationTemplate> = {
    UNPAID_1_MONTH,
    UNPAID_2_MONTHS,
    UNPAID_3_MONTHS_PLUS,
    ANNUAL_FEE_REMINDER,
  };
  return templates[type] || null;
}

