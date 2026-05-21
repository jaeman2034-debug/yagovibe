# 🧠 Q 단계 — 출시 후 7일 운영 대응 시나리오

> **"첫 일주일에 무슨 일이 터져도 흔들리지 않게" 만드는 문서**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 목표

- 문제 발생 시 즉시 행동
- 감정/추측 ❌, 사전 결정 ⭕
- CS·운영 리소스 최소화

---

## Day 0 (출시 당일) — 관찰만 한다

### 절대 금기

- ❌ 핫픽스
- ❌ UX 개편
- ❌ 지표 해석

### 할 일

- [ ] 이벤트 로그 정상 수집 확인
- [ ] 치명적 에러(P0)만 대응
- [ ] 사용자 피드백 수집 (기록만)

### P0 정의 (즉시 롤백/플래그 OFF)

**치명적 에러:**
- [ ] 비참여자 접근 가능
- [ ] 거래 완료 권한 우회
- [ ] 이미지 업로드 전면 실패

**대응:**
- 즉시 롤백
- 또는 기능 플래그 OFF

**체크 방법:**
```typescript
// P0 에러 감지
const checkP0Errors = async () => {
  // 1. 비참여자 접근 체크
  const unauthorizedAccess = await checkUnauthorizedAccess();
  
  // 2. 권한 우회 체크
  const permissionBypass = await checkPermissionBypass();
  
  // 3. 이미지 업로드 실패율 체크
  const imageUploadFailure = await checkImageUploadFailure();
  
  if (unauthorizedAccess || permissionBypass || imageUploadFailure > 0.1) {
    // 즉시 롤백 또는 플래그 OFF
    await rollbackOrDisableFeature();
  }
};
```

---

## Day 1–2 — 첫 신호 포착

### 본다

- [ ] 거래 성사율
- [ ] 이미지 업로드 실패율
- [ ] 차단/신고 발생 위치

### 판단

#### 이미지 실패 > 2% → 인프라/권한 점검

**체크:**
```typescript
const checkImageUploadFailure = async () => {
  const totalUploads = await getTotalImageUploads();
  const failedUploads = await getFailedImageUploads();
  const failureRate = (failedUploads / totalUploads) * 100;
  
  if (failureRate > 2) {
    // 인프라/권한 점검 필요
    await investigateInfrastructure();
  }
};
```

#### 특정 채팅/유저에 신고 집중 → 시스템 제약 후보

**체크:**
```typescript
const checkReportConcentration = async () => {
  const reports = await getReports();
  const userReportCount = new Map();
  
  reports.forEach(report => {
    const userId = report.reportedUserId;
    userReportCount.set(userId, (userReportCount.get(userId) || 0) + 1);
  });
  
  // 특정 유저에 3회 이상 신고 집중
  for (const [userId, count] of userReportCount) {
    if (count >= 3) {
      // 시스템 제약 후보
      await markForSystemRestriction(userId);
    }
  }
};
```

### 조치

- ❌ 기능 추가
- ⭕ 문구/가이드 미세 조정

**예시:**
- 후기 CTA 문구 개선
- 상품 제안 가이드 보강
- 신고/차단 설명 명확화

---

## Day 3–4 — UX 미세 조정

### 가능한 조치 (안전)

- [ ] 후기 CTA 위치 조정
- [ ] 토스트 문구 개선
- [ ] 상품 카드 설명 보강
- [ ] 인앱 가이드 타이밍 조정

**예시:**
```typescript
// 후기 CTA 위치 조정
// 기존: 채팅 하단
// 변경: 거래 완료 메시지 바로 아래

// 토스트 문구 개선
// 기존: "거래가 완료되었습니다"
// 변경: "거래가 완료되었습니다. 후기를 남겨보세요."
```

### 금지

- ❌ 데이터 모델 변경
- ❌ 거래 플로우 변경
- ❌ 권한 구조 변경

---

## Day 5 — 첫 결정 포인트

### 체크

- [ ] 거래 성사율 ≥ 10% ?
- [ ] 후기 작성률 ≥ 30% ?

### 결정

#### YES → 유지

**조치:**
- 현재 상태 유지
- 다음 주 관찰 계속

#### NO → 원인 하나만 정해서 수정

**원인 후보:**
1. 상품 제안 UX
2. 신뢰 노출 (평점/거래수)

**선택 기준:**
- 거래 성사율 < 10% → 상품 제안 UX 문제 가능성 높음
- 후기 작성률 < 30% → 신뢰 노출 문제 가능성 높음

**조치:**
```typescript
// 원인 하나만 정해서 수정
if (dealCompletionRate < 0.1) {
  // 상품 제안 UX 개선
  await improveProductSuggestionUX();
} else if (reviewRate < 0.3) {
  // 신뢰 노출 개선
  await improveTrustDisplay();
}
```

