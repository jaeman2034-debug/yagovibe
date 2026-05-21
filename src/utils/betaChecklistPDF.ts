/**
 * 🔥 Beta Checklist PDF - 베타 체크리스트 PDF 생성
 * 
 * 역할:
 * - 출시 체크리스트를 PDF로 변환
 * - 베타 테스트 가이드 PDF 생성
 * 
 * UX 목적:
 * - 베타 테스트 참여자에게 PDF 제공
 */

import { LAUNCH_CHECKLIST, TEST_SCENARIOS, type ChecklistItem } from "./launchChecklist";

/**
 * 🔥 체크리스트를 HTML로 변환 (PDF 생성용)
 */
export function generateChecklistHTML(checklist: ChecklistItem[]): string {
  const categories = ["auth", "data", "ui", "performance", "security"];
  const categoryLabels: Record<string, string> = {
    auth: "인증",
    data: "데이터",
    ui: "UI",
    performance: "성능",
    security: "보안",
  };

  let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YAGO SPORTS 출시 체크리스트</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #2563eb;
      font-size: 28px;
    }
    .category {
      margin-bottom: 30px;
    }
    .category-title {
      color: #2563eb;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .item {
      margin-bottom: 12px;
      padding: 12px;
      background: #f9fafb;
      border-left: 4px solid #2563eb;
      border-radius: 4px;
    }
    .item-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .item-description {
      font-size: 14px;
      color: #666;
    }
    .scenarios {
      margin-top: 40px;
    }
    .scenario {
      margin-bottom: 20px;
      padding: 16px;
      background: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      border-radius: 4px;
    }
    .scenario-title {
      font-weight: bold;
      color: #0ea5e9;
      margin-bottom: 8px;
    }
    .scenario-steps {
      margin-left: 20px;
    }
    .scenario-steps li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 YAGO SPORTS 출시 체크리스트</h1>
    <p>생성일: ${new Date().toLocaleString("ko-KR")}</p>
  </div>
`;

  categories.forEach((category) => {
    const items = checklist.filter((item) => item.category === category);
    if (items.length === 0) return;

    html += `
  <div class="category">
    <div class="category-title">${categoryLabels[category]}</div>
`;

    items.forEach((item) => {
      html += `
    <div class="item">
      <div class="item-title">${item.title}</div>
      <div class="item-description">${item.description}</div>
    </div>
`;
    });

    html += `  </div>`;
  });

  html += `
  <div class="scenarios">
    <h2 style="color: #0ea5e9; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 20px;">
      테스트 시나리오
    </h2>
`;

  TEST_SCENARIOS.forEach((scenario) => {
    html += `
    <div class="scenario">
      <div class="scenario-title">${scenario.title}</div>
      <ol class="scenario-steps">
        ${scenario.steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
    </div>
`;
  });

  html += `
  </div>
</body>
</html>
`;

  return html;
}

/**
 * 🔥 체크리스트 PDF 다운로드
 */
export function downloadChecklistPDF(checklist: ChecklistItem[]): void {
  const html = generateChecklistHTML(checklist);

  // 새 창 열기
  const newWindow = window.open("", "_blank");
  if (!newWindow) {
    alert("팝업이 차단되었습니다. 팝업을 허용해주세요.");
    return;
  }

  newWindow.document.write(html);
  newWindow.document.close();

  // 인쇄 대화상자 열기 (PDF 저장 가능)
  setTimeout(() => {
    newWindow.print();
  }, 250);
}

/**
 * 🔥 베타 가이드 HTML 생성
 */
export function generateBetaGuideHTML(): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YAGO SPORTS 베타 테스트 가이드</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #0ea5e9;
      margin-top: 30px;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .checklist {
      list-style: none;
      padding: 0;
    }
    .checklist li {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .checklist li:before {
      content: "☐ ";
      margin-right: 8px;
    }
    .tip {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 16px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>🔥 YAGO SPORTS 베타 테스트 가이드</h1>
  
  <div class="section">
    <h2>📋 개요</h2>
    <p>YAGO SPORTS는 선수 퍼포먼스 관리 플랫폼입니다. 이 가이드는 베타 테스트 참여자를 위한 사용 설명서입니다.</p>
  </div>

  <div class="section">
    <h2>🎯 베타 테스트 목표</h2>
    <p><strong>3일 동안 실제 사용 데이터 확보</strong></p>
    <ul>
      <li>실제 선수 5~20명이 앱을 사용</li>
      <li>일일 컨디션 기록</li>
      <li>루틴 체크</li>
      <li>활동 기록</li>
      <li>코치 리포트 생성</li>
    </ul>
  </div>

  <div class="section">
    <h2>🏃‍♂️ 선수용 가이드</h2>
    <h3>Day 1: 첫 사용</h3>
    <ul class="checklist">
      <li>로그인 성공</li>
      <li>프로필 설정 완료</li>
      <li>컨디션 입력 완료</li>
      <li>루틴 체크 완료</li>
      <li>목표 설정 완료</li>
      <li>활동 시작/종료 완료</li>
    </ul>
    <div class="tip">
      <strong>💡 팁:</strong> 첫 사용 시 성장 탭에서 온보딩 가이드를 따라주세요.
    </div>
  </div>

  <div class="section">
    <h2>👨‍🏫 코치용 가이드</h2>
    <h3>경기 전 리포트 생성</h3>
    <ol>
      <li>코치 대시보드 접속</li>
      <li>"경기 전 리포트 생성" 버튼 클릭</li>
      <li>리포트 내용 확인</li>
      <li>다운로드 또는 인쇄</li>
    </ol>
  </div>

  <div class="section">
    <h2>✅ 베타 성공 기준</h2>
    <ul>
      <li><strong>하루 1회 이상 앱 열림</strong> - 3일 중 최소 2일 이상 접속</li>
      <li><strong>루틴 체크 50% 이상</strong> - 3일 중 최소 2일 이상 루틴 체크</li>
      <li><strong>코치 리포트 사용됨</strong> - 경기 전 리포트 최소 1회 생성</li>
    </ul>
  </div>
</body>
</html>
`;
}

/**
 * 🔥 베타 가이드 PDF 다운로드
 */
export function downloadBetaGuidePDF(): void {
  const html = generateBetaGuideHTML();

  const newWindow = window.open("", "_blank");
  if (!newWindow) {
    alert("팝업이 차단되었습니다. 팝업을 허용해주세요.");
    return;
  }

  newWindow.document.write(html);
  newWindow.document.close();

  setTimeout(() => {
    newWindow.print();
  }, 250);
}
