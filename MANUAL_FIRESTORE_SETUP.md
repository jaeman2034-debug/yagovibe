# 🔥 Firestore 수동 데이터 추가 가이드

## ✅ 현재 상태

- ✅ `generateWeeklyReportJob` 함수 구현 완료
- ✅ 에뮬레이터에서 로드 확인됨
- ⏳ Firestore 초기 데이터 필요

## 📊 추가할 데이터 구조

```
📂 reports
 ┗━📂 weekly
     ┗━📂 data
         ┣━📄 summary
         ┗━📄 analytics
```

## 🚀 방법 1: Firebase Emulator UI 사용

### 1단계: 에뮬레이터 실행
```bash
firebase emulators:start
```

### 2단계: Firestore 데이터 추가
1. http://localhost:4000 접속
2. Firestore 탭 선택
3. `reports` 컬렉션 생성
4. `weekly` 문서 생성
5. `data` 서브컬렉션 생성
6. `summary` 문서 생성 (다음 데이터 입력):

```json
{
  "newUsers": 23,
  "activeUsers": 85,
  "growthRate": "27%",
  "highlight": "주간 활동량 증가 📈",
  "recommendation": "AI 추천: 사용자 리텐션 강화 캠페인",
  "updatedAt": "2025-11-02T09:00:00.000Z"
}
```

7. `analytics` 문서 생성 (다음 데이터 입력):

```json
{
  "labels": ["1주차", "2주차", "3주차", "4주차"],
  "newUsers": [12, 18, 14, 23],
  "activeUsers": [20, 24, 22, 85],
  "generatedAt": "2025-11-02T09:00:00.000Z"
}
```

## 🌐 방법 2: 브라우저 콘솔 사용

Firebase Console (프로덕션)에서 실행:

```javascript
const db = firebase.firestore();

// summary 생성
await db.collection("reports").doc("weekly").collection("data").doc("summary").set({
  newUsers: 23,
  activeUsers: 85,
  growthRate: "27%",
  highlight: "주간 활동량 증가 📈",
  recommendation: "AI 추천: 사용자 리텐션 강화 캠페인",
  updatedAt: new Date().toISOString(),
});

// analytics 생성
await db.collection("reports").doc("weekly").collection("data").doc("analytics").set({
  labels: ["1주차", "2주차", "3주차", "4주차"],
  newUsers: [12, 18, 14, 23],
  activeUsers: [20, 24, 22, 85],
  generatedAt: new Date().toISOString(),
});

console.log("✅ Firestore 데이터 생성 완료!");
```

## 🧪 방법 3: 함수 수동 실행

### 에뮬레이터에서 실행
1. http://localhost:4000 접속
2. Functions 탭 선택
3. `generateWeeklyReportJob` 찾기
4. "Run now" 버튼 클릭

### Firebase Console (프로덕션)에서 실행
1. https://console.firebase.google.com/project/yago-vibe-spt/functions
2. `generateWeeklyReportJob` 선택
3. "Test" 또는 "Run now" 클릭

## ✅ 확인 방법

### HomePage에서 확인
- AIWeeklySummary 컴포넌트: summary 데이터 표시
- AdminSummaryChart 컴포넌트: analytics 차트 표시

### 콘솔 로그 확인
```
📊 관리자 주간 리포트 생성 시작...
✅ reports/weekly/data/summary 생성 완료
✅ reports/weekly/data/analytics 생성 완료
🎉 주간 리포트 생성 완료
```

## 🔧 예상 결과

홈페이지 (`/home`)에서:
1. "🧠 AI 자동 요약 리포트" 카드에 데이터 표시
2. "📈 AI 분석 기반 활동 통계 (주간)" 차트 표시
3. "리포트를 준비 중입니다..." 메시지 사라짐

---

**🎉 데이터 추가 후 홈페이지를 새로고침하면 완벽한 대시보드가 표시됩니다!**

