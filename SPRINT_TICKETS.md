# 🧾 N 단계 — 2주 MVP Jira/Notion 티켓 분해

> **바로 복붙해서 쓰는 수준**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 원칙

- 각 티켓은 **0.5~1일 내 완료 가능**
- 의존성 명확
- Done 기준 명확

---

## 🗂️ EPIC 1 — 보안 & 권한 (Day 1–2)

### T1. Firestore Rules 적용

**Priority:** P0 (Critical)  
**Estimate:** 0.5 day  
**Assignee:** Backend

**설명:**
chats/messages/deals/reviews 접근 권한 설정

**Tasks:**
- [ ] `chats/{chatId}` - participants 검증
- [ ] `chats/{chatId}/messages/{messageId}` - 참여자만 읽기/쓰기
- [ ] `deals/{dealId}` - 거래 참여자만 읽기, 완료는 판매자만
- [ ] `reviews/{reviewId}` - 읽기만 가능, 수정/삭제 금지

**Acceptance Criteria:**
- ✅ 비참여자 읽기/쓰기 불가
- ✅ 참여자만 메시지/이미지 접근 가능
- ✅ Rules 배포 후 테스트 통과

**Definition of Done:**
- [ ] Firestore Rules 배포 완료
- [ ] 비참여자 접근 테스트 통과
- [ ] 참여자 접근 테스트 통과

---

### T2. Storage Rules 적용

**Priority:** P0 (Critical)  
**Estimate:** 0.5 day  
**Assignee:** Backend

**설명:**
chats/{chatId} 경로 업로드 권한 제한

**Tasks:**
- [ ] Storage Rules 작성
- [ ] chat participants 검증 로직
- [ ] Rules 배포 및 테스트

**Acceptance Criteria:**
- ✅ chat participants만 업로드 가능
- ✅ 비로그인/비참여자 업로드 실패
- ✅ 업로드 성공률 100% (권한 통과 시)

**Definition of Done:**
- [ ] Storage Rules 배포 완료
- [ ] 비참여자 업로드 테스트 실패 확인
- [ ] 참여자 업로드 테스트 성공 확인

---

### T3. 서버 권한 가드

**Priority:** P0 (Critical)  
**Estimate:** 1 day  
**Assignee:** Backend

**설명:**
거래 완료/취소/후기 API 서버 검증

**Tasks:**
- [ ] 거래 완료 API: `sellerId === request.uid` 가드
- [ ] 거래 취소 API: 거래 참여자만 가능
- [ ] 후기 작성 API: 거래 참여자만, 중복 체크
- [ ] 메시지 전송 API: participants 검증

**Acceptance Criteria:**
- ✅ 판매자만 거래 완료 가능
- ✅ 거래 참여자만 후기 작성 가능
- ✅ 비참여자 API 호출 시 403 에러

**Definition of Done:**
- [ ] 모든 API에 권한 가드 적용
- [ ] 권한 테스트 통과
- [ ] 프론트 조건은 UX용 (보안 아님) 확인

---

## 🗂️ EPIC 2 — 채팅 & 메시지 (Day 3–4)

### T4. 메시지 전송 API

**Priority:** P0 (Critical)  
**Estimate:** 1 day  
**Assignee:** Backend

**설명:**
text/image/product/system 타입 처리

**Tasks:**
- [ ] 메시지 전송 API 구현
- [ ] type별 필드 처리 (text, imageUrl, productId)
- [ ] participants 검증
- [ ] 메시지 저장 및 반환

**Acceptance Criteria:**
- ✅ 모든 메시지 type 저장/조회 정상
- ✅ 참여자만 전송 가능
- ✅ 메시지 순서 정확 (createdAt 기준)

**Definition of Done:**
- [ ] API 구현 완료
- [ ] 모든 type 테스트 통과
- [ ] 권한 검증 통과

---

### T5. 이미지 업로드 UX

**Priority:** P1 (High)  
**Estimate:** 1 day  
**Assignee:** Frontend

**설명:**
업로드 로딩/실패/재시도

**Tasks:**
- [ ] 이미지 선택 UI
- [ ] 업로드 중 로딩 표시
- [ ] 업로드 실패 시 에러 처리
- [ ] 재시도 버튼 (선택적)

**Acceptance Criteria:**
- ✅ 업로드 중 피드백 표시
- ✅ 실패 시 원인별 토스트
- ✅ 업로드 성공 시 메시지에 이미지 표시

**Definition of Done:**
- [ ] 업로드 플로우 완성
- [ ] 에러 케이스 처리 완료
- [ ] 모바일 테스트 통과

