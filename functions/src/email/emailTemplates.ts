/**
 * 🔥 Email Templates - 이메일 템플릿
 * 
 * 역할:
 * - 이메일 템플릿 정의
 * - HTML/Text 템플릿
 */

import type { EmailNotificationType } from "../types/email";

export interface EmailTemplateData {
  [key: string]: any;
}

/**
 * 이메일 템플릿 생성
 */
export function getEmailTemplate(
  type: EmailNotificationType,
  data: EmailTemplateData
): { subject: string; html: string; text: string } {
  switch (type) {
    case "match_result":
      return getMatchResultTemplate(data);
    case "match_started":
      return getMatchStartedTemplate(data);
    case "match_completed":
      return getMatchCompletedTemplate(data);
    case "media_uploaded":
      return getMediaUploadedTemplate(data);
    case "award_announced":
      return getAwardAnnouncedTemplate(data);
    case "event_started":
      return getEventStartedTemplate(data);
    case "event_completed":
      return getEventCompletedTemplate(data);
    case "team_match_scheduled":
      return getTeamMatchScheduledTemplate(data);
    case "player_achievement":
      return getPlayerAchievementTemplate(data);
    case "weekly_digest":
      return getWeeklyDigestTemplate(data);
    case "monthly_digest":
      return getMonthlyDigestTemplate(data);
    default:
      return getDefaultTemplate(data);
  }
}

/**
 * 경기 결과 템플릿
 */
function getMatchResultTemplate(data: EmailTemplateData) {
  const { homeTeam, awayTeam, homeScore, awayScore, matchUrl, eventName } =
    data;

  const subject = `경기 결과: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .score { font-size: 32px; font-weight: bold; text-align: center; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚽ 경기 결과</h1>
        </div>
        <div class="content">
          <h2>${eventName || "경기"}</h2>
          <div class="score">
            ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}
          </div>
          <p>경기 결과가 업데이트되었습니다.</p>
          ${matchUrl ? `<a href="${matchUrl}" class="button">경기 상세 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
경기 결과: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}

${eventName || "경기"} 결과가 업데이트되었습니다.