---

## Day 6 — 운영 제약 실험

### 조건부

**악성 패턴 보이면:**
- [ ] 제안 빈도 제한
- [ ] 노출 가중치 ↓

### 중요

- ❌ 사용자에게 알리지 않는다
- ⭕ 점수/제재는 조용히

**구현:**
```typescript
// 시스템 제약 적용 (조용히)
const applySystemRestrictions = async (userId: string) => {
  await updateDoc(doc(db, "users", userId), {
    systemRestrictions: {
      exposureReduced: true,
      newDealLimited: true,
      reason: "high_report_rate",
      appliedAt: serverTimestamp(),
    },
  });
  
  // 사용자에게 알리지 않음
  // 운영자 대시보드에만 기록
};
```

---

## Day 7 — 주간 결론 (딱 하나)

### 세 가지 중 하나만 선택

#### 1. KEEP: 그대로 간다

**조건:**
- 거래 성사율 ≥ 10%
- 후기 작성률 ≥ 30%
- 치명적 에러 없음

**조치:**
- 현재 상태 유지
- 다음 주 관찰 계속

---

#### 2. FIX: 한 가지 UX만 고친다

**조건:**
- 거래 성사율 < 10% 또는 후기 작성률 < 30%
- 원인 명확

**조치:**
- 한 가지 UX만 수정
- 예: 상품 제안 UX 또는 신뢰 노출

**금지:**
- ❌ 여러 개 동시 수정
- ❌ 데이터 모델 변경

---

#### 3. CUT: MVP 범위 더 줄인다

**조건:**
- 거래 성사율 < 5%
- 핵심 플로우 문제

**조치:**
- MVP 범위 더 줄임
- 예: 후기 기능 제거, 거래 취소 제거

**금지:**
- ❌ 기능 추가
- ❌ 복잡도 증가

---

### 동시에 두 개 ❌

**원칙:**
- 한 번에 하나만
- KEEP / FIX / CUT 중 하나만 선택

---

## 🧠 천재 포인트 하나

### 첫 7일의 목표는 '성공'이 아니라 '틀리지 않았는지 확인'이다

**그래서:**
- 성공 지표보다 실패 지표에 집중
- 문제 발견이 목표
- 해결은 다음 주

---

## 📊 7일 체크리스트 요약

### Day 0
- [ ] 이벤트 로그 정상 수집
- [ ] P0 에러만 대응
- [ ] 핫픽스/UX 개편 금지

### Day 1–2
- [ ] 거래 성사율 확인
- [ ] 이미지 업로드 실패율 확인
- [ ] 신고 집중 패턴 확인
- [ ] 문구/가이드만 미세 조정

### Day 3–4
- [ ] UX 미세 조정 (안전한 것만)
- [ ] 데이터 모델 변경 금지
- [ ] 거래 플로우 변경 금지

### Day 5
- [ ] 거래 성사율 ≥ 10% 체크
- [ ] 후기 작성률 ≥ 30% 체크
- [ ] 원인 하나만 정해서 수정

### Day 6
- [ ] 악성 패턴 확인
- [ ] 시스템 제약 실험 (조용히)
- [ ] 사용자에게 알리지 않음

### Day 7
- [ ] KEEP / FIX / CUT 중 하나 선택
- [ ] 동시에 두 개 금지
- [ ] 다음 주 계획 수립

---

## 🎯 7일 후 판정 기준

### KEEP 조건

- 거래 성사율 ≥ 10%
- 후기 작성률 ≥ 30%
- 치명적 에러 없음
- 운영 개입 없이 버팀

### FIX 조건

- 거래 성사율 < 10% 또는 후기 작성률 < 30%
- 원인 명확
- 한 가지 UX만 수정 가능

### CUT 조건

- 거래 성사율 < 5%
- 핵심 플로우 문제
- MVP 범위 더 줄여야 함

---

## 🏁 다음 선택

### I → 여기서 멈추고 구현·배포·관찰 (강력 추천)

**이유:**
- 7일 운영 플레이북 완료 ✅
- 대응 시나리오 명확 ✅
- 바로 실행 가능 ✅

### R → 이 MVP에 맞는 수익 모델 연결

**포함 내용:**
- 수익 모델 후보
- 연결 지점 설계
- 구현 우선순위

### S → 이 전체 과정을 재사용 가능한 프레임워크로 정리

**포함 내용:**
- 설계 → 구현 → 출시 → 관찰 전체 프로세스
- 재사용 가능한 템플릿
- 다음 제품에 바로 적용

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

