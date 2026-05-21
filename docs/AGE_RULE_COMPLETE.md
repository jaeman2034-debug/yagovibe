# 🔥 1️⃣ 대회 연령 기준 UI + 데이터 구조 구현 (완료)

## ✅ 완료 사항

### 1. 데이터 모델 확장
- ✅ `Tournament` 타입에 `ageRule` 필드 추가
  ```typescript
  ageRule?: {
    type: "U" | "OVER" | "OPEN";
    maxBirthYear?: number; // U대회 (이하)
    minBirthYear?: number; // OVER대회 (이상)
    description: string; // 화면 표시용
  };
  ```

### 2. UI 컴포넌트
- ✅ `TournamentAgeRuleForm.tsx` - 연령 기준 입력 폼
  - 대회 유형 선택 (U/OVER/OPEN)
  - 기준 출생연도 입력
  - 자동 설명 문구 생성

### 3. 통합
- ✅ `TournamentEditDrawer`에 연령 기준 폼 통합
- ✅ 저장 시 `ageRule` 필드 포함

### 4. Select 컴포넌트
- ✅ `src/components/ui/select.tsx` 생성 (shadcn 스타일)

## 📋 사용 방법

### 대회 생성/수정 시
1. 대회 등록 Drawer 열기
2. "대회 연령 기준" 섹션에서:
   - 대회 유형 선택 (U대회 / OVER대회 / 연령 제한 없음)
   - 기준 출생연도 입력 (U/OVER 선택 시)
   - 자동 생성된 설명 확인
3. 저장 시 `ageRule` 필드가 Firestore에 저장됨

## 🔥 핵심 포인트

### 데이터 기반 판별
- ✅ `description`은 표시용
- ✅ 실제 판별은 `maxBirthYear` / `minBirthYear` 숫자로 처리
- ✅ 선수 수백 명도 자동 판별 가능

### 다음 단계 준비
- ✅ 연령 기준이 데이터로 저장됨
- ✅ `checkAgeEligibility()` 함수에서 바로 사용 가능
- ✅ JoinKFA 연동과 완전히 분리

## 📊 데이터 예시

```typescript
// U-12 대회
{
  type: "U",
  maxBirthYear: 2013,
  description: "U-12 (2013년생 이하)"
}

// OVER-40 대회
{
  type: "OVER",
  minBirthYear: 1984,
  description: "1984년생 이상"
}

// 연령 제한 없음
{
  type: "OPEN",
  description: "연령 제한 없음"
}
```

## ✅ 완료 체크리스트

- [x] 대회에 연령 기준 필드 존재
- [x] 관리자 화면에서 입력 가능
- [x] 숫자 기반 데이터 저장
- [x] 설명 문구 자동 생성

👉 이제 연령 판단을 사람이 할 이유가 사라짐

## 다음 단계

▶️ 2️⃣ 선수 업로드 시 연령 자동 판별 로직 구현
- `checkAgeEligibility(player, tournamentAgeRule)` 유틸
- 선수 저장/업로드 시 자동 판별
- `eligible` / `reason` 필드 저장

