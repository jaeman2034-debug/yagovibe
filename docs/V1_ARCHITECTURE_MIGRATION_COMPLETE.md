# ✅ YAGO VIBE v1 아키텍처 정렬 작업 완료 보고

## 📋 완료된 작업

### 1. ActivityFeed 전환 ✅
- `activityLogs` → `activities` 컬렉션 전환 완료
- `authorId` 필터 완전 제거 (전체 커뮤니티 피드)
- `visibility: "public"` 필터 추가
- 탭별 필터 적용:
  - 거래 탭: `type == "market_created"`
  - 팀 탭: `type in ["team_created", "team_notice", "team_event"]`
  - 이벤트 탭: `type == "team_event"`

### 2. activities 스키마 확정 ✅
- `src/types/activity.ts` 생성
- v1 스키마 타입 정의 완료
- 필수 필드: `type`, `refType`, `refId`, `authorId`, `title`, `visibility`, `likeCount`, `commentCount`, `createdAt`

### 3. 새 글 작성 activities 생성 통일 ✅
- `MatchForm.tsx`: `match_created` 타입으로 activities 생성
- `RecruitForm.tsx`: `recruit_created` 타입으로 activities 생성
- `EquipmentForm.tsx`: `equipment_created` 타입으로 activities 생성
- `activityLogs` 생성 코드 주석 처리 (과도기 Dual-write 제거)

### 4. ownerUid 통일 ✅
- `createTeamSimple.ts`: `leaderId` → `ownerUid`로 변경
- `PersonaP1TeamSearch.tsx`: 호출부 수정
- 팀 생성 시 `activities`에 `team_created` 자동 생성 추가

### 5. Backfill 스크립트 준비 ✅
- `functions/src/migrate/activityLogsToActivities.ts` 생성
- HTTP callable function으로 실행 가능
- 동일 id 사용 (중복 방지)
- Dry run 모드 지원

## 🔍 확인 사항

### 완료 기준 체크리스트

- [x] ActivityFeed에서 `activityLogs` 조회 코드 완전 제거
- [x] ActivityFeed에서 `authorId` 필터 제거
- [x] `visibility: "public"` 필터 추가
- [x] 새 글 작성 시 `activities`에만 적재
- [x] 탭별 필터 적용 (거래/팀/이벤트)
- [x] `ownerUid` 통일 (`leaderId` 제거)
- [x] Backfill 스크립트 준비

### 테스트 필요 항목

1. **전체 피드 테스트**
   - 서로 다른 계정으로 접속
   - 동일한 public 피드가 표시되는지 확인

2. **새 글 작성 테스트**
   - 매칭/모집/장비 글 작성
   - `activities` 컬렉션에 문서 생성 확인

3. **탭 필터 테스트**
   - 거래 탭: market_created만 표시
   - 팀 탭: team_created, team_notice, team_event 표시
   - 이벤트 탭: team_event만 표시

## 📝 다음 단계

### 즉시 실행 가능
1. Firestore 인덱스 생성 (필요시)
2. 서로 다른 계정으로 테스트
3. Backfill 스크립트 실행 (dry run 먼저)

### 이후 단계
1. Cloud Functions 자동 생성 추가
2. activityLogs 완전 제거 (1주일 관찰 후)
3. 다른 화면의 activityLogs 사용 정리

## 🚨 주의사항

- 다른 파일들(`SportActivityFeed`, `HomeRecentActivity` 등)은 아직 `activityLogs` 사용 중
- 이들은 별도로 정리 예정 (지시문 범위 외)
- ActivityFeed는 완전히 `activities`로 전환 완료
