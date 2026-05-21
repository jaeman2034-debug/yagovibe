# 🔥 Firestore Rules 문법 에러 해결

## 문제
- ❌ `FirebaseError: Error compiling rules`
- ❌ `L140:7 Unexpected 'if'`
- ❌ 모든 Firestore read 실패
- ❌ 공지사항, 토너먼트, 관리자 권한 체크 모두 실패

## 해결 방법

### STEP 1: 임시 Rules 적용 완료
`firestore.rules` 파일을 테스트용으로 변경했습니다:
- 모든 접근 허용 (`allow read, write: if true`)
- 에뮬레이터 테스트용
- 기능 복구 우선

### STEP 2: 에뮬레이터 재시작

```powershell
# 기존 에뮬레이터 종료
firebase emulators:stop

# 에뮬레이터 재시작
firebase emulators:start
```

### STEP 3: 브라우저 새로고침 (Hard Reload)

**PC:**
- Chrome: `Ctrl + Shift + R`
- 또는 개발자 도구(F12) → Network 탭 → "Disable cache" 체크 → 새로고침

**모바일:**
- 일반 새로고침

---

## 예상 결과

### ✅ 정상 작동
- 공지사항 표시 (데이터가 있으면)
- 관리자 권한 정상 판단
- 토너먼트 목록 표시
- 조 추첨 이후 단계 정상

### ✅ 에러 사라짐
- `Error compiling rules` 사라짐
- 콘솔에 Firestore 쿼리 성공 로그

---

## 다음 단계

기능이 정상 작동하면:
1. ✅ 공지사항 Firestore 구조 + 쿼리 기준 점검
2. ✅ 관리자/일반 사용자 분리 rules 정확히 다시 설계
3. ✅ 조 추첨 → 대진표 → 결승 자동 플로우 검증

---

## 원본 Rules 복구

나중에 원본 rules를 복구하려면:
1. `firestore.rules.backup` 확인
2. 원본 rules의 문법 에러 수정
3. `firestore.rules` 복구
