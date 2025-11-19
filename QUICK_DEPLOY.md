# ⚡ 빠른 배포 가이드 (3단계)

## 🔥 Step 1: GitHub에 소스 올리기

### Git이 설치되어 있는 경우

```bash
git init
git add .
git commit -m "deploy: yago vibe prod"
git branch -M main
git remote add origin https://github.com/너GitHub아이디/yago-vibe.git
git push -u origin main
```

### Git이 없는 경우

**옵션 1: GitHub Desktop 사용 (추천)**
1. https://desktop.github.com 다운로드
2. 설치 및 로그인
3. File → New Repository
4. 프로젝트 폴더 선택
5. "Publish repository" 클릭

**옵션 2: GitHub 웹에서 직접 업로드**
1. https://github.com → New repository
2. Name: `yago-vibe`
3. "uploading an existing file" 클릭
4. 파일 드래그 앤 드롭
5. "Commit changes" 클릭

---

## 🔥 Step 2: Vercel에서 프로젝트 연결

1. **Vercel 접속**
   - https://vercel.com
   - GitHub 계정으로 로그인

2. **프로젝트 추가**
   - "Add New..." → "Project"
   - `yago-vibe` 저장소 선택

3. **자동 인식 확인**
   - Framework: Vite ✅
   - Build Command: `npm run build` ✅
   - Output Directory: `dist` ✅

4. **환경 변수 추가** (Settings → Environment Variables)
   ```
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_AUTH_DOMAIN=xxx
   VITE_FIREBASE_PROJECT_ID=xxx
   VITE_FIREBASE_STORAGE_BUCKET=xxx
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
   VITE_FIREBASE_APP_ID=xxx
   VITE_OPENAI_API_KEY=xxx
   VITE_KAKAO_MAP_KEY=xxx
   NODE_ENV=production
   ```

5. **Deploy 클릭**

---

## 🔥 Step 3: 배포 성공 확인

**배포 완료 후:**
- URL: `https://yago-vibe.vercel.app`
- 접속 확인
- 기능 테스트

---

## 📋 다음 단계: 도메인 연결

1. 가비아에서 `yagovibe.com` 구매
2. Vercel → Settings → Domains
3. `yagovibe.com` 추가
4. 가비아 DNS 설정
5. DNS 전파 확인 (1-2시간)

---

**준비 완료! GitHub에 올리고 Vercel에 배포하세요!**
