# PHASE 4-1 개발 지시서

**(회계·정산 자동화 1차 구현)**

---

## 프로젝트 맥락

- **대상 협회**: 노원구 축구협회
- **Association ID**: `assoc-nowon-football`
- **현재 Phase**: Phase 3 완료 → Phase 4-1 착수
- **목표**: 사무국의 '정산·증빙' 반복 업무 제거

---

## 🎯 Phase 4-1 목표 (개발자가 이해해야 할 핵심)

**"결제 시스템을 만드는 게 아니다. 이미 수기로 하고 있는 정산을 '기록 시스템'으로 옮긴다."**

---

## 🧩 구현 범위 (THIS SPRINT)

### 1️⃣ 대관료 수납/정산 보드 (Record-only)

#### 기능
- 협회가 선지급한 대관료 기준으로
- 팀/비회원별 수납 상태만 기록

#### 데이터 상태 (ENUM)
- `unpaid` (미수)
- `paid` (수납완료)
- `refunded` (환불완료)

#### 규칙
- ❌ 결제 기능 없음
- ❌ 자동 계산 없음
- ⭕ 상태 변경만 가능 (관리자)

#### UI 요구사항
- 목록 형태로 표시
- 팀명/비회원명, 금액, 상태 표시
- 관리자는 상태 변경 가능 (드롭다운 또는 버튼)
- 협회 선지급 총액 표시

---

### 2️⃣ 영수증 디지털화 (촬영 → 분류)

#### 기능
- 모바일/PC에서 사진 업로드
- 업로드 시 자동 분류 필드:
  - 시설 사용료
  - 심판 수당
  - 운영비

#### 필수 메타데이터
- 날짜 (YYYY-MM-DD)
- 대회명 (선택)
- 금액
- 업로드자

#### 규칙
- ❌ OCR 정확도는 중요하지 않음
- ⭕ "사진 + 분류 + 날짜"면 성공
- 관리자는 수동 수정 가능

#### UI 요구사항
- 파일 업로드 버튼 (드래그 앤 드롭 지원)
- 업로드된 영수증 목록 표시
- 각 영수증: 썸네일, 분류, 날짜, 금액, 수정 버튼
- 자동 분류 실패 시 관리자가 수동 입력 가능

---

### 3️⃣ 보고서 자동 생성 (Read-only)

#### 기능
- 기간 선택 (예: 2025.08.01 ~ 08.31)
- 자동 생성:
  - 수입 합계
  - 지출 합계
  - 잔액 (수입 - 지출)

#### 출력
- PDF
- Excel

#### 규칙
- ❌ 수정 불가
- ❌ 양식 변경 불가
- ⭕ 구청/체육회 제출용

#### UI 요구사항
- 기간 선택 달력 (시작일/종료일)
- 미리보기 영역 (수입/지출/잔액)
- 생성 버튼 (PDF 생성 | Excel 생성)
- 다운로드 링크

---

## 🔐 권한 규칙 (단순 고정)

| 역할 | 접근 |
|------|------|
| `association_admin` | 기록/업로드/상태 변경 ⭕ |
| 그 외 | 접근 불가 ❌ |

---

## 🗂 권장 데이터 구조 (가이드)

### Firestore 구조
```
/associations/{associationId}
  /accounting
    /receipts/{receiptId}
      - imageUrl: string (Firebase Storage 경로)
      - category: "facility" | "referee" | "operation"
      - date: Timestamp
      - tournamentName?: string
      - amount: number
      - uploadedBy: string (uid)
      - uploadedAt: Timestamp
      - modifiedAt?: Timestamp
    /rentals/{rentalId}
      - teamId?: string
      - teamName?: string
      - amount: number
      - status: "unpaid" | "paid" | "refunded"
      - createdAt: Timestamp
      - updatedAt: Timestamp
      - updatedBy: string (uid)
    /reports/{reportId}
      - startDate: Timestamp
      - endDate: Timestamp
      - income: number
      - expense: number
      - balance: number
      - generatedAt: Timestamp
      - generatedBy: string (uid)
```

**참고**: 필드명/세부 구조는 개발자 재량  
**단, "상태 기록 중심"은 반드시 유지**

---

## 🚫 명시적 제외 (이번 Phase에서 절대 금지)

- ❌ 온라인 결제
- ❌ 카드/계좌 연동
- ❌ 자동 송금
- ❌ 세무 처리
- ❌ 외부 회계 시스템 연동

---

## ✅ 완료 판정 기준 (이거면 PASS)

### 사무국장이 할 수 있어야 함:

1. ✅ 영수증을 폰으로 찍어 올릴 수 있다
2. ✅ 수납 상태를 한 화면에서 본다
3. ✅ 보고서를 버튼으로 뽑는다

### 더 이상 하지 않아야 함:

- ❌ 풀칠
- ❌ 스캔
- ❌ 엑셀 복붙

---

## 🧠 개발자에게 전하는 한 문장

**"이건 회계 시스템이 아니라 사무국을 밤에 집에 보내는 기능입니다."**

---

## 📋 구현 체크리스트

### 대관료 수납/정산 보드
- [ ] Firestore 스키마 정의 (`/accounting/rentals`)
- [ ] 목록 화면 (팀명, 금액, 상태)
- [ ] 상태 변경 기능 (관리자만)
- [ ] 협회 선지급 총액 표시

### 영수증 디지털화
- [ ] Firebase Storage 연동
- [ ] 파일 업로드 UI (드래그 앤 드롭)
- [ ] Firestore 스키마 정의 (`/accounting/receipts`)
- [ ] 자동 분류 로직 (키워드 매칭 또는 간단한 ML)
- [ ] 영수증 목록 화면
- [ ] 수동 수정 기능 (관리자만)

### 보고서 자동 생성
- [ ] 기간 선택 UI
- [ ] 데이터 집계 로직 (수입/지출/잔액)
- [ ] PDF 생성 (jsPDF 또는 유사)
- [ ] Excel 생성 (ExcelJS 또는 유사)
- [ ] 다운로드 기능

### 권한 체크
- [ ] `association_admin` 권한 체크 (모든 기능)
- [ ] 그 외 사용자 접근 차단

---

## 🔧 기술 스택 (권장)

### 프론트엔드
- React (기존 프로젝트와 동일)
- Firebase Storage (영수증 이미지)
- Firestore (데이터 저장)
- jsPDF (PDF 생성)
- ExcelJS (Excel 생성)

### 백엔드 (선택적)
- Cloud Functions (OCR/AI 분류 필요 시)
- Google Cloud Vision API (OCR, 선택적)

---

## 📌 다음 단계 (구현 후)

1. **Phase 4-1 결과물 확인**
2. **실사용 1~2주 관찰**
3. **Phase 4-2 (알림 자동화 or 기록 고도화) 결정**

---

## 📌 관련 문서

- **와이어프레임**: `PHASE4_1_WIREFRAME.md`
  - 텍스트 기반 와이어프레임
  - 화면 구조 및 네비게이션 정의

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: Phase 4-1 개발 지시서 완료 (실행 가능한 지시문)

