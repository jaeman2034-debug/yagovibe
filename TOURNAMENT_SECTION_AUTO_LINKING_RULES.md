# TournamentSection 자동 연동 규칙 설계 (최종)

**목적**: 협회가 한 번만 등록하면, 팀·회원 화면까지 자동으로 동일한 '공식 기준'이 퍼지게 한다

---

## 1️⃣ 핵심 원칙 (절대 고정)

### 원칙 1: 협회가 원본(Source of Truth)
- 협회가 유일한 대회 생성 주체
- 협회 데이터가 항상 최신 상태

### 원칙 2: 팀은 수정 불가, 참조만 가능
- 팀은 대회를 수정할 수 없음
- 팀은 협회 데이터를 읽기 전용으로 참조만 가능

### 원칙 3: 일정은 복사 ❌ / 연결 ⭕
- 팀 쪽에 대회 복사본이 생기지 않음
- 항상 협회 데이터만 바라봄

### 원칙 4: 협회 일정 = 행정 기준
- 협회 일정은 행정 기준
- 모든 화면에서 동일한 정보 표시

---

## 2️⃣ 데이터 흐름 구조 (개념)

```
[노원구 축구협회]
   └─ Tournament (공식)
        ├─ 대회명
        ├─ 기간
        ├─ 장소
        ├─ 참가 자격
        ├─ 상태 (예정 / 진행 / 종료)
        ↓ (자동 연결)

[협회 산하 팀]
   └─ TournamentRef (읽기 전용)
```

**⚠️ 중요**: 팀 쪽에는 "대회 복사본"이 생기지 않는다.
→ 항상 협회 데이터만 바라본다.

---

## 2️⃣ 데이터 연동 기준 (자동 규칙)

### 표시 대상 대회 조건
아래 3가지 중 1개라도 충족하면 표시:
- `organizer = 'assoc-nowon-football'`
- `associationId = 'assoc-nowon-football'`
- `isOfficial = true`

**의미**: 팀 주최 대회라도 협회 승인(Phase 5 이후) 시 자동 노출 가능

---

## 3️⃣ 노출 우선순위 규칙 (정렬)

### 정렬 순서 (자동)
1. **진행 중** (`today ∈ 기간`)
2. **예정** (시작일 기준 오름차순)
3. **종료** (최근 종료 순, 최대 1~2개만)

### 기본 노출 개수
- **최대 3개** 기본 표시
- 더보기 클릭 시 → 전체 리스트 (같은 페이지 내 스크롤)

---

## 4️⃣ Tournament → Hero Section 자동 연동

### 연동 규칙
- **Hero Section의 "현재 진행 중" 대회 자동 표시**
- 대회 상태 변경 시 Hero 자동 업데이트

### 자동 연동 로직
```
IF (tournament.status === 'ongoing')
THEN
  Hero에 대회명 표시
  priority가 가장 높은 1개만 표시
ELSE
  Hero는 기본 문구만 표시
```

### Hero 표시 형식
- **있는 경우**: "[대회명] 진행 중"
- **없는 경우**: 기본 문구만 표시

---

## 5️⃣ Tournament → FacilitySection 자동 연동

### 연동 규칙
- Tournament에 `venue + date + time`이 있으면
- FacilitySection의 해당 슬롯을 자동으로 `event` 상태로 표시

### 자동 연동 로직
```
IF (tournament.venue && tournament.date && tournament.timeRange)
THEN
  FacilitySection의 해당 슬롯.status = 'event'
  FacilitySection의 해당 슬롯.eventTitle = tournament.title
ELSE
  슬롯 상태 유지 (available/blocked)
```

### 제한 사항
- 수동 잠금 ❌ (Tournament 데이터 기반 자동)
- 중복 event ❌ (하나의 슬롯에 하나의 대회만)
- event 슬롯은 관리자도 수정 불가 (Tournament 데이터 우선)

**핵심**: "대회 일정 = 대관 상태" 자동 일치

---

## 6️⃣ UI 카드 구성 (고정)

### 각 대회 카드 구조
```
┌─────────────────────────────────────┐
│ [대회명]                            │
│                                     │
│ [기간] YYYY-MM-DD ~ YYYY-MM-DD     │
│ [장소] 시설명                        │
│                                     │
│ [상태 뱃지]                         │
│ 🟢 진행 중 / 🟡 예정 / ⚪ 종료      │
└─────────────────────────────────────┘
```

### 상태 뱃지
- **🟢 진행 중**: `status === 'ongoing'`
- **🟡 예정**: `status === 'upcoming'`
- **⚪ 종료**: `status === 'completed'`

