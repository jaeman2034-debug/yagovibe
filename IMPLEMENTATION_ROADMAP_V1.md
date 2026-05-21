# 구현 로드맵 v1.0
**실전 UI/UX + 기능 구현 (개발 백로그)**

---

## 0️⃣ 구현 원칙 3개

1. **공식 기준은 화면이 아니라 "상태"로 고정**
2. **입력은 Admin만 / Public은 읽기 전용**
3. **전화·단톡·엑셀을 없애는 화면부터 만든다 (문의 유발 UI 금지)**

---

## 1️⃣ 1차 MVP 범위 (2주짜리 최소 완성)

**"회원이 들어와서 공지/대회/대관을 보고 끝" + "관리자가 입력하면 즉시 반영"**

### Public (회원/비회원)

- 홈(/association/:id)
- 공지 리스트 + 상세
- 대회/일정 카드 + 상세(참가/결제/대진표는 2차)
- 대관 상태(읽기 전용)
- Story(데모 텍스트)
- Club Summary(공식 요약만)

### Admin

- /association/:id/admin/notices
  - 작성/수정/예약/게시
- /association/:id/admin/tournaments
  - 대회 생성/수정(기본 필드만)
- /association/:id/admin/facility
  - 슬롯/토글(available/blocked/event)

---

## 2️⃣ 2차 구현 범위 (대회 엔진 완성)

**"대회 참가 신청 + 참가비 + 회비 연동 + 선수명단 + 대진표 고정 + 징계 로그"까지**

### Tournament 상세(회원)

- 참가 신청 버튼(회비 납부 여부로 활성/비활성)
- 참가비 결제 상태(미결제/완료)
- 선수명단 제출(조인KFA 체크 필수)
- 대진표(확정 상태만 공식)
- 공식 기준 배지("시스템 기준")

### Tournament 관리(Admin)

- 신청 승인/마감
- 참가비 입금 확인(또는 결제 연동)
- 선수명단 검증 플래그 확인
- 대진표 업로드/확정 버튼
- 징계 처리(몰수패/출전정지 등) + 시스템 로그 자동 남김

---

## 3️⃣ 화면 단위 UI/UX 설계 (실제 구현 체크리스트)

### A. 홈(협회 Public 페이지)

#### 구성(상단→하단)

- Hero(이미 OK)
- 공지 섹션
- Tournament 섹션
- 대관 섹션
- Story(데모)
- Club Summary

#### 핵심 UX 규칙

- 섹션 우측 상단에 항상 "공식 기준" 배지/문구
- "문의하기" 버튼 같은 전화 유발 요소 금지
- 빈 상태(empty state) 문구를 "관리자가 아직 등록 전"처럼 명확히

---

### B. 공지 (Public/Admin)

#### Public

- 리스트: 제목/게시일/상단고정/라벨(필독/변경/대회)
- 상세: 본문 + 첨부 + 관련 링크(대회/대관)

#### Admin

- 상태: draft | scheduled | published | archived
- 예약: 날짜/시간(서버 기준)
- 게시 시 Public 즉시 반영

---

### C. Tournament (Public/Member/Admin)

#### 공통 데이터 필드(최소)

- title, dateRange, venue, status(upcoming/ongoing/ended)
- registrationOpen(boolean)
- feeAmount
- poster/attachments

#### Member 흐름(2차)

- 참가 상태: none | applied | pending | confirmed
- 결제 상태: unpaid | paid
- 참가 가능 조건:
  - 회원 + 회비 납부 + (결제 완료 시 confirmed)

#### 대진표 상태(필수)

- preparing | confirmed
- confirmed가 아니면 Public/Member에게 "준비중"만 노출

---

### D. 대관(Facility)

#### Admin

- 날짜/시간 슬롯
- 상태 토글: available | blocked | event
- 충돌 방지: 같은 시간 중복 입력 막기

#### Public

- 읽기 전용 캘린더/리스트
- "기준 화면 고정" 문구 삽입

---

### E. Story(데모)

- 운영 기록형 텍스트만
- "공식 자료 기반" 문구
- 추후 PDF/책자 링크는 3차

---

### F. Club Summary / Club Detail / Promotion(유료)

#### Club Summary(무료)

- 클럽명 / 유형(일반·유소년) / 협회 등록 상태 / 최근 공식 대회 참여 여부

#### Club Detail(무료)

- 공식 요약(기록 기반)
- 홍보 요소(연락처/모집/갤러리) 없음

#### Promotion(유료)

- 소개글/미디어/모집/연락처/외부 링크
- "홍보 페이지" 면책 문구 필수

---

## 4️⃣ 권한 모델(실구현용)

- **비회원**: 공지(공개), 대회(요약), 대관(읽기)
- **회원**: 공지(전체), 대회 상세(참가/결제/명단), 본인 회비 상태
- **협회 관계자(Admin)**: CRUD + 확정/승인 권한

**화면 자체를 권한별로 다르게 렌더링 (숨김이 아니라 분기)**

---

## 5️⃣ 개발 순서(가장 효율적인 빌드 오더)

1. 공지 Admin + Public (가장 빨리 성과)
2. Tournament 기본(입력→노출)
3. 대관 토글(분쟁 차단)
4. Tournament 엔진(참가/결제/명단/대진표 확정)
5. 징계 로그/이의제기 기간 처리
6. Story/Club Summary 마감 + Promotion 유료 분기

---

## 6️⃣ 지금 당장 내가 필요한 "구현 시작 정보" (질문 없이 바로 가정)

### 기본 가정

- **프론트**: Next.js/React
- **인증**: 회원가입/로그인(협회 가입 승인 플로우 포함)
- **DB**: association / notice / tournament / facility_slot / club / story_card / audit_log

---

## 📋 다음 액션 (당장 1개만 고르기)

아래 중 하나만 말해주세요. 그러면 그걸 기준으로 컴포넌트 구조 + 라우팅 + 상태 스키마까지 더 구체화해서 바로 "개발 티켓"으로 쪼개 드립니다.

### 선택지

1. **공지부터 구현 시작(가장 빠른 성과)**
2. **Tournament부터 구현(핵심 엔진 직행)**
3. **대관부터 닫기(분쟁 차단 우선)**

"1로 가자"처럼 한 줄이면 됩니다.

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 구현 로드맵 초안 (다음 액션 선택 대기)

