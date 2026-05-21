# 🔥 activityLogs → activities 전체 마이그레이션 실행 가이드

## ✅ 사전 확인

- [x] ActivityFeed가 activities 컬렉션을 정상적으로 읽는지 확인 완료
- [x] activities 인덱스 생성 완료
- [x] activityLogs 생성 코드 주석 처리 완료

## 🚀 마이그레이션 실행 방법

### 방법 1: Cloud Function 호출 (권장)

#### 1단계: Firebase Console에서 실행

1. **Firebase Console** → **Functions** → **migrateActivityLogsToActivities** 선택
2. **테스트** 탭 클릭
3. **요청 본문** 입력:

```json
{
  "batchSize": 500,
  "dryRun": false
}
```

4. **테스트 실행** 클릭

#### 2단계: 결과 확인

성공 응답 예시:
```json
{
  "success": true,
  "message": "마이그레이션 완료: 150개 생성, 5개 스킵",
  "migrated": 150,
  "skipped": 5,
  "dryRun": false
}
```

### 방법 2: Node.js 스크립트 실행

```bash
# functions 디렉토리로 이동
cd functions

# 스크립트 실행
npm run migrate:activityLogs
```

## 📋 마이그레이션 필드 매핑

### 필드 유지 (그대로 복사)
- `authorId` → `authorId`
- `createdAt` → `createdAt`
- `sport` → `sport`
- `type` → `type` (매핑 규칙 적용)
- `title` → `title`
- `summary` → `summary`
- `thumbnail` → `thumbnailUrl`
- `sourceId` → `refId`
- `sourceType` → `refType` (매핑 규칙 적용)
- `category` → `category`

### 추가 필드
- `visibility: "public"` (기본값)
- `likeCount: 0`
- `commentCount: 0`

### type 매핑 규칙
- `"market"` → `"market_created"`
- `"team"` → `"team_created"`
- `"event"` → `"team_event"`
- `"recruit"` → `"recruit_created"`
- `"match"` → `"match_created"`
- `"equipment"` → `"equipment_created"`

### refType 매핑 규칙
- `sourceType == "marketPosts"` 또는 `type == "market"` → `"market"`
- `sourceType == "teams"` 또는 `type == "team"` → `"teams"`
- `sourceType == "events"` 또는 `type == "event"` → `"events"`
- `type == "recruit"` → `"recruit"`
- `type == "match"` → `"market"`
- `type == "equipment"` → `"market"`

## ✅ 마이그레이션 완료 후 확인

### 1. Firestore 확인
- `activities` 컬렉션에 문서가 생성되었는지 확인
- 문서 ID가 activityLogs와 동일한지 확인 (중복 방지)

### 2. ActivityFeed 확인
- 브라우저 새로고침
- 피드에 마이그레이션된 데이터가 표시되는지 확인
- 콘솔 로그 확인:
  ```
  [ActivityFeed] query results: { queryConditions: ..., resultCount: ... }
  ```

### 3. 필터 테스트
- "전체" 탭에서 모든 데이터 표시 확인
- 각 type별 탭에서 필터링 정상 작동 확인

## 🔒 activityLogs 사용 중지 확인

다음 파일에서 activityLogs 생성 코드가 주석 처리되었는지 확인:

- [x] `src/features/market/components/forms/MatchForm.tsx`
- [x] `src/features/market/components/forms/RecruitForm.tsx`
- [x] `src/features/market/components/forms/EquipmentForm.tsx`
- [x] `src/pages/MarketAddPage.tsx`
- [x] `src/services/activityLogService.ts`

## 🎯 다음 단계

### 단계 1: 마이그레이션 실행
- Cloud Function 또는 스크립트 실행
- 결과 확인

### 단계 2: 테스트
- activityLogs 몇 개 삭제 테스트
- 피드 정상 유지 확인

### 단계 3: 완전 폐기 (v1.1)
- activityLogs 컬렉션 완전 삭제
- 관련 코드 완전 제거

## ⚠️ 주의사항

1. **dryRun 먼저 실행**: 실제 마이그레이션 전에 `dryRun: true`로 테스트
2. **배치 크기 조정**: 데이터가 많으면 `batchSize`를 조정하여 여러 번 실행
3. **중복 방지**: 동일 ID 사용으로 중복 생성 방지
4. **백업**: 마이그레이션 전 Firestore 백업 권장

## 📊 예상 결과

- **마이그레이션된 문서 수**: activityLogs 문서 수와 동일 (중복 제외)
- **스킵된 문서 수**: 이미 activities에 존재하는 문서 수
- **실행 시간**: 문서 수에 비례 (100개당 약 1-2초)
