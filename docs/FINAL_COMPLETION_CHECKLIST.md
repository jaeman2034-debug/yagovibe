# 🔥 최종 완성 선언 체크리스트

## 📋 개요

대회 생성 → 시스템 공지 자동 생성 및 노출 완성 체크리스트입니다.

---

## ✅ 1단계: 시스템 공지 생성 (Cloud Functions)

### 트리거 함수

- [x] `onTournamentCreated`: 대회 생성 시 시스템 공지 생성
- [x] `onTournamentUpdated`: draft → published 변경 시 시스템 공지 생성
- [x] `checkTournamentEvents`: 날짜 기반 스케줄러 (매일 자정)

### 헬퍼 함수

- [x] `systemNoticeHelper.ts`: 공통 시스템 공지 생성 로직
- [x] `systemNoticeTriggers.ts`: 8가지 이벤트 트리거 함수

### 이벤트 커버리지

- [x] `TOURNAMENT_CREATED`: 대회 생성
- [x] `APPLY_STARTED`: 참가 신청 시작
- [x] `APPLY_CLOSED`: 참가 신청 마감
- [x] `ROSTER_CLOSED`: 선수 명단 수정 마감
- [x] `REVIEW_COMPLETED`: 사무국 검수 완료
- [x] `DRAW_COMPLETED`: 조 추첨 완료
- [x] `TOURNAMENT_STARTED`: 대회 시작
- [x] `TOURNAMENT_ENDED`: 대회 종료

### 중복 생성 방지

- [x] `systemNotices.{event}` 플래그 체크
- [x] 대회 문서에 시스템 공지 ID 저장

---

## ✅ 2단계: 시스템 공지 노출 (UI)

### NoticeCard 컴포넌트

- [x] `⚙️ 시스템` 뱃지 표시
- [x] `🟦 운영` 뱃지 표시 (일반 공지)
- [x] 시스템 공지는 수정/삭제 버튼 숨김
- [x] `🏆 대회 바로가기` CTA 버튼 (관련 대회가 있을 경우)
- [x] 시스템 공지 툴팁 ("시스템 자동 생성 기록입니다. 수정/삭제할 수 없습니다.")

### NoticeSection 컴포넌트

- [x] 시스템 공지 포함하여 표시
- [x] `type: "SYSTEM"` 필터링 지원
- [x] 최신순 정렬 (생성일 기준)

---

## ✅ 3단계: 대회 일정 영역 연동

### TournamentSection 컴포넌트

- [x] 생성된 대회 카드 노출
- [x] 대회 카드에 `id={`tournament-${tournament.id}`}` 추가 (스크롤 타겟)
- [x] 상태 뱃지 표시 (참가 신청 예정 / 진행 중 / 종료)
- [x] 운영 체크리스트 표시

### 공지 ↔ 대회 연결

- [x] 시스템 공지에서 `🏆 대회 바로가기` 클릭 시 스크롤 이동
- [x] 같은 페이지에 대회가 없으면 대회 상세 페이지로 이동

---

## ✅ 4단계: 데이터 스키마

### Notice 타입 확장

- [x] `isSystemGenerated?: boolean`
- [x] `systemEventType?: string`
- [x] `relatedTournamentId?: string`
- [x] `type?: "SYSTEM" | "OPERATIONAL"`
- [x] `event?: string`
- [x] `immutable?: boolean`
- [x] `linkedResource?: object`

### Tournament 타입 확장

- [x] `systemNotices?: { [event: string]: { noticeId: string; createdAt: Timestamp } }`
- [x] `systemNoticeCreated?: boolean` (하위 호환성)
- [x] `systemNoticeId?: string` (하위 호환성)

---

## ✅ 5단계: 배포 및 테스트

### Cloud Functions 배포

```bash
firebase deploy --only functions:onTournamentCreated,functions:onTournamentUpdated,functions:checkTournamentEvents
```

### 테스트 체크리스트

- [ ] 대회 생성 시 `adminStatus: "published"` → 시스템 공지 생성
- [ ] 대회 생성 시 `adminStatus: "draft"` → 시스템 공지 미생성
- [ ] `draft` → `published` 변경 → 시스템 공지 생성
- [ ] `isOfficial: false` → 시스템 공지 미생성
- [ ] 중복 생성 방지 확인
- [ ] NoticeSection에 시스템 공지 표시
- [ ] `⚙️ 시스템` 뱃지 표시
- [ ] 수정/삭제 버튼 숨김 처리
- [ ] `🏆 대회 바로가기` 버튼 동작 확인
- [ ] TournamentSection에 대회 카드 표시
- [ ] 공지 ↔ 대회 연결 확인

---

## ✅ 6단계: 완성 선언 기준

### 필수 완료 항목

- [x] 시스템 공지 자동 생성 (8가지 이벤트)
- [x] 시스템 공지 UI 노출
- [x] 시스템 공지 수정 불가 처리
- [x] 대회 카드 노출
- [x] 공지 ↔ 대회 연결

### 선택 완료 항목

- [ ] 구청 제출용 PDF 리포트 자동 생성
- [ ] 대회 히스토리 탭 시각화

---

## 🎯 완성 선언

**완성 날짜**: 2026-01-XX

**완성 기준**: ✅ 모든 필수 완료 항목 체크

**다음 단계**: 구청 제출용 PDF 리포트 또는 대회 히스토리 탭 시각화

---

**이 체크리스트를 기준으로 완성 선언을 진행합니다.**

