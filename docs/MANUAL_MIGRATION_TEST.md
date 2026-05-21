# 🔧 activityLogs → activities 수동 마이그레이션 테스트 가이드

## 🎯 목적

빠른 검증을 위해 activityLogs의 1~2개 문서를 activities로 수동 복사하여 테스트

## 📋 수동 복사 방법

### Firebase Console에서

1. **activityLogs 컬렉션 열기**
   - Firebase Console → Firestore Database
   - `activityLogs` 컬렉션 선택

2. **문서 선택**
   - 최근 생성된 문서 1~2개 선택
   - 문서 ID와 데이터 확인

3. **activities 컬렉션에 새 문서 생성**
   - `activities` 컬렉션 선택
   - "문서 추가" 클릭
   - 문서 ID: 새로 생성하거나 동일하게 사용 가능

4. **필드 매핑 및 추가**

```json
{
  // 기존 필드 (그대로 복사)
  "authorId": "원본 authorId 값",
  "createdAt": "원본 createdAt 값",
  "sport": "원본 sport 값",
  "title": "원본 title 값",
  "summary": "원본 summary 값",
  
  // 필드명 변경
  "thumbnailUrl": "원본 thumbnail 값",
  "refId": "원본 sourceId 또는 refId 값",
  "refType": "원본 sourceType 값",
  
  // type 매핑
  "type": "market_created" 또는 "team_created" 등 (원본 type 기반),
  
  // 추가 필수 필드
  "visibility": "public",
  "likeCount": 0,
  "commentCount": 0
}
```

### type 매핑 규칙

- `activityLogs.type == "market"` → `activities.type = "market_created"`
- `activityLogs.type == "team"` → `activities.type = "team_created"`
- `activityLogs.type == "event"` → `activities.type = "team_event"`

### refType 매핑 규칙

- `sourceType == "marketPosts"` → `refType = "market"`
- `sourceType == "teams"` → `refType = "teams"`
- `sourceType == "events"` → `refType = "events"`

## ✅ 테스트 확인

1. 브라우저 새로고침
2. ActivityFeed에서 복사한 문서가 표시되는지 확인
3. 콘솔 로그 확인:
   ```
   🔥 [ActivityFeed] query results: { resultCount: ... }
   ```

## 🚀 다음 단계

수동 복사가 성공하면 → 마이그레이션 스크립트 실행
