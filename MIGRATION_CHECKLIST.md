# 🚀 마이그레이션 체크리스트

## 📋 개요

스토리존, 일정 탭, 협회 배지 등 신규 기능 배포 전 체크리스트입니다.

---

## 1️⃣ 스토리존 (StoryZone)

### 데이터 모델
- [ ] Firestore `stories` 컬렉션 생성
- [ ] 인덱스 생성:
  - `sport` + `status` + `expiresAt` (복합)
  - `source` + `createdAt` (ops용)
  - `source` + `stats.likes` (user 인기용)
- [ ] 샘플 데이터 생성 (ops 스토리 2개, user 스토리 3개)

### 컴포넌트
- [x] `StoryZone.tsx` - 메인 컴포넌트
- [x] `StorySlider.tsx` - 슬라이더
- [x] `StoryItem.tsx` - 미디어 표시
- [x] `StoryIndicator.tsx` - 인디케이터
- [ ] 통합 테스트 (SportHub 페이지)

### 보안 규칙
- [ ] Firestore Security Rules 추가
- [ ] 사용자 업로드 → pending 상태 검증
- [ ] 운영자만 ops 스토리 생성 가능

---

## 2️⃣ 일정 탭 (Schedule)

### 데이터 모델
- [ ] Firestore `schedules` 컬렉션 확인
- [ ] 인덱스 생성:
  - `teamId` + `dateTime` (복합)
- [ ] 기존 일정 데이터 마이그레이션 (필요 시)

### 컴포넌트
- [x] `ScheduleList.tsx` - 목록 + 필터
- [x] `ScheduleCreateForm.tsx` - 생성 폼 (구장 찾기 포함)
- [x] `ScheduleDetail.tsx` - 상세 (기존)
- [ ] 참석 응답 UI (일정 상세 페이지)

### 알림
- [x] 일정 생성 시 알림 트리거
- [ ] Cloud Functions 스케줄러 (D-1, D-0 리마인드)
- [ ] 알림 타입 추가 확인:
  - `TEAM_SCHEDULE_CREATED`
  - `TEAM_SCHEDULE_UPDATED`
  - `TEAM_SCHEDULE_REMINDER`

### 보안 규칙
- [ ] Firestore Security Rules 업데이트
- [ ] 운영자만 생성/수정/삭제 가능
- [ ] 멤버는 조회만 가능

---

## 3️⃣ 협회 배지 (Association Badge)

### 데이터 모델
- [ ] 팀 데이터에 `associationRelation` 필드 확인
- [ ] 기존 `associationId` → `associationRelation` 마이그레이션 스크립트
- [ ] 샘플 데이터:
  - official 팀 3개
  - related 팀 2개
  - independent 팀 5개

### 컴포넌트
- [x] `TeamCard.tsx` - 배지 추가
- [ ] `PublicTeam` 타입 확장
- [ ] 팀 상세 페이지 배지 표시

### UI/UX
- [ ] 배지 클릭 → 협회 페이지 이동 테스트
- [ ] 모바일 반응형 확인
- [ ] 배지 색상/크기 최종 확인

---

## 4️⃣ 협회→팀찾기 이관

### UI 개선
- [x] `PersonaP1TeamSearch.tsx` - 협회 카드 통합
- [ ] 협회 카드 클릭 → 협회 페이지 이동 테스트
- [ ] 팀 찾기 페이지에서 협회 카드 표시 여부 확인

### 데이터 연동
- [ ] 협회 소속 팀 목록 조회 API 확인
- [ ] 팀 검색 시 협회 필터 옵션 (Phase 4 이후)

---

## 5️⃣ 구장 찾기 연동

### 기능
- [x] 일정 생성 폼에 구장 찾기 버튼 추가
- [x] Google Places API 연동
- [ ] 구장 검색 모달 UX 최종 확인
- [ ] 좌표 저장 검증

### 에러 처리
- [ ] Google Maps API 로드 실패 시 fallback
- [ ] 검색 결과 없음 처리
- [ ] 네트워크 오류 처리

---

## 6️⃣ 알림 시스템

### 타입 추가
- [x] `TEAM_SCHEDULE_CREATED`
- [x] `TEAM_SCHEDULE_UPDATED`
- [x] `TEAM_SCHEDULE_REMINDER`

### Cloud Functions
- [ ] `functions/src/schedules/dailyReminders.ts` 생성
- [ ] Pub/Sub 스케줄러 설정:
  - 매일 20:00 (D-1 체크)
  - 매시간 (D-0 체크)
- [ ] 알림 발송 로직 테스트

---

## 7️⃣ 권한 분기

### 체크 함수
- [x] `canCreateSchedule` - 일정 생성
- [x] `canEditSchedule` - 일정 수정
- [x] `canDeleteSchedule` - 일정 삭제

### UI 분기
- [x] 일정 생성 버튼 (운영자만)
- [ ] 일정 수정/삭제 버튼 (일정 상세 페이지)

---

## 8️⃣ 성능 최적화

### 캐싱
- [x] 스토리존 캐싱 (5분)
- [ ] 일정 목록 캐싱 (선택적)

### 쿼리 최적화
- [ ] Firestore 인덱스 생성 확인
- [ ] 불필요한 쿼리 제거
- [ ] 페이지네이션 적용 (일정 목록)

---

## 9️⃣ 테스트

### 단위 테스트
- [ ] StoryZone 컴포넌트
- [ ] ScheduleList 필터링
- [ ] 권한 체크 함수

### 통합 테스트
- [ ] 스토리존 → CTA 클릭 → 라우팅
- [ ] 일정 생성 → 알림 발송
- [ ] 구장 찾기 → 일정 저장

### E2E 테스트
- [ ] 운영자 일정 생성 플로우
- [ ] 멤버 일정 조회 플로우
- [ ] 협회 배지 표시 확인

---

## 🔟 배포 전 체크

### 문서
- [x] `SCHEDULE_TAB_API_SPEC.md` - API 스펙
- [x] `FOOTBALL_HUB_TEAM_BADGE_RULES.md` - 배지 규칙
- [x] `MIGRATION_CHECKLIST.md` - 마이그레이션 체크리스트

### 코드 리뷰
- [ ] 린트 오류 없음
- [ ] 타입 오류 없음
- [ ] 콘솔 에러 없음

### 데이터 백업
- [ ] 기존 일정 데이터 백업
- [ ] 팀 데이터 백업

---

## 📌 배포 후 모니터링

### 메트릭
- [ ] 스토리존 조회 수
- [ ] 일정 생성 수
- [ ] 알림 발송 성공률
- [ ] 구장 찾기 사용률

### 에러 로그
- [ ] Firestore 쿼리 오류
- [ ] 알림 발송 실패
- [ ] Google Places API 오류

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 진행 중
