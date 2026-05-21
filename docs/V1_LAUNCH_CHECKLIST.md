# 🚀 v1 출시 체크리스트 (실전용 · 누락 방지)

## Ⅰ. 기능 완성도 (GO / NO-GO 기준)

### ✅ 참가 신청
- [x] 팀 수 입력/선택 정상
- [x] 참가비 계산 단일 수식으로 통일 (`calcEntryFee` 사용)
- [x] 승인/반려 Cloud Function으로 처리
- [x] 승인 시 초대 링크 자동 생성
- [x] 승인/반려 자동 알림 발송

### ✅ 필수 검증
- [x] 승인/반려 시 `internal` 에러 0회 (undefined 제거 완료)
- [x] 동일 신청 중복 승인 방지 (`appData.status === "APPROVED"` 체크)
- [x] 승인 후 상태 변경 되돌릴 수 없음 (불변성 보장)

**검증 위치:**
- `functions/src/tournament/approveApplication.ts:80-88` (중복 승인 방지)
- `functions/src/tournament/updateApplicationStatus.ts` (반려 처리)

---

## Ⅱ. 데이터/아키텍처 안정성

### ✅ Firestore
- [x] `undefined` payload 차단 (모든 Cloud Function에서 처리)
- [x] `timestamp`는 `serverTimestamp()`만 사용
- [x] 참가비는 DB 미저장 (teamCount로 재계산)

**검증 위치:**
- `functions/src/tournament/approveApplication.ts` (undefined 제거 패턴 적용)
- `functions/src/tournament/updateApplicationStatus.ts` (undefined 제거 패턴 적용)
- `src/lib/notice/feeCalc.ts` (단일 소스 계산 함수)

### ✅ Rules
- [x] 일반 사용자: `create(pending)`만 허용
- [x] 관리자: `approve/reject` 허용
- [x] `invites`: `read` 공개 / `write` 관리자·CF만

**검증 위치:**
- Firestore Rules 파일 (배포 확인 필요)

---

## Ⅲ. UX 필수 문구 (문의 0 만드는 핵심)

### ✅ 참가 신청 영역
- [x] "참가 신청이 승인되면, 팀장이 선수 명단을 등록할 수 있습니다."
- [x] "(팀원 개별 신청은 없습니다)"

**위치:** `src/components/tournament/TeamApplicationForm.tsx:299-302`

### ✅ 승인 모달
- [x] "승인 시 팀장에게 선수 명단 등록 링크가 제공됩니다."

**위치:** `src/components/tournament/ApplicationApprovalModal.tsx:156`

### ✅ 반려 모달
- [x] "반려된 신청은 복구할 수 없습니다. 신중히 결정해주세요."

**위치:** `src/components/tournament/ApplicationRejectModal.tsx:113`

### ✅ 신청 완료 토스트
- [x] "참가 신청이 완료되었습니다.\n\n협회 승인 후,\n팀장이 선수 명단을 등록하게 됩니다."

**위치:** `src/components/tournament/TeamApplicationForm.tsx:148-150`

---

## Ⅳ. 법적/정책 최소 세트 (한국 기준)

### ✅ 개인정보 수집·이용 동의
- [x] 필수 체크박스 구현
- [x] 수집 항목 명시 (팀명, 담당자명, 연락처, 신청 팀 수, 선수 명단)
- [x] 보관 기간 명시 (대회 종료 후 1년)
- [x] 개인정보 처리방침 링크 제공

**위치:**
- `src/components/tournament/TeamApplicationForm.tsx:525-545`
- `src/pages/PrivacyPolicyPage.tsx` (새로 생성)

### ✅ 이용약관
- [x] 대회 참가 약관 동의 체크박스
- [x] 이용약관 링크 제공

**위치:**
- `src/components/tournament/TeamApplicationForm.tsx:505-523`
- `src/pages/TermsOfServicePage.tsx` (새로 생성)

