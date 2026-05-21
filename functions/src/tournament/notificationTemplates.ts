/**
 * 🔔 알림 메시지 템플릿
 * 
 * 승인 / 미제출 / 마감 알림 템플릿
 * 코드에 하드코딩하지 않고 템플릿 분리
 */

export interface NotificationTemplateParams {
  competitionName: string;
  rosterUrl: string;
  teamName?: string;
  deadline?: string; // YYYY-MM-DD 형식
  daysLeft?: number;
}

/**
 * A. 참가 신청 승인 알림
 */
export function renderApprovalTemplate(
  params: NotificationTemplateParams
): { subject: string; html: string; text: string } {
  const { competitionName, rosterUrl, teamName } = params;

  const subject = `[${competitionName}] 참가 신청이 승인되었습니다 🎉`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>참가 신청 승인</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px;">
      <h1 style="margin: 0; font-size: 24px;">🎉 참가 신청이 승인되었습니다</h1>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${competitionName}</strong> 참가 신청이 승인되었습니다.
    </p>
    
    ${teamName ? `<p style="font-size: 16px; margin-bottom: 20px;">팀명: <strong>${teamName}</strong></p>` : ""}
    
    <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
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
      YAGO 운영 시스템
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
[${competitionName}] 참가 신청이 승인되었습니다.

${teamName ? `팀명: ${teamName}\n` : ""}
다음 단계: 아래 링크에서 선수 명단을 등록해주세요.

▶ 선수 명단 등록하기
${rosterUrl}

감사합니다.
YAGO 운영 시스템
  `.trim();

  return { subject, html, text };
}

/**
 * B. 선수 명단 미제출 알림
 */
export function renderRosterReminderTemplate(
  params: NotificationTemplateParams
): { subject: string; html: string; text: string } {
  const { competitionName, rosterUrl, teamName, deadline, daysLeft } = params;

  const deadlineText = deadline
    ? ` (마감: ${deadline})`
    : daysLeft !== undefined
    ? ` (마감까지 ${daysLeft}일 남음)`
    : "";

  const subject = `[${competitionName}] 선수 명단 제출이 필요합니다 ⏰`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>선수 명단 제출 안내</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px;">
      <h1 style="margin: 0; font-size: 24px;">⏰ 선수 명단 제출이 필요합니다</h1>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${competitionName}</strong> 선수 명단이 아직 제출되지 않았습니다.${deadlineText}
    </p>
    
    ${teamName ? `<p style="font-size: 16px; margin-bottom: 20px;">팀명: <strong>${teamName}</strong></p>` : ""}
    
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        마감 전까지 명단 등록을 완료해주세요.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${rosterUrl}" 
         target="_blank"
         style="background-color: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        ▶ 선수 명단 등록하기
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      감사합니다.<br/>
      YAGO 운영 시스템
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
[${competitionName}] 선수 명단 제출이 필요합니다.

${teamName ? `팀명: ${teamName}\n` : ""}
아직 선수 명단이 제출되지 않았습니다.${deadlineText}

마감 전까지 명단 등록을 완료해주세요.

▶ 선수 명단 등록하기
${rosterUrl}

감사합니다.
YAGO 운영 시스템
  `.trim();

  return { subject, html, text };
}

/**
 * C. 마감 임박 알림 (선택)
 */
export function renderDeadlineReminderTemplate(
  params: NotificationTemplateParams
): { subject: string; html: string; text: string } {
  const { competitionName, rosterUrl, teamName, deadline, daysLeft } = params;

  const deadlineText = deadline || (daysLeft !== undefined ? `${daysLeft}일` : "곧");

  const subject = `[${competitionName}] 선수 명단 제출 마감이 임박했습니다 ⚠️`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>마감 임박 안내</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px;">
      <h1 style="margin: 0; font-size: 24px;">⚠️ 마감이 임박했습니다</h1>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">안녕하세요.</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${competitionName}</strong> 선수 명단 제출 마감이 <strong>${deadlineText}</strong> 남았습니다.
    </p>
    
    ${teamName ? `<p style="font-size: 16px; margin-bottom: 20px;">팀명: <strong>${teamName}</strong></p>` : ""}
    
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        마감 이후에는 수정이 불가능합니다. 지금 바로 등록해주세요.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${rosterUrl}" 
         target="_blank"
         style="background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        ▶ 선수 명단 등록하기
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      감사합니다.<br/>
      YAGO 운영 시스템
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
[${competitionName}] 선수 명단 제출 마감이 임박했습니다.

${teamName ? `팀명: ${teamName}\n` : ""}
마감이 ${deadlineText} 남았습니다.

마감 이후에는 수정이 불가능합니다. 지금 바로 등록해주세요.

▶ 선수 명단 등록하기
${rosterUrl}

감사합니다.
YAGO 운영 시스템
  `.trim();

  return { subject, html, text };
}
