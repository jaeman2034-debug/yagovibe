# 🚀 Functions 프로덕션 배포 체크리스트

## ✅ 사전 확인 사항

### 1. 환경 변수 (Secret Manager)
- [ ] `OPENAI_API_KEY` Secret Manager에 등록됨
- [ ] Functions에서 `secrets: ["OPENAI_API_KEY"]` 설정 확인

### 2. Functions 코드 확인
- [ ] `generateTeamBlogPost` (onCall) export 확인
- [ ] `generateTeamBlogPostAPI` (onRequest) export 확인
- [ ] `autoWeeklyTeamPost` (onSchedule) export 확인

### 3. 빌드 확인
- [ ] `cd functions && npm run build` 성공
- [ ] TypeScript 컴파일 에러 없음

---

## 🔥 배포 명령어

### 전체 Functions 배포
```bash
firebase deploy --only functions
```

### 특정 함수만 배포 (빠른 배포)
```bash
firebase deploy --only functions:generateTeamBlogPost,functions:generateTeamBlogPostAPI,functions:autoWeeklyTeamPost
```

---

## 📋 배포 후 확인 사항

### 1. 배포 성공 확인
- [ ] Firebase Console에서 함수 목록 확인
- [ ] `generateTeamBlogPost` 존재 확인
- [ ] `generateTeamBlogPostAPI` 존재 확인

### 2. Secret Manager 확인
- [ ] Firebase Console > Functions > Configuration > Secrets
- [ ] `OPENAI_API_KEY` 존재 확인

### 3. 프로덕션 테스트
- [ ] 프로덕션 URL에서 "다음 글 생성하기" 버튼 클릭
- [ ] 성공적으로 포스트 생성 확인
- [ ] Firestore에 새 문서 생성 확인

---

## ⚠️ 주의사항

1. **Secret Manager 설정 필수**
   - `OPENAI_API_KEY`가 없으면 함수 실행 실패
   - Firebase Console에서 Secret Manager에 등록 필요

2. **첫 배포는 시간이 걸릴 수 있음**
   - Functions 초기 배포는 5-10분 소요 가능
   - 배포 중에는 함수 사용 불가

3. **에러 발생 시**
   - Firebase Console > Functions > Logs에서 확인
   - `OPENAI_API_KEY` 관련 에러 확인

---

## 🎯 빠른 배포 가이드

```bash
# 1. Secret Manager 확인 (수동)
# Firebase Console > Functions > Configuration > Secrets

# 2. Functions 빌드
cd functions
npm run build

# 3. 배포
cd ..
firebase deploy --only functions:generateTeamBlogPost,functions:generateTeamBlogPostAPI,functions:autoWeeklyTeamPost
```

---

## ✅ 배포 완료 확인

배포 성공 시:
```
✔ functions[generateTeamBlogPost]: Successful create operation.
✔ functions[generateTeamBlogPostAPI]: Successful create operation.
✔ functions[autoWeeklyTeamPost]: Successful create operation.
```

---

## 🔗 유용한 링크

- Firebase Console: https://console.firebase.google.com/project/yago-vibe-spt/functions
- Functions Logs: https://console.firebase.google.com/project/yago-vibe-spt/functions/logs
- Secret Manager: https://console.firebase.google.com/project/yago-vibe-spt/functions/config/secrets

