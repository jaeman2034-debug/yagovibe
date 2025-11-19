# ✅ Vercel 배포 체크리스트

## Step 1: Vercel 접속 및 로그인

- [ ] https://vercel.com 접속
- [ ] GitHub 계정으로 로그인
- [ ] 대시보드 접속 확인

---

## Step 2: 프로젝트 추가

- [ ] "Add New..." → "Project" 클릭
- [ ] GitHub 저장소 목록에서 `yago-vibe` 선택
- [ ] "Import" 클릭

---

## Step 3: 프로젝트 설정 확인

**자동 인식 확인:**
- [ ] Framework: Vite ✅
- [ ] Build Command: `npm run build` ✅
- [ ] Output Directory: `dist` ✅
- [ ] Install Command: `npm install` ✅

**Root Directory:** (비워두기)

---

## Step 4: 환경 변수 추가

**Vercel Dashboard → Settings → Environment Variables**

아래 변수들을 추가:

- [ ] `VITE_FIREBASE_API_KEY` = (실제 값)
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` = (실제 값)
- [ ] `VITE_FIREBASE_PROJECT_ID` = (실제 값)
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` = (실제 값)
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` = (실제 값)
- [ ] `VITE_FIREBASE_APP_ID` = (실제 값)
- [ ] `VITE_OPENAI_API_KEY` = (실제 값)
- [ ] `VITE_KAKAO_MAP_KEY` = (실제 값)
- [ ] `NODE_ENV` = `production`

**Environment:** Production, Preview, Development 모두 선택

---

## Step 5: 배포 시작

- [ ] "Deploy" 버튼 클릭
- [ ] 빌드 진행 상황 확인
- [ ] 배포 완료 대기 (약 2-3분)

---

## Step 6: 배포 확인

- [ ] 배포 성공 확인
- [ ] 배포 URL 확인: `https://yago-vibe.vercel.app`
- [ ] 웹 브라우저에서 접속 확인
- [ ] 기능 테스트 (로그인, 상품 목록 등)

---

## Step 7: 문제 해결 (필요 시)

**빌드 실패 시:**
- [ ] Build Logs 확인
- [ ] 환경 변수 누락 확인
- [ ] 로컬에서 `npm run build` 테스트

**접속 오류 시:**
- [ ] 환경 변수 확인
- [ ] Firebase 설정 확인
- [ ] CORS 설정 확인

---

## ✅ 완료!

배포가 완료되었습니다!

**다음 단계: 커스텀 도메인 연결 (yagovibe.com)**

