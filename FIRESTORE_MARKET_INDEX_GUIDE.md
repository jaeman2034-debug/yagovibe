# 🔥 Firestore Market 페이지 인덱스 생성 가이드

## 🚨 문제 상황

Market 페이지에서 Firestore 쿼리 실행 시 다음 오류 발생:

```
FirebaseError: The query requires an index.
You can create it here: https://console.firebase.google.com/...
```

## 🎯 원인

Market 페이지에서 사용하는 복합 쿼리:

### 쿼리 1: type 필터 + 정렬
```typescript
where("type", "==", "used")  // 또는 "share", "lost"
orderBy("createdAt", "desc")
```

### 쿼리 2: sport + type 필터 + 정렬
```typescript
where("sport", "==", "soccer")
where("type", "==", "used")
orderBy("createdAt", "desc")
```

### 쿼리 3: 가격 정렬
```typescript
where("type", "==", "used")
orderBy("price", "asc")  // 또는 "desc"
```

👉 이런 복합 쿼리는 **반드시 composite index 필요**

---

## ✅ 해결 방법

### 방법 1: 에러 링크로 자동 생성 (가장 빠름, 추천)

1. **브라우저 콘솔 확인**
   - Market 페이지 접속
   - 개발자 도구 콘솔 열기 (F12)
   - 인덱스 오류 메시지 확인

2. **인덱스 생성 링크 클릭**
   - 콘솔에 다음과 같은 메시지가 표시됩니다:
   ```
   FirebaseError: The query requires an index.
   You can create it here: https://console.firebase.google.com/...
   ```
   - **링크 클릭**

3. **인덱스 생성**
   - Firebase Console이 열리면
   - "만들기" 또는 "CREATE INDEX" 버튼 클릭
   - 인덱스 생성 완료 대기 (약 1~3분)

4. **페이지 새로고침**
   - 인덱스 생성 완료 후 페이지 새로고침
   - 다음 인덱스 오류가 나타나면 위 과정 반복

---

### 방법 2: 수동 인덱스 생성

Firebase Console → Firestore → Indexes → Create Index

#### 필요한 인덱스 목록

##### 1. type + createdAt 인덱스 (기본) - 필수
```
Collection: sports/{sport}/marketPosts
Fields:
  - type: Ascending
  - createdAt: Descending
Query Scope: Collection
```

**중요**: 이 인덱스는 반드시 필요합니다. 없으면 쿼리가 실패합니다.

##### 2. type + keywordTokens 인덱스 (검색 사용 시)
```
Collection: sports/{sport}/marketPosts
Fields:
  - type: Ascending
  - keywordTokens: Array
  - createdAt: Descending
Query Scope: Collection
```

**참고**: 검색 기능을 사용하는 경우에만 필요합니다.

##### 3. type + price 인덱스 (가격 정렬 사용 시)
```
Collection: sports/{sport}/marketPosts
Fields:
  - type: Ascending
  - price: Ascending
Query Scope: Collection
```

##### 4. type + price (내림차순) 인덱스
```
Collection: sports/{sport}/marketPosts
Fields:
  - type: Ascending
  - price: Descending
Query Scope: Collection
```

---

## ⚠️ 중요: sport 값 정규화

**문제**: Firestore는 문자열 완전 일치만 허용합니다.

**해결**: 모든 sport 값은 소문자로 정규화해야 합니다.

### 저장 시
```typescript
sport: data.sport.toLowerCase()
```

### 조회 시
```typescript
const sportParam = (searchParams.get("sport") || "soccer").toLowerCase();
```

### 쿼리 시
```typescript
where("type", "==", marketType.toLowerCase())
```

👉 이렇게 하면 대소문자 불일치 문제가 해결됩니다.

---

## 📌 인덱스 생성 확인

1. Firebase Console → Firestore → Indexes
2. 생성된 인덱스 목록 확인
3. 상태가 "Enabled"인지 확인

---

## ⚠️ 중요 사항

### 인덱스 생성 순서

1. **에러 링크로 첫 번째 인덱스 생성**
2. **페이지 새로고침**
3. **다음 에러가 나타나면 해당 링크로 인덱스 생성**
4. **반복**

### 인덱스 생성 시간

- 소규모 데이터: 1~3분
- 대규모 데이터: 10~30분
- 인덱스 생성 중에는 쿼리가 실패할 수 있음

### 컬렉션 경로 확인

현재 코드에서 사용하는 컬렉션 경로:
- `sports/{sport}/marketPosts` (모든 쿼리)

예시:
- `sports/soccer/marketPosts`
- `sports/basketball/marketPosts`

**중요**: 각 종목별로 별도의 인덱스가 필요합니다.

---

## 🎯 완료 기준

- Market 페이지 에러 사라짐
- 탭별 리스트 정상 표시 (중고거래/나눔/유실물)
- Firestore 쿼리 정상 동작
- 정렬 기능 정상 동작

---

## 🚀 추가 팁

Firestore 프로젝트는 앞으로 복합 쿼리를 많이 사용합니다:

- ActivityLogs
- MarketPosts
- Chats
- Notifications

👉 인덱스는 앞으로 계속 생성됨
👉 정상적인 현상임
👉 버그 아님

---

## 📝 참고

- [Firestore 인덱스 공식 문서](https://firebase.google.com/docs/firestore/query-data/indexing)
- [복합 인덱스 가이드](https://firebase.google.com/docs/firestore/query-data/index-overview#composite_indexes)
