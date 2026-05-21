# 🔥 구청·감사용 자동 PDF 패키지 생성 (STEP 5)

## 📋 목적
대회 전 과정이 버튼 1번으로 '공식 문서(PDF)'로 자동 정리됩니다.

---

## 1️⃣ 생성 트리거

### 위치
대회 관리(ops) > 보고/제출

### 버튼
`[구청 제출용 PDF 생성]`

### 특징
- 언제든 생성 가능
- 생성 시점 기준 스냅샷 고정
- 재생성 가능 (이력 남김)

---

## 2️⃣ PDF 패키지 구성 (고정 목차)

### 📘 ① 표지 (Cover)
- 문서명: `{대회명} 운영·검증 종합 보고서`
- 생성 일시
- 생성 주체: 협회명
- 시스템명

### 📘 ② 대회 개요
- 대회명
- 개최 기간
- 장소
- 참가 대상
- 대회 유형 (조별/토너먼트)
- 시스템 운영 여부 (전자 검증)

### 📘 ③ 참가 및 선수 검증 현황
- 참가 팀 수
- 참가 선수 수
- 연령 검증 결과 요약
- 승인 / 반려 현황
- ✔ 시스템 자동 검증 + 사무국 승인 로그 기반

### 📘 ④ 조 추첨 보고 (핵심)
- 조 추첨 방식: 시스템 자동 비대면
- 실행 일시 / 실행자
- 랜덤 시드
- 조 편성 결과 표
- 📌 사람 개입 없음 명시

### 📘 ⑤ 경기 일정표 (경기장별)
- 날짜별
- 경기장별
- 경기 시간
- 팀 매칭
- 자동 배정 규칙 요약 포함

### 📘 ⑥ 경기 결과 요약
- 경기 수
- 결과 집계
- 최종 순위(해당 시)
- 특이사항

### 📘 ⑦ 현장 운영 및 체크인
- QR 체크인 방식 설명
- 체크인 기록 수
- 미승인 선수 차단 사례 요약

### 📘 ⑧ 운영 로그 요약 (감사 핵심)
- 조 추첨 실행 로그
- 경기 생성 로그
- 일정 생성 로그
- 결과 확정 로그
- ✔ 전부 시스템 타임스탬프 포함

### 📘 ⑨ 결론 및 책임 주체
```
본 대회는 협회 공식 시스템을 통해
참가·검수·조 추첨·경기 운영이 이루어졌으며,
모든 과정은 시스템 로그로 기록되었습니다.
```

---

## 3️⃣ 기술적 생성 방식

### HTML 템플릿 → PDF 변환
- Puppeteer 사용 (서버 사이드)
- 한글 폰트 임베딩 (Noto Sans KR)
- UTF-8 고정
- 페이지 번호 자동
- 표 자동 줄바꿈

### CSS 스타일
```css
@page {
  size: A4;
  margin: 2cm;
}
body {
  font-family: "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;
  font-size: 11pt;
  line-height: 1.8;
}
.page-break {
  page-break-before: always;
}
```

### 깨짐 방지
- ✅ `white-space: pre-wrap`
- ✅ `word-break: keep-all`
- ✅ 폰트 임베딩
- ✅ UTF-8 인코딩

---

## 4️⃣ 행정·감사 대응 포인트

| 질문 | 제출 |
|------|------|
| 대회 언제 생성? | PDF 표지 + 시스템 공지 |
| 조 추첨 공정성? | 랜덤 시드 + 로그 |
| 현장 출전 검증? | QR 체크인 기록 |
| 결과 조작? | 결과 확정 로그 |

**👉 설명 ❌ / 문서 ⭕**

---

## 5️⃣ API

### Endpoint
`POST /api/admin/tournaments/{tournamentId}/generate-pdf`

### Request
```typescript
{
  associationId: string;
  tournamentId: string;
  generatedBy: string;
}
```

### Response
```typescript
{
  success: boolean;
  pdfUrl: string;  // 생성된 PDF 다운로드 URL
  generatedAt: Timestamp;
  logId: string;  // 생성 로그 ID
}
```

---

## 6️⃣ 데이터 수집

### 수집 항목
1. 대회 정보 (`tournament`)
2. 참가 팀 (`teams`)
3. 참가 선수 (`players`)
4. 조 추첨 로그 (`drawLog`)
5. 경기 목록 (`matches`)
6. 체크인 기록 (`checkIns`)
7. 운영 로그 (`opsLogs`)

### 스냅샷 고정
- 생성 시점 기준 데이터 고정
- 재생성 시에도 이전 데이터 유지 (이력 관리)

---

## 7️⃣ 운영 로그 기록

```typescript
{
  action: "PDF 패키지 생성",
  executor: string,
  timestamp: Timestamp,
  details: "구청 제출용 PDF 생성",
  metadata: {
    tournamentId: string,
    pdfUrl: string,
    generatedAt: Timestamp
  }
}
```

---

## 🎯 핵심 원칙

1. **스냅샷 고정**: 생성 시점 기준 데이터 고정
2. **완전성**: 모든 과정이 문서에 포함
3. **감사 대응**: 로그 기반 증빙
4. **깨짐 방지**: 한글 폰트 임베딩 + UTF-8

---

## ✅ 완료 체크리스트

- [x] PDF 패키지 구성 정의
- [x] HTML 템플릿 생성
- [x] 데이터 수집 로직
- [x] 한글 폰트 임베딩
- [x] 깨짐 방지 CSS
- [x] 운영 로그 기록
- [x] 행정·감사 대응 포인트

---

## 🎉 최종 상태

| 항목 | 상태 |
|------|------|
| 대회 생성 | ✅ |
| 참가·검수 | ✅ |
| 조 추첨 | ✅ |
| 경기 생성 | ✅ |
| 일정 자동화 | ✅ |
| 현장 운영 | ✅ |
| 행정 보고 | ✅ |

**👉 실전 운영 시스템 "완성"**

