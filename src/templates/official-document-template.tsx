/**
 * 🔥 공문/PDF 출력용 HTML 템플릿 (완전 안 깨지게)
 * 
 * 한글 폰트 임베딩 + white-space: pre-wrap + UTF-8 인코딩
 */

import React from "react";

/**
 * 구청 제출 공문 템플릿
 */
export function OfficialDocumentTemplate({
  documentNumber,
  executionDate,
  recipient,
  subject,
  content,
  attachments,
  sender,
  contact,
}: {
  documentNumber: string;
  executionDate: string;
  recipient: string;
  subject: string;
  content: string;
  attachments?: string[];
  sender: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
}) {
  return (
    <div
      style={{
        fontFamily: '"Noto Sans KR", "Malgun Gothic", system-ui, sans-serif',
        whiteSpace: "pre-wrap",
        wordBreak: "keep-all",
        overflowWrap: "anywhere",
        lineHeight: "1.8",
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "#fff",
        color: "#000",
      }}
    >
      <div style={{ textAlign: "right", marginBottom: "40px" }}>
        <p>문서번호: {documentNumber}</p>
        <p>시행일자: {executionDate}</p>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <p>수&nbsp;&nbsp;&nbsp;&nbsp;신: {recipient}</p>
        <p>제&nbsp;&nbsp;&nbsp;&nbsp;목: {subject}</p>
      </div>

      <div
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
          marginBottom: "30px",
        }}
      >
        {content}
      </div>

      {attachments && attachments.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <p>붙임: {attachments.join(". ")}. 끝.</p>
        </div>
      )}

      <div style={{ textAlign: "right", marginTop: "60px" }}>
        <p>{executionDate}</p>
        <p style={{ marginTop: "20px" }}>
          {sender} (인)
        </p>
        <p style={{ marginTop: "10px", fontSize: "0.9em" }}>
          담당자: {contact.name} / 연락처: {contact.phone} / 이메일: {contact.email}
        </p>
      </div>
    </div>
  );
}

/**
 * 아카데미 요약 리포트 템플릿
 */
export function AcademySummaryReportTemplate({
  organization,
  period,
  reportDate,
  author,
  overview,
  training,
  attendance,
  improvements,
  attachments,
}: {
  organization: string;
  period: string;
  reportDate: string;
  author: string;
  overview: {
    venue: string;
    time: string;
    totalParticipants: number;
    newParticipants: number;
    returningParticipants: number;
  };
  training: {
    basics: string;
    tactics: string;
    safety: string;
  };
  attendance: {
    averageRate: number;
    injuries: { has: boolean; details?: string };
    complaints: { has: boolean; details?: string };
  };
  improvements: {
    items: string[];
    nextMonthPlan: string;
  };
  attachments?: boolean;
}) {
  return (
    <div
      style={{
        fontFamily: '"Noto Sans KR", "Malgun Gothic", system-ui, sans-serif',
        whiteSpace: "pre-wrap",
        wordBreak: "keep-all",
        overflowWrap: "anywhere",
        lineHeight: "1.8",
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "#fff",
        color: "#000",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        [아카데미 운영 요약 리포트] (1P)
      </h1>

      <div style={{ marginBottom: "30px" }}>
        <p>- 대상: {organization}</p>
        <p>- 기간: {period}</p>
        <p>- 작성일: {reportDate}</p>
        <p>- 작성자: {author}</p>
      </div>

      <section style={{ marginBottom: "30px" }}>
        <h2>1. 운영 개요</h2>
        <p>- 운영 장소: {overview.venue}</p>
        <p>- 운영 시간: {overview.time}</p>
        <p>
          - 참가 인원: 총 {overview.totalParticipants}명 / 신규 {overview.newParticipants}명 / 재참여 {overview.returningParticipants}명
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2>2. 훈련/교육 내용</h2>
        <p>- 기본기: {training.basics}</p>
        <p>- 전술: {training.tactics}</p>
        <p>- 안전/규정: {training.safety}</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2>3. 출결 및 특이사항</h2>
        <p>- 평균 출석률: {attendance.averageRate}%</p>
        <p>
          - 부상/사고: {attendance.injuries.has ? "유" : "무"}
          {attendance.injuries.details && ` / 내용: ${attendance.injuries.details}`}
        </p>
        <p>
          - 민원/이슈: {attendance.complaints.has ? "유" : "무"}
          {attendance.complaints.details && ` / 내용: ${attendance.complaints.details}`}
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2>4. 개선 사항 및 다음 계획</h2>
        <p>- 개선: {improvements.items.join(", ")}</p>
        <p>- 다음 달 계획: {improvements.nextMonthPlan}</p>
      </section>

      <div style={{ marginTop: "40px" }}>
        <p>첨부</p>
        <p>- 출결/사진/증빙자료: {attachments ? "유" : "무"}</p>
      </div>
    </div>
  );
}

/**
 * CSS 스타일 (전역 적용용)
 */
export const officialDocumentStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
  
  .official-document {
    font-family: "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;
    white-space: pre-wrap;
    word-break: keep-all;
    overflow-wrap: anywhere;
    line-height: 1.8;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
    background-color: #fff;
    color: #000;
  }
  
  .official-document h1,
  .official-document h2 {
    font-weight: 700;
    margin-top: 30px;
    margin-bottom: 15px;
  }
  
  .official-document p {
    margin: 8px 0;
  }
`;

/**
 * PDF 생성용 HTML 헤더 (UTF-8 + 폰트)
 */
export const pdfHtmlHeader = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>공문</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    ${officialDocumentStyles}
    @media print {
      body { margin: 0; padding: 0; }
      .official-document { padding: 20px; }
    }
  </style>
</head>
<body>
`;

export const pdfHtmlFooter = `
</body>
</html>
`;

