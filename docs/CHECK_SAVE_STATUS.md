# 🔍 저장 상태 확인 가이드

## 콘솔 로그 분석

콘솔에 보이는 내용:
- ✅ `[handleSave] 함수 실행됨` - 저장 함수 실행
- ✅ `[handleSave] 저장 상태 복구 완료 (finally)` - finally 블록 실행 (성공/실패 무관)

## 저장 성공 여부 확인 방법

### 방법 1: UI 확인 (가장 빠름)

#### ✅ 저장 성공 시:
- Drawer가 자동으로 닫힘
- 성공 토스트 메시지 표시: "✅ 대회가 등록되었습니다."
- 대회 목록에 새 대회가 나타남

#### ❌ 저장 실패 시:
- Drawer가 열려 있음
- 빨간색 에러 메시지 표시: "❌ 저장 실패"
- 에러 상세 내용 표시

### 방법 2: Firebase Console에서 확인

1. **Firebase Console 열기**: https://console.firebase.google.com/project/yago-vibe-spt/firestore
2. **경로 확인**: `associations/assoc-nowon-football/tournaments`
3. **새 문서 확인**: 방금 입력한 제목의 대회 문서가 있는지 확인

### 방법 3: 브라우저 콘솔에서 확인

```javascript
// 대회 목록 확인
const { collection, getDocs } = await import("firebase/firestore");
const { db } = await import("@/lib/firebase");

const tournamentsRef = collection(db, "associations/assoc-nowon-football/tournaments");
const snapshot = await getDocs(tournamentsRef);

console.log("대회 목록:", snapshot.docs.map(doc => ({
  id: doc.id,
  title: doc.data().title,
  createdAt: doc.data().createdAt
})));
```

## 현재 상태 확인

### 질문 1: Drawer가 닫혔나요?
- ✅ 닫혔음 → 저장 성공 가능성 높음
- ❌ 열려 있음 → 저장 실패

### 질문 2: 에러 메시지가 표시되나요?
- ✅ 없음 → 저장 성공 가능성 높음
- ❌ 있음 → 저장 실패 (에러 내용 확인 필요)

### 질문 3: 대회 목록에 새 대회가 보이나요?
- ✅ 보임 → 저장 성공
- ❌ 안 보임 → 저장 실패 또는 인덱스 문제

## 인덱스 에러는 별개 문제

콘솔에 보이는 `The query requires an index` 에러는:
- **저장과 무관**: 목록 조회용 인덱스 부족
- **해결**: Firebase Console 링크 클릭하여 인덱스 생성

## 다음 단계

1. **Drawer 상태 확인**: 닫혔는지 확인
2. **Firebase Console 확인**: 실제 문서 생성 여부 확인
3. **문제가 있으면**: 콘솔의 정확한 에러 메시지 확인

