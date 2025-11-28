# 🚀 즉시 실행할 단계 (3단계)

## 🟢 1단계 — Vercel 강제 재배포

### 방법 1: Vercel Dashboard에서 재배포

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. **Deployments** 탭 클릭
4. 가장 최근 배포 클릭
5. **"..." 메뉴 → Redeploy** 클릭
6. **"Use existing Build Cache"** 체크 해제 (중요!)
7. **"Redeploy"** 확인
8. 배포 완료 대기 (1-2분)

### 방법 2: Git 커밋 후 푸시

```bash
git add .
git commit -m "Force redeploy - Fix Firebase Auth popup"
git push
```

## 🟢 2단계 — 브라우저 캐시 완전 제거

1. **Ctrl + Shift + Delete** 누르기
2. **"캐시된 이미지 및 파일"** 체크
3. **"쿠키 및 기타 사이트 데이터"** 체크
4. **"지난 4주"** 또는 **"전체 기간"** 선택
5. **"데이터 삭제"** 클릭
6. **열린 탭 전체를 닫았다가 다시 실행**

## 🟢 3단계 — Service Worker 제거

1. 주소창에 입력: `chrome://serviceworker-internals/`
2. `yagovibe.com`, `yago-vibe-spt.firebaseapp.com` 관련 Service Worker 찾기
3. 각각 **"Unregister"** 클릭
4. Chrome 완전 종료 후 재시작

## 🔍 검증 (선택사항)

1. 배포된 사이트 접속
2. **F12 → Network** 탭 열기
3. 페이지 새로고침 (F5)
4. **main-xxxx.js** 파일 찾기
5. 파일 클릭 → **Response** 탭
6. **Ctrl + F** → `signInWithRedirect` 검색
7. **없어야 함** (있으면 재배포 필요)

## ✅ 완료 후 테스트

1. 배포 완료 대기 (1-2분)
2. 브라우저 캐시 삭제 완료
3. Service Worker 제거 완료
4. 배포된 사이트 접속
5. "G 구글로 로그인" 버튼 클릭
6. 정상 작동 확인

