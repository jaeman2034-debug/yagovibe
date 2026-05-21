# 🛠 YAGO 스포츠 허브 v2 - 개발 변경 체크리스트

## 📋 라우트 변경

### 제거
- [ ] `/schedule` 라우트 폐기
- [ ] 일정 독립 그리드 제거

### 추가
- [ ] `/sports/{type}/team` - 내 팀 (기본: 일정 탭)
- [ ] `/sports/{type}/team/schedule` - 일정 목록
- [ ] `/sports/{type}/team/schedule/new` - 일정 생성 (운영자만)
- [ ] `/sports/{type}/team/schedule/{id}` - 일정 상세
- [ ] `/teams/search?type={type}` - 팀 찾기 (협회 카드 포함)

---

## 🎨 UI 컴포넌트 변경

### SportHub.tsx
- [x] 일정 그리드 제거
- [x] 6그리드 → 4그리드 재구성
- [x] 거래 장터 1번 배치
- [x] 스토리 존 컴포넌트 추가
- [x] UI 텍스트 리네이밍
- [ ] 마켓 채팅 배지 추가

### TeamPage.tsx
- [ ] 일정 탭 기본 화면으로 설정
- [ ] 일정 목록 컴포넌트
- [ ] 일정 생성 컴포넌트 (권한 분기)
- [ ] 일정 상세 컴포넌트
- [ ] 일정 유형: 경기/훈련/친선 (3개)

### TeamPersonaSection.tsx
- [ ] 일정 관리 섹션 추가
- [ ] 권한 체크 로직 추가
- [ ] 운영자/멤버 UI 분기

### PersonaP1TeamSearch.tsx
- [x] 협회 카드 통합 (축구만)

---

## 🔐 권한 로직

### 일정 권한
- [ ] 일정 생성 = 운영자 only
- [ ] 일정 수정/삭제 = 운영자 only
- [ ] 일정 조회 = 멤버 전체
- [ ] 참석 응답 = 멤버 전체

### 권한 체크 함수
```typescript
// 일정 생성 버튼 표시 조건
const canCreateSchedule = user.role === 'TEAM_OWNER' || user.role === 'TEAM_ADMIN';

// 일정 수정/삭제 버튼 표시 조건
const canEditSchedule = schedule.creatorId === user.uid || canCreateSchedule;
```

---

## 📊 데이터 모델

### Schedule 타입 정의
```typescript
type ScheduleType = '경기' | '훈련' | '친선';

interface Schedule {
  id: string;
  teamId: string;
  creatorId: string; // 운영자만 가능
  type: ScheduleType;
  title: string;
  dateTime: Timestamp;
  place: string;
  opponent?: string; // 경기만
  isPublic: boolean;
  needsSubstitute: boolean; // 용병 모집
  attendees: {
    userId: string;
    status: '참석' | '불참' | '미정';
  }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Firestore 구조
```
teams/{teamId}/schedules/{scheduleId}
```

---

## 🔔 알림 연동

### 일정 생성 시
- [ ] 팀 멤버 전체 알림
- [ ] 채팅방 자동 생성
- [ ] 알림 타입: `SCHEDULE_CREATED`

### 일정 변경 시
- [ ] 변경 알림
- [ ] 푸시 우선순위: high
- [ ] 알림 타입: `SCHEDULE_UPDATED`

---

## 🎯 우선순위

### Phase 1 (필수)
1. 일정 그리드 제거
2. 4그리드 재구성
3. 스토리 존 추가
4. UI 텍스트 리네이밍

### Phase 2 (핵심)
1. 내 팀 → 일정 탭 기본
2. 일정 목록 화면
3. 일정 생성 (운영자만)
4. 권한 분기 로직

### Phase 3 (고도화)
1. 일정 상세 화면
2. 참석 응답 기능
3. 알림 연동
4. 마켓 채팅 배지

---

## ✅ 완료 체크

- [x] 와이어프레임 설계
- [x] 일정 권한 모델 확정
- [x] 카드 문구 최종안
- [x] 아이콘 톤앤매너
- [x] 개발 변경 목록 작성
- [ ] 컴포넌트 트리 설계
- [ ] 라우트 설계도
- [ ] 코드 패치 실행
