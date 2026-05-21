# 🚀 테스트 빠른 시작

## 브라우저 콘솔에서 실행 (가장 빠름)

### 1. DevTools 열기
- F12 또는 우클릭 → 검사
- Console 탭 선택

### 2. 스크립트 로드
```javascript
// test-browser-console.js 파일 내용 복사-붙여넣기
// 또는 파일을 직접 import (프로젝트 설정에 따라)
```

### 3. 설정
```javascript
const TEST_CONFIG = {
  associationId: "실제_협회_ID",
  tournamentId: "실제_대회_ID",
};
```

### 4. 실행
```javascript
// 전체 테스트
await runAllTests();

// 개별 테스트
await test1_ConcurrentClick();
await test2_RapidClick();
await test3_Retry();
await test6_ConcurrencyStress();
```

---

## 합격 기준 체크리스트

각 테스트 후 확인:

- [ ] `phaseVersion === 1` (1회만 증가)
- [ ] `phaseEventsCount === 1` (1건만 생성)
- [ ] 에러 코드 정상 반환 (`NO_APPROVED_TEAMS`, `PERMISSION_DENIED`)
- [ ] `replay: true` 정상 동작
- [ ] 서버 에러 로그 없음

---

## 다음 단계

테스트 통과 후:
👉 C) 운영 중 이상 징후 감지 포인트(알람 기준)
