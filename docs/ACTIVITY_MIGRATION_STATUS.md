# 🔥 Activity 마이그레이션 상태 (v1 아키텍처)

## ✅ 완료된 작업

### 1. activities 스키마 확정
- `src/types/activity.ts` 생성
- v1 스키마 타입 정의 완료

### 2. ActivityFeed 전환
- `src/features/activity/ActivityFeed.tsx` 수정
- `activityLogs` → `activities` 컬렉션 전환
- `visibility: "public"` 필터 추가 (전체 커뮤니티 피드)
- `authorId` 필터 제거 (개인 필터 → 전체 피드)

### 3. 폼에서 activities 생성 업데이트
- `MatchForm.tsx`: v1 스키마에 맞게 수정 (`match_created`)
- `RecruitForm.tsx`: v1 스키마에 맞게 수정 (`recruit_created`)
- `EquipmentForm.tsx`: v1 스키마에 맞게 수정 (`equipment_created`)
- `activityLogs` 생성 코드 주석 처리 (과도기 Dual-write 제거)

## 📋 다음 단계

### 3. Backfill 스크립트 작성
- 기존 `activityLogs` 데이터를 `activities`로 마이그레이션
- Cloud Function (HTTP callable) 또는 admin script

### 4. Cloud Functions 자동 생성
- `onTeamCreated`: `team_created` activity 생성
- `onNoticeCreated`: `team_notice` activity 생성
- `onEventCreated`: `team_event` activity 생성

### 5. activityLogs 완전 제거
- 1주일 관찰 후
- ActivityFeed/기타 화면에서 activityLogs 참조 코드 삭제
- Firestore rules 정리

## 🔍 확인 사항

- [ ] Firestore 인덱스 생성 필요 여부 확인
- [ ] "전체 탭"에서 서로 다른 계정으로 접속해도 같은 public 피드가 보이는지 테스트
- [ ] 새 글 작성 시 activities에만 적재되는지 확인