### CTA
- ❌ 신청 버튼 없음
- ❌ 상세 보기 버튼 없음 (카드 자체가 정보)
- Phase 5 이후 상세 페이지 추가 가능

---

## 7️⃣ TournamentSection 동작 규칙

### ① 협회 공식 페이지
1. 관리자가 대회 1건 생성
2. 즉시:
   - 협회 공식 페이지에 노출
   - 해당 종목/협회 산하 팀 화면에 자동 반영

### ② 팀 / FC 화면
- 팀 페이지에서는:
  - "소속 협회 공식 대회" 영역으로 표시
  - 수정 버튼 ❌
  - 신청/참여 여부 표시만 가능 (Phase 5)

### ③ 일반 사용자(구민)
- 협회 공식 페이지:
  - 대회 정보 열람 전용
  - "공식 대회" 배지 표시

---

## 8️⃣ 권한 규칙 (명확한 테이블)

| 주체 | 생성 | 수정 | 삭제 | 열람 |
|------|------|------|------|------|
| 협회 관리자 | ⭕️ | ⭕️ | ⭕️ | ⭕️ |
| 팀 관리자 | ❌ | ❌ | ❌ | ⭕️ |
| 일반 사용자 | ❌ | ❌ | ❌ | ⭕️ |

---

## 9️⃣ 명시적 금지 (Phase 4-1)

### 금지 사항
- ❌ 팀별 대회 생성
- ❌ 일정 복사
- ❌ 팀 단독 수정
- ❌ 엑셀 업로드

**이유**: 협회가 유일한 원본이어야 함

---

## 8️⃣ 이 규칙이 만들어내는 효과

### 효과 1: Hero의 말이 구조로 증명됨
- Hero에서 "현재 진행 중" 대회 언급
- TournamentSection에서 실제 대회 표시
- 두 화면이 자동으로 일치

### 효과 2: 전화 질문 감소
- "대회 언제예요?" → TournamentSection에서 확인
- "그날 운동장 쓰나요?" → FacilitySection의 event 슬롯으로 확인
- → 0에 수렴

### 효과 3: Phase 5 확장 가능성
- 승인/자동화/회계 연결 자연스럽게 확장 가능
- 데이터 구조가 이미 확립되어 있음

---

## 9️⃣ 데이터 모델 (개념)

### Tournament Document (참고용)
```typescript
{
  id: string;
  title: string;
  associationId: 'assoc-nowon-football';
  status: 'ongoing' | 'upcoming' | 'completed';
  priority: number; // 1이 가장 중요
  startDate: Timestamp;
  endDate: Timestamp;
  venue?: string; // 시설 ID 또는 이름
  date?: string; // YYYY-MM-DD
  timeRange?: string; // HH:MM-HH:MM
  isOfficial: boolean;
}
```

### 쿼리 로직 (개념)
```
1. tournaments 컬렉션에서
2. associationId === 'assoc-nowon-football' AND
3. status IN ('ongoing', 'upcoming', 'completed')
4. 정렬: ongoing → upcoming (startDate ASC) → completed (endDate DESC, 최대 2개)
5. 기본 3개만 표시
```

---

## 🔟 UX 문구 규칙 (팀 화면)

### 팀 화면에 표시할 문구
```
이 일정은 노원구 축구협회가 공식적으로 관리합니다.
```

**목적**: 분쟁 차단용 문구 (중요)
- 팀이 수정할 수 없음을 명확히 표시
- 협회가 관리 주체임을 인지시킴

---

## 1️⃣1️⃣ 성공 기준 (완료 판정)

다음 조건이 모두 충족되면 3️⃣ 단계 완료:

1. ✅ 협회가 유일한 대회 생성 주체
2. ✅ 팀은 자동 참조만 (수정 불가)
3. ✅ 일정 중복 없음 (복사본 없음)
4. ✅ 권한 분쟁 구조 차단 (명확한 권한 구분)

---

## 🚫 절대 금지 사항

- ❌ Tournament 추가/삭제 (Phase 5 이후)
- ❌ 대진표/결과 입력 (별도 시스템)
- ❌ 신청/접수 기능 (Phase 5 이후)
- ❌ 수동 정렬/Drag & Drop (자동 정렬만)

---

## 📌 다음 단계 (Phase 5 이후)

1. **대회 신청/접수**: 팀이 대회 참가 신청
2. **대진표 관리**: 대회 대진표 생성/관리
3. **결과 입력**: 경기 결과 입력 및 순위 관리
4. **승인 시스템**: 협회 관리자 승인 워크플로우

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 자동 연동 규칙 설계 완료

