# 🔥 STEP A 완전체 패키지 (실전 운영 준비 완료)

## ✅ 완료 사항

### 1. 데이터 모델 확장
- ✅ `Tournament` 타입에 `phase`, `registrationOpen`, `feePolicy`, `participantsCountApproved` 추가
- ✅ `TournamentApplication` 타입에 `managerName`, `phone` 추가

### 2. 참가비 계산 유틸
- ✅ `src/lib/notice/feeCalc.ts` - 이미 완성됨
- ✅ `calcEntryFee()` 함수로 자동 계산

### 3. 참가 신청 생성
- ✅ `src/lib/tournament/applicationRepository.ts` - `createTournamentApplication()` 함수
- ✅ 클라이언트에서 직접 생성 가능 (Rules 허용)

### 4. Cloud Functions (안전장치)
- ✅ `functions/src/tournament/approveApplication.ts` - 승인 시 teams/payment 자동 생성
- ✅ `functions/src/tournament/updateApplicationStatus.ts` - 거절/보류 처리
- ✅ Admin SDK로 권한 확인 (Rules 의존 없음)

### 5. UI 컴포넌트
- ✅ `src/components/tournament/TeamApplicationForm.tsx` - 참가 신청 폼
- ✅ `src/components/tournament/ApplicationAdminList.tsx` - 관리자 승인/거절 UI
- ✅ `src/components/tournament/TournamentAdminTabs.tsx` - 관리자 탭 UI (신청/납부/대진표)

### 6. Firestore Rules (최소 안전 버전)
- ✅ `applications`: create만 클라이언트 허용, update는 Functions 전용
- ✅ `teams`: Functions 전용 (승인 시 자동 생성)
- ✅ `payments`: Functions 전용 (승인 시 자동 생성)

## 📋 사용 방법

### 1. Functions 배포
```bash
cd functions
npm run build
firebase deploy --only functions:approveApplicationCallable,functions:updateApplicationStatusCallable
```

### 2. Rules 배포
```bash
firebase deploy --only firestore:rules
```

### 3. 대회 상세 페이지에서 사용
- 일반 사용자: "참가 신청" 버튼 클릭 → 신청 폼 표시
- 관리자: `TournamentAdminTabs` 컴포넌트 사용

## 🔥 핵심 안전장치

### 권한 문제 재발 방지
1. **승인/거절은 Functions로만 처리**
   - 클라이언트는 `approveApplicationCallable` 호출
   - Functions에서 Admin SDK로 권한 확인
   - Rules 의존 없음

2. **teams/payment는 Functions에서 자동 생성**
   - 승인 시 트랜잭션으로 원자적 처리
   - 클라이언트 직접 생성 불가

3. **applications는 create만 허용**
   - 신청은 클라이언트에서 가능
   - 상태 변경은 Functions 전용

## 📊 데이터 흐름

```
1. 사용자 신청
   → createTournamentApplication() (클라이언트)
   → applications/{appId} 생성 (status: PENDING)

2. 관리자 승인
   → approveApplicationCallable() (Functions)
   → application.status = "APPROVED"
   → teams/{teamId} 생성
   → payments/{paymentId} 생성
   → tournament.participantsCountApproved +1

3. 대진표 생성 (다음 단계)
   → 승인된 teams 기반으로 matches 생성
```

## 🎯 다음 단계 (STEP B)

1. 대진표 생성 Function (`generateBracketCallable`)
2. 경기 결과 입력 UI
3. phase 자동 전환 로직

## ⚠️ 주의사항

1. **인덱스**: applications 쿼리 시 복합 인덱스 필요할 수 있음
2. **teamId**: 현재는 `user.uid` 사용, 실제 teams 컬렉션 연동 필요
3. **결제 관리**: 납부 관리 탭은 UI만 있고 실제 입금 기록 기능은 STEP B에서 구현

