# 🔧 로컬 개발 환경 오류 해결 체크리스트

## 📋 빠른 체크리스트

### ✅ 1. Google Cloud Console - localhost 도메인 정리
- [ ] `http://localhost:5173` 포함 확인
- [ ] `http://localhost:5174` 포함 확인 (필요시)
- [ ] 불필요한 포트 번호 제거 (예: `localhost:5000`)

### ✅ 2. 브라우저 캐시 완전 삭제
- [ ] Ctrl + Shift + Delete
- [ ] "지난 4주" 또는 "전체 기간" 선택
- [ ] "쿠키 및 기타 사이트 데이터" 체크
- [ ] "캐시된 이미지 및 파일" 체크
- [ ] Chrome 완전 종료 후 재시작

### ✅ 3. Service Worker 제거
- [ ] `chrome://serviceworker-internals` 접속
- [ ] `yago-vibe-spt.firebaseapp.com` 관련 Service Worker Unregister
- [ ] `localhost:5173` 관련 Service Worker Unregister
- [ ] Chrome 완전 종료 후 재시작

### ✅ 4. 시크릿 모드에서 테스트
- [ ] Ctrl + Shift + N (시크릿 모드)
- [ ] `http://localhost:5173/login` 접속
- [ ] F12 → Console 탭 열기
- [ ] Google 로그인 버튼 클릭
- [ ] 로그인 성공 확인

## 🎯 예상 결과

### ✅ 정상 작동 시
```
✅ [Google Login] 로그인 성공
user: { email: "...", uid: "..." }
```

### ❌ 여전히 오류가 발생하면
1. Firebase Console → Authentication → Settings → Authorized domains
   - `localhost` 포함 여부 확인
2. Google Cloud Console → Redirect URIs 재확인
3. 실제 배포 환경에서 테스트 (yago-vibe-spt.firebaseapp.com)

## 💡 참고

- 이 오류는 **로컬 개발 환경에서만** 발생하는 Firebase Auth의 알려진 이슈입니다
- **실제 배포 환경에서는 정상 작동**할 가능성이 매우 높습니다
- 시크릿 모드에서 정상 작동하면 캐시 문제이므로, 위의 단계를 다시 실행하세요

