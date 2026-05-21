# 🔥 빠른 수동 마이그레이션 테스트 가이드

## 🎯 목적

**1~2개 문서만 수동 복사**하여 ActivityFeed가 activities를 제대로 읽는지 빠르게 검증

## 📋 Firebase Console에서 수동 복사 (2분)

### 1단계: activityLogs에서 문서 선택

1. Firebase Console → Firestore Database
2. `activityLogs` 컬렉션 열기
3. 최근 생성된 문서 1~2개 선택
4. 문서 데이터 확인 (아래 필드 확인):
   - `authorId` 또는 `userId`
   - `createdAt`
   - `sport`
   - `type` (예: "market", "team", "event")
   - `title`
   - `summary` (있으면)
   - `thumbnail` 또는 `thumbnailUrl` (있으면)
   - `sourceId` 또는 `refId` (있으면)
   - `sourceType` (있으면)

### 2단계: activities에 새 문서 생성

1. `activities` 컬렉션 선택
2. "문서 추가" 클릭
3. 문서 ID: **자동 생성** (새 ID 사용)

### 3단계: 필드 입력 (정확히 아래 형식)

```json
{
  // 🔥 필수 필드 (v1 스키마)
  "type": "market_created",  // 아래 매핑 규칙 참고
  "refType": "market",        // 아래 매핑 규칙 참고
  "refId": "원본 sourceId 또는 refId 값",
  "authorId": "원본 authorId 또는 userId 값",
  "title": "원본 title 값",
  "visibility": "public",
  "likeCount": 0,
  "commentCount": 0,
  "createdAt": "원본 createdAt 값 (Timestamp 유지)",
  
  // 🔥 선택 필드
  "summary": "원본 summary 값 (있으면)",
  "thumbnailUrl": "원본 thumbnail 또는 thumbnailUrl 값 (있으면)",
  "teamId": "원본 teamId 값 (있으면)",
  "sport": "원본 sport 값 (있으면)",
  "category": "원본 category 값 (있으면)"
}
```

### 4단계: type 매핑 규칙

**activityLogs.type → activities.type**

- `"market"` → `"market_created"`
- `"team"` → `"team_created"`
- `"event"` → `"team_event"`
- `"recruit"` → `"recruit_created"`
- `"match"` → `"match_created"`
- `"equipment"` → `"equipment_created"`

### 5단계: refType 매핑 규칙

**activityLogs.sourceType 또는 type → activities.refType**

- `sourceType == "marketPosts"` 또는 `type == "market"` → `"market"`
- `sourceType == "teams"` 또는 `type == "team"` → `"teams"`
- `sourceType == "events"` 또는 `type == "event"` → `"events"`
- `type == "recruit"` → `"recruit"`
- `type == "match"` → `"market"` (match는 market의 하위)
- `type == "equipment"` → `"market"` (equipment는 market의 하위)

## ✅ 테스트 확인

1. **브라우저 새로고침** (F5)
2. **ActivityFeed 확인**:
   - 복사한 문서가 피드에 표시되는지 확인
   - 콘솔 로그 확인: `🔥 [ActivityFeed] query results: { resultCount: ... }`
3. **필터 테스트**:
   - "전체" 탭에서 표시되는지
   - 해당 type 탭에서 표시되는지 (예: "거래" 탭)

## 🚀 성공하면

→ 마이그레이션 스크립트 실행 준비 완료

## ❌ 실패하면

→ ActivityFeed.tsx 쿼리 로직 재확인