---

## 🗂️ EPIC 3 — 상품 제안 & 거래 (Day 5–7)

### T6. 상품 카드 메시지

**Priority:** P0 (Critical)  
**Estimate:** 1 day  
**Assignee:** Frontend

**설명:**
채팅 내 상품 카드 UI

**Tasks:**
- [ ] ProductCard 컴포넌트
- [ ] 상품 정보 표시 (이미지, 제목, 가격)
- [ ] 카드 클릭 시 상세 이동
- [ ] 거래 완료 버튼 (판매자만)

**Acceptance Criteria:**
- ✅ 여러 상품 제안 가능
- ✅ 카드 클릭 시 상세 이동
- ✅ 판매자만 거래 완료 버튼 표시

**Definition of Done:**
- [ ] ProductCard 컴포넌트 완성
- [ ] 여러 상품 제안 테스트 통과
- [ ] 권한별 버튼 표시 확인

---

### T7. Deal 생성 트랜잭션

**Priority:** P0 (Critical)  
**Estimate:** 1 day  
**Assignee:** Backend

**설명:**
상품 제안 시 message + deal 동시 생성

**Tasks:**
- [ ] 트랜잭션으로 message + deal 생성
- [ ] 실패 시 롤백 처리
- [ ] deal 상태: "proposed"

**Acceptance Criteria:**
- ✅ 둘 중 하나 실패 시 롤백
- ✅ message와 deal 연결 확인
- ✅ 트랜잭션 원자성 보장

**Definition of Done:**
- [ ] 트랜잭션 로직 구현 완료
- [ ] 롤백 테스트 통과
- [ ] message-deal 연결 확인

---

### T8. 거래 완료/취소

**Priority:** P0 (Critical)  
**Estimate:** 1 day  
**Assignee:** Backend + Frontend

**설명:**
판매자 완료, 완료 전 취소

**Tasks:**
- [ ] 거래 완료 API (판매자만)
- [ ] 거래 취소 API (완료 전만)
- [ ] 상태 전이 확인
- [ ] 프론트 버튼 연동

**Acceptance Criteria:**
- ✅ 완료 후 상태 고정
- ✅ 취소는 proposed 상태에서만 가능
- ✅ 권한 검증 통과

**Definition of Done:**
- [ ] API 구현 완료
- [ ] 상태 전이 테스트 통과
- [ ] 프론트 연동 완료

---

### T9. 시스템 메시지 삽입

**Priority:** P1 (High)  
**Estimate:** 0.5 day  
**Assignee:** Backend

**설명:**
거래 완료/취소 시 자동 메시지

**Tasks:**
- [ ] 거래 완료 시 시스템 메시지
- [ ] 거래 취소 시 시스템 메시지
- [ ] 시스템 메시지 UI 스타일

**Acceptance Criteria:**
- ✅ 채팅 내 상태 인지 1초 컷
- ✅ 시스템 메시지 명확히 구분
- ✅ dealId 연결 확인

**Definition of Done:**
- [ ] 시스템 메시지 자동 삽입 완료
- [ ] UI 스타일 적용 완료
- [ ] 상태 인지 테스트 통과

---

## 🗂️ EPIC 4 — 후기 & 신뢰 (Day 8–9)

### T10. 후기 CTA

**Priority:** P1 (High)  
**Estimate:** 0.5 day  
**Assignee:** Frontend

**설명:**
거래 완료 후 후기 버튼 노출

**Tasks:**
- [ ] 거래 완료 시 CTA 표시
- [ ] "이번 거래는 어떠셨나요?" 문구
- [ ] 이미 후기 작성했으면 숨김
- [ ] 후기 모달 열기

**Acceptance Criteria:**
- ✅ 거래 참여자만 노출
- ✅ 거래당 1회 제한
- ✅ CTA 위치 명확

**Definition of Done:**
- [ ] CTA UI 완성
- [ ] 조건부 표시 로직 완료
- [ ] 모달 연동 완료

---

### T11. 평점 저장 & 계산

**Priority:** P1 (High)  
**Estimate:** 1 day  
**Assignee:** Backend + Frontend

**설명:**
평점 저장, 표시 규칙 적용

**Tasks:**
- [ ] 후기 모달 (평점만, 텍스트 없음)
- [ ] 평점 저장 API
- [ ] 사용자 평점 계산 (서버)
- [ ] 평점 표시 규칙 (3건 미만 숨김)
- [ ] 표시 형식: "⭐ 점수 · 거래 N건"

**Acceptance Criteria:**
- ✅ 3건 미만 숨김
- ✅ ⭐ 점수 · 거래 N건 표기
- ✅ 중복 후기 방지