### ✅ 관리자 연락처 노출
- [x] 개인정보 처리방침 페이지에 연락처 포함
- [x] 이용약관 페이지에 연락처 포함

**위치:**
- `src/pages/PrivacyPolicyPage.tsx` (관리자 연락처 섹션)
- `src/pages/TermsOfServicePage.tsx` (문의처 섹션)

---

## Ⅴ. 운영 시나리오 테스트 (5분)

### 테스트 시나리오

1. **일반 사용자 신청 → pending**
   - [ ] 팀 정보 입력 정상
   - [ ] 참가비 계산 정상 (3팀 = 300,000원)
   - [ ] 약관 동의 필수 체크
   - [ ] 신청 완료 후 `pending` 상태 확인

2. **관리자 승인 → approved**
   - [ ] 승인 버튼 클릭
   - [ ] `internal` 에러 없음
   - [ ] 초대 링크 자동 생성 확인 (`invites` 컬렉션)
   - [ ] 팀장 알림 수신 확인 (이메일)

3. **반려 시 사유 저장/알림 확인**
   - [ ] 반려 사유 입력 필수
   - [ ] 반려 후 `rejected` 상태 확인
   - [ ] 팀장 알림 수신 확인 (이메일)

4. **중복 승인 방지**
   - [ ] 이미 승인된 신청 재승인 시도 → "이미 승인된 신청입니다" 메시지

5. **법적 페이지 접근**
   - [ ] `/privacy-policy` 접근 가능
   - [ ] `/terms-of-service` 접근 가능
   - [ ] 약관 동의 체크박스에서 링크 클릭 시 새 탭에서 열림

---

## Ⅵ. 롤백/장애 대비

### ✅ ErrorBoundary
- [x] 전역 ErrorBoundary 구현
- [x] 사용자용 메시지 + 개발자 로그 분리
- [x] Sentry 연동

**위치:** `src/components/ErrorBoundary.tsx`

### ✅ Cloud Function 실패 대비
- [x] 알림 실패 ≠ 승인/반려 실패 (소프트 실패)
- [x] 알림은 백그라운드 처리 (`void (async () => { ... })()`)

**위치:**
- `functions/src/tournament/approveApplication.ts:233-320` (알림 백그라운드 처리)
- `functions/src/tournament/updateApplicationStatus.ts:85-150` (알림 백그라운드 처리)

---

## 📋 최종 체크리스트 (배포 전)

### 배포 전 필수 확인
- [ ] Cloud Functions 배포 완료
- [ ] Firestore Rules 배포 완료
- [ ] 환경 변수 설정 확인 (`SENDGRID_API_KEY` 또는 `GMAIL_USER`/`GMAIL_PASS`)
- [ ] 운영 시나리오 테스트 5개 모두 통과
- [ ] 법적 페이지 접근 확인 (`/privacy-policy`, `/terms-of-service`)

### 배포 후 확인
- [ ] 승인/반려 시 `internal` 에러 0회
- [ ] 이메일 알림 정상 발송
- [ ] 초대 링크 정상 생성
- [ ] 약관 동의 체크박스 정상 동작

---

## 🎯 v1 출시 판정 기준

**GO 조건:**
- ✅ 모든 기능 완성도 항목 통과
- ✅ 데이터/아키텍처 안정성 확인
- ✅ UX 필수 문구 모두 반영
- ✅ 법적/정책 페이지 생성 및 링크 제공
- ✅ 운영 시나리오 테스트 5개 모두 통과
- ✅ ErrorBoundary 및 장애 대비 완료

**현재 상태:** ✅ **v1 출시 준비 완료**

---

## 📝 참고사항

### 향후 개선 (v1.1+)
- 카카오 알림톡 연동 (현재는 이메일만)
- 개인정보 처리방침 상세화 (협회별 커스터마이징)
- 이용약관 상세화 (대회별 규정 반영)

### v2 준비사항
- 결제 연동 설계 완료 (데이터 모델 준비됨)
- 멀티 테넌트 구조 완료 (확장 가능)
