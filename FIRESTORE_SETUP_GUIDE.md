# 🔥 Firestore 실시간 통계 연동 설정 가이드

## ✅ 완료된 작업

### 1️⃣ AdminSummaryChart.tsx 업데이트
- ✅ Firestore 실시간 연동
- ✅ onSnapshot으로 실시간 구독
- ✅ 기본 데이터 fallback
- ✅ TypeScript 타입 안전성

## 🔧 Firestore 설정

### 1단계: Firestore Database 생성

Firebase Console → Firestore Database → 데이터베이스 만들기

### 2단계: Collection 및 Document 생성

#### Collection: `stats`
#### Document ID: `weeklySummary`

```json
{
  "labels": ["1주차", "2주차", "3주차", "4주차"],
  "signups": [12, 19, 14, 23],
  "activeUsers": [18, 25, 22, 28],
  "updatedAt": "2025-10-27T12:00:00Z"
}
```

### 3단계: Firestore 보안 규칙 설정

```javascript
// Firestore 보안 규칙
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // stats 컬렉션 읽기 허용
    match /stats/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🔄 실시간 동작 방식

### 1. 데이터 수신
```typescript
onSnapshot(doc(db, "stats", "weeklySummary"), (docSnap) => {
  // Firestore 데이터 자동 수신
  const data = docSnap.data();
  // 차트 업데이트
  setChartData({ ... });
});
```

### 2. 실시간 업데이트
- Firestore 데이터 변경 → 자동으로 차트 업데이트
- 사용자 개입 없이 실시간 반영

### 3. Fallback 처리
- Firestore에 문서가 없으면 기본 데이터 사용
- 안전한 에러 처리

## 📊 데이터 구조

### Firestore Document 구조
```typescript
interface StatsData {
  labels: string[];       // ["1주차", "2주차", "3주차", "4주차"]
  signups: number[];      // [12, 19, 14, 23]
  activeUsers: number[];  // [18, 25, 22, 28]
  updatedAt: string;      // ISO 8601 형식
}
```

### 차트 데이터 구조
```typescript
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}
```

## 🚀 사용 방법

### 1. Firestore 데이터 추가

Firebase Console에서 `stats` 컬렉션에 `weeklySummary` 문서 추가

### 2. 차트 확인

```bash
npm run dev
```

브라우저에서 `https://localhost:5178/home` 접속

### 3. 실시간 업데이트 테스트

Firebase Console에서 데이터 수정 → 차트 자동 업데이트 확인

## ✨ 주요 특징

### 실시간 동기화
- ✅ Firestore 변경 즉시 반영
- ✅ onSnapshot 자동 구독
- ✅ 리소스 정리 (cleanup)

### 안전한 처리
- ✅ 문서 없을 때 기본 데이터 사용
- ✅ TypeScript 타입 안전성
- ✅ 로딩 상태 표시

### 성능 최적화
- ✅ 필요한 데이터만 구독
- ✅ 컴포넌트 언마운트 시 구독 해제
- ✅ 메모이제이션

## 🧪 테스트 시나리오

### 1. Firestore에 데이터가 있는 경우
- 차트 정상 표시
- 실시간 업데이트

### 2. Firestore에 데이터가 없는 경우
- 기본 데이터 표시
- "데이터 불러오는 중..." 메시지

### 3. Firestore 데이터 변경
- 차트 자동 업데이트
- 사용자 새로고침 불필요

## 🔧 트러블슈팅

### 차트가 표시되지 않는 경우
1. Firestore 데이터 확인
2. Firebase 설정 확인
3. 브라우저 콘솔 오류 확인

### 실시간 업데이트가 안 되는 경우
1. Firestore 보안 규칙 확인
2. 네트워크 연결 확인
3. onSnapshot 구독 상태 확인

---

**🎉 Firestore 실시간 통계 연동 완료!**

Firestore 데이터가 자동으로 차트에 반영됩니다! 🔥📈