**Definition of Done:**
- [ ] 평점 저장 완료
- [ ] 계산 로직 완료
- [ ] 표시 규칙 적용 완료

---

## 🗂️ EPIC 5 — 안전장치 & 마감 (Day 10)

### T12. 차단/신고 연결

**Priority:** P1 (High)  
**Estimate:** 0.5 day  
**Assignee:** Frontend

**설명:**
채팅 메뉴 액션 연동

**Tasks:**
- [ ] 차단 기능 연결 (기존 기능 활용)
- [ ] 신고 기능 연결 (기존 기능 활용)
- [ ] 차단 후 재진입 불가 확인

**Acceptance Criteria:**
- ✅ 차단 시 재진입 불가
- ✅ 신고 후 상태 피드백
- ✅ 메뉴 액션 정상 동작

**Definition of Done:**
- [ ] 차단/신고 연동 완료
- [ ] 재진입 차단 확인
- [ ] 피드백 확인

---

### T13. 모바일 UX 점검

**Priority:** P2 (Medium)  
**Estimate:** 0.5 day  
**Assignee:** Frontend

**설명:**
터치 영역/스크롤/포커스

**Tasks:**
- [ ] 버튼 터치 영역 44x44px 확인
- [ ] 스크롤 부드러움 확인
- [ ] 키보드 열림 시 레이아웃 확인
- [ ] 포커스 트랩 확인

**Acceptance Criteria:**
- ✅ "안 눌린 느낌" 0
- ✅ 모바일 실기기 테스트 통과
- ✅ 터치 영역 충분

**Definition of Done:**
- [ ] 모바일 테스트 통과
- [ ] 터치 영역 확인 완료
- [ ] 스크롤/포커스 확인 완료

---

### T14. 이벤트 로그 & 지표

**Priority:** P1 (High)  
**Estimate:** 1 day  
**Assignee:** Backend + Frontend

**설명:**
거래/후기/차단 핵심 로그

**Tasks:**
- [ ] 이벤트 로그 6개 구현
  - 거래 제안 (deal.proposed)
  - 거래 완료 (deal.completed)
  - 거래 취소 (deal.cancelled)
  - 후기 작성 (review.created)
  - 차단 (user.blocked)
  - 신고 (report.created)
- [ ] 30일 관찰 지표 계산 함수
- [ ] 대시보드 (선택적)

**Acceptance Criteria:**
- ✅ 30일 관찰 지표 계산 가능
- ✅ 모든 핵심 이벤트 로그 기록
- ✅ 지표 대시보드 표시 (선택적)

**Definition of Done:**
- [ ] 이벤트 로그 구현 완료
- [ ] 지표 계산 함수 완료
- [ ] 대시보드 표시 확인 (선택적)

---

## ✅ 스프린트 완료 Definition of Done

### 최종 체크리스트

- [ ] 채팅 → 거래 → 후기 실사용 가능
- [ ] 권한 사고 0
- [ ] 운영介入 없이 버팀
- [ ] 핵심 지표 측정 가능
- [ ] 모바일 테스트 통과

### 판정

**👉 전부 YES면 출시. 하나라도 NO면 컷.**

---

## 📊 티켓 우선순위 요약

| Priority | 티켓 | 이유 |
|----------|------|------|
| P0 | T1, T2, T3, T4, T6, T7, T8 | 핵심 플로우 |
| P1 | T5, T9, T10, T11, T12, T14 | 중요 기능 |
| P2 | T13 | UX 마감 |

---

## 🔄 의존성 그래프

```
T1 (Rules) → T3 (가드)
T2 (Storage) → T5 (업로드)
T4 (메시지) → T6 (상품 카드)
T6 (상품 카드) → T7 (Deal 생성)
T7 (Deal 생성) → T8 (완료/취소)
T8 (완료/취소) → T9 (시스템 메시지)
T8 (완료/취소) → T10 (후기 CTA)
T10 (후기 CTA) → T11 (평점)
T12 (차단/신고) → T14 (로그)
```

---

## 🏁 다음 선택

### I → 여기서 멈추고 구현 시작 (추천)

**이유:**
- 티켓 분해 완료 ✅
- 우선순위 명확 ✅
- 바로 실행 가능 ✅

### O → 출시 공지/가이드 문구 작성

**포함 내용:**
- 사용자 가이드
- 공지사항 템플릿
- FAQ

### P → QA 체크리스트 최종본

**포함 내용:**
- 기능별 테스트 케이스
- 시나리오 테스트
- 회귀 테스트

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