${matchUrl ? `경기 상세: ${matchUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 미디어 업로드 템플릿
 */
function getMediaUploadedTemplate(data: EmailTemplateData) {
  const { entityType, entityName, mediaCount, mediaUrl } = data;

  const subject = `${entityName}에 새 사진이 업로드되었습니다`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📸 새 사진 업로드</h1>
        </div>
        <div class="content">
          <h2>${entityName}</h2>
          <p>${mediaCount}개의 새 사진이 업로드되었습니다.</p>
          ${mediaUrl ? `<a href="${mediaUrl}" class="button">갤러리 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${entityName}에 새 사진이 업로드되었습니다

${mediaCount}개의 새 사진이 업로드되었습니다.

${mediaUrl ? `갤러리 보기: ${mediaUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 수상 발표 템플릿
 */
function getAwardAnnouncedTemplate(data: EmailTemplateData) {
  const { awardType, recipientName, eventName, awardUrl } = data;

  const awardLabels: Record<string, string> = {
    champion: "🏆 우승",
    runner_up: "🥈 준우승",
    top_scorer: "⚽ 득점왕",
    mvp: "⭐ MVP",
  };

  const awardLabel = awardLabels[awardType] || awardType;

  const subject = `${eventName}: ${recipientName} ${awardLabel} 수상`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .award { font-size: 48px; text-align: center; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${awardLabel}</h1>
        </div>
        <div class="content">
          <h2>${eventName}</h2>
          <div class="award">${awardLabel}</div>
          <p style="text-align: center; font-size: 20px; font-weight: bold;">${recipientName}</p>
          ${awardUrl ? `<a href="${awardUrl}" class="button">상세 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${eventName}: ${recipientName} ${awardLabel} 수상

${awardLabel} 수상자가 발표되었습니다.

${awardUrl ? `상세 보기: ${awardUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 경기 시작 템플릿
 */
function getMatchStartedTemplate(data: EmailTemplateData) {
  const { homeTeam, awayTeam, matchUrl, eventName } = data;

  const subject = `경기 시작: ${homeTeam} vs ${awayTeam}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚽ 경기 시작</h1>
        </div>
        <div class="content">
          <h2>${eventName || "경기"}</h2>
          <p style="font-size: 18px; text-align: center; margin: 20px 0;">
            ${homeTeam} vs ${awayTeam}
          </p>
          <p>경기가 시작되었습니다. 실시간 점수를 확인하세요!</p>
          ${matchUrl ? `<a href="${matchUrl}" class="button">경기 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
경기 시작: ${homeTeam} vs ${awayTeam}

${eventName || "경기"}가 시작되었습니다.

${matchUrl ? `경기 보기: ${matchUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 경기 완료 템플릿
 */
function getMatchCompletedTemplate(data: EmailTemplateData) {
  return getMatchResultTemplate(data);
}

/**
 * 이벤트 시작 템플릿
 */
function getEventStartedTemplate(data: EmailTemplateData) {
  const { eventName, eventUrl } = data;

  const subject = `${eventName} 시작`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 이벤트 시작</h1>
        </div>
        <div class="content">
          <h2>${eventName}</h2>
          <p>이벤트가 시작되었습니다!</p>
          ${eventUrl ? `<a href="${eventUrl}" class="button">이벤트 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${eventName} 시작

이벤트가 시작되었습니다!

${eventUrl ? `이벤트 보기: ${eventUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 이벤트 완료 템플릿
 */
function getEventCompletedTemplate(data: EmailTemplateData) {
  const { eventName, eventUrl } = data;

  const subject = `${eventName} 완료`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #6b7280; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ 이벤트 완료</h1>
        </div>
        <div class="content">
          <h2>${eventName}</h2>
          <p>이벤트가 완료되었습니다. 결과를 확인하세요!</p>
          ${eventUrl ? `<a href="${eventUrl}" class="button">결과 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${eventName} 완료

이벤트가 완료되었습니다.

${eventUrl ? `결과 보기: ${eventUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 팀 경기 일정 템플릿
 */
function getTeamMatchScheduledTemplate(data: EmailTemplateData) {
  const { teamName, opponentTeam, matchDate, matchUrl } = data;

  const subject = `${teamName} 경기 일정: ${opponentTeam} vs ${teamName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 경기 일정</h1>
        </div>
        <div class="content">
          <h2>${opponentTeam} vs ${teamName}</h2>
          <p>경기 일정: ${matchDate}</p>
          ${matchUrl ? `<a href="${matchUrl}" class="button">경기 상세 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${teamName} 경기 일정: ${opponentTeam} vs ${teamName}

경기 일정: ${matchDate}

${matchUrl ? `경기 상세: ${matchUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 선수 성과 템플릿
 */
function getPlayerAchievementTemplate(data: EmailTemplateData) {
  const { playerName, achievement, playerUrl } = data;

  const subject = `${playerName}의 새로운 성과`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⭐ 새로운 성과</h1>
        </div>
        <div class="content">
          <h2>${playerName}</h2>
          <p style="font-size: 18px;">${achievement}</p>
          ${playerUrl ? `<a href="${playerUrl}" class="button">선수 프로필 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${playerName}의 새로운 성과

${achievement}

${playerUrl ? `선수 프로필: ${playerUrl}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 주간 요약 템플릿
 */
function getWeeklyDigestTemplate(data: EmailTemplateData) {
  const { week, matches, events, highlights } = data;

  const subject = `주간 요약: ${week}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .section { margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 주간 요약</h1>
        </div>
        <div class="content">
          <h2>${week}</h2>
          <div class="section">
            <h3>경기</h3>
            <p>${matches}경기 진행</p>
          </div>
          <div class="section">
            <h3>이벤트</h3>
            <p>${events}개 이벤트</p>
          </div>
          ${
            highlights
              ? `
          <div class="section">
            <h3>하이라이트</h3>
            <p>${highlights}</p>
          </div>`
              : ""
          }
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
주간 요약: ${week}

경기: ${matches}경기
이벤트: ${events}개
${highlights ? `하이라이트: ${highlights}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 월간 요약 템플릿
 */
function getMonthlyDigestTemplate(data: EmailTemplateData) {
  const { month, matches, events, topPlayers, topTeams } = data;

  const subject = `월간 요약: ${month}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .section { margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 월간 요약</h1>
        </div>
        <div class="content">
          <h2>${month}</h2>
          <div class="section">
            <h3>경기</h3>
            <p>${matches}경기 진행</p>
          </div>
          <div class="section">
            <h3>이벤트</h3>
            <p>${events}개 이벤트</p>
          </div>
          ${
            topPlayers
              ? `
          <div class="section">
            <h3>주요 선수</h3>
            <p>${topPlayers}</p>
          </div>`
              : ""
          }
          ${
            topTeams
              ? `
          <div class="section">
            <h3>주요 팀</h3>
            <p>${topTeams}</p>
          </div>`
              : ""
          }
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
월간 요약: ${month}

경기: ${matches}경기
이벤트: ${events}개
${topPlayers ? `주요 선수: ${topPlayers}` : ""}
${topTeams ? `주요 팀: ${topTeams}` : ""}
  `;

  return { subject, html, text };
}

/**
 * 기본 템플릿
 */
function getDefaultTemplate(data: EmailTemplateData) {
  const { title, message, url } = data;

  const subject = title || "YAGO SPORTS 알림";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title || "알림"}</h1>
        </div>
        <div class="content">
          <p>${message || ""}</p>
          ${url ? `<a href="${url}" class="button">자세히 보기</a>` : ""}
        </div>
        <div class="footer">
          <p>YAGO SPORTS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${title || "알림"}

${message || ""}

${url ? `자세히 보기: ${url}` : ""}
  `;

  return { subject, html, text };
}
