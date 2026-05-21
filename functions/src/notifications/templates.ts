/**
 * 🔔 알림 메시지 템플릿
 * 
 * 코드에 하드코딩하지 않고 템플릿 분리
 * 나중에 문구/대회명 바뀌어도 코드 안 건드림
 */

export interface NotificationTemplateParams {
  competitionName: string;
  teamName?: string;
  rosterUrl: string;
  deadline?: string; // "2025-03-10" 형식
  daysUntilDeadline?: number;
}

/**
 * A. 참가 신청 승인 알림 템플릿
 */
export function renderApprovalNotification(params: NotificationTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { competitionName, teamName, rosterUrl } = params;

  const subject = `[${competitionName}] 참가 신청이 승인되었습니다 🎉`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🎉 참가 신청 승인</h1>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${competitionName}</strong> 참가 신청이 승인되었습니다.
    </p>
    
    ${teamName ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">팀명: <strong>${teamName}</strong></p>` : ""}
    
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        다음 단계: 아래 링크에서 선수 명단을 등록해주세요.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${rosterUrl}" 
         target="_blank"
         style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        ▶ 선수 명단 등록하기
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      감사합니다.<br/>
      YAGO SPORTS 운영 시스템
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
[${competitionName}] 참가 신청이 승인되었습니다 🎉

안녕하세요.

${competitionName} 참가 신청이 승인되었습니다.
${teamName ? `팀명: ${teamName}` : ""}

다음 단계: 아래 링크에서 선수 명단을 등록해주세요.

▶ 선수 명단 등록하기
${rosterUrl}

감사합니다.
YAGO SPORTS 운영 시스템
  `.trim();

  return { subject, html, text };
}

/**
 * B. 선수 명단 미제출 알림 템플릿
 */
export function renderRosterReminderNotification(params: NotificationTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { competitionName, teamName, rosterUrl, daysUntilDeadline, deadline } = params;

  const daysText = daysUntilDeadline 
    ? daysUntilDeadline === 1 
      ? "하루" 
      : `${daysUntilDeadline}일`
    : deadline 
      ? `(${deadline})`
      : "";

  const subject = `[${competitionName}] 선수 명단 제출이 필요합니다 ⏰`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">⏰ 선수 명단 제출 필요</h1>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${competitionName}</strong> 참가 신청이 승인되었으나, 아직 선수 명단이 제출되지 않았습니다.
    </p>
    
    ${teamName ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">팀명: <strong>${teamName}</strong></p>` : ""}
    
    ${daysUntilDeadline !== undefined || deadline ? `
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
        ${daysUntilDeadline !== undefined 
          ? `마감까지 ${daysText} 남았습니다.`
          : deadline 
            ? `마감일: ${deadline}`
            : ""}
      </p>
    </div>
    ` : ""}
    
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        마감 전까지 명단 등록을 완료해주세요. 마감 이후에는 수정이 불가능합니다.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${rosterUrl}" 
         target="_blank"
         style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        ▶ 선수 명단 등록하기
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      감사합니다.<br/>
      YAGO SPORTS 운영 시스템
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
[${competitionName}] 선수 명단 제출이 필요합니다 ⏰

안녕하세요.

${competitionName} 참가 신청이 승인되었으나, 아직 선수 명단이 제출되지 않았습니다.
${teamName ? `팀명: ${teamName}` : ""}

${daysUntilDeadline !== undefined 
  ? `마감까지 ${daysText} 남았습니다.`
  : deadline 
    ? `마감일: ${deadline}`
    : ""}

마감 전까지 명단 등록을 완료해주세요. 마감 이후에는 수정이 불가능합니다.

▶ 선수 명단 등록하기
${rosterUrl}

감사합니다.
YAGO SPORTS 운영 시스템
  `.trim();

  return { subject, html, text };
}

/**
 * C. 마감 임박 알림 템플릿 (선택)
 */
export function renderDeadlineApproachingNotification(params: NotificationTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { competitionName, teamName, rosterUrl, deadline } = params;

  const subject = `[${competitionName}] 선수 명단 제출 마감이 하루 남았습니다 ⚠️`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #dc2626; margin: 0; font-size: 24px;">⚠️ 마감 임박</h1>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${competitionName}</strong> 선수 명단 제출 마감이 하루 남았습니다.
    </p>
    
    ${teamName ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">팀명: <strong>${teamName}</strong></p>` : ""}
    
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
        ${deadline ? `마감일: ${deadline}` : "마감까지 하루 남았습니다."}
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #991b1b;">
        마감 이후에는 수정이 불가능합니다.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${rosterUrl}" 
         target="_blank"
         style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        ▶ 선수 명단 등록하기
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      감사합니다.<br/>
      YAGO SPORTS 운영 시스템
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
[${competitionName}] 선수 명단 제출 마감이 하루 남았습니다 ⚠️

안녕하세요.

${competitionName} 선수 명단 제출 마감이 하루 남았습니다.
${teamName ? `팀명: ${teamName}` : ""}

${deadline ? `마감일: ${deadline}` : "마감까지 하루 남았습니다."}
마감 이후에는 수정이 불가능합니다.

▶ 선수 명단 등록하기
${rosterUrl}

감사합니다.
YAGO SPORTS 운영 시스템
  `.trim();

  return { subject, html, text };
}
