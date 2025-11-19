# 🚀 자동 배포 스크립트 (제가 준비한 것)

## ✅ 제가 완료한 작업

### 1. 배포 설정 파일 준비 완료 ✅
- ✅ `vercel.json` - Vercel 배포 설정
- ✅ `capacitor.config.ts` - 도메인 기반 모드 설정
- ✅ `public/robots.txt` - SEO 최적화
- ✅ `public/sitemap.xml` - 사이트맵
- ✅ `index.html` - SEO 메타 태그 추가
- ✅ `.gitignore` - Git 제외 파일 설정

### 2. 환경 변수 체크리스트 ✅
- Vercel에 추가해야 할 환경 변수 목록 준비 완료

---

## 📋 사용자가 해야 할 작업 (최소화됨)

### Step 1: GitHub Desktop 설치 및 업로드 (5분)

1. **GitHub Desktop 다운로드**
   - https://desktop.github.com
   - 설치 및 로그인

2. **저장소 생성**
   - File → New Repository
   - Name: `yago-vibe`
   - Local Path: `C:\Users\samsung256g\Desktop\yago-vibe-spt`
   - "Create repository" 클릭

3. **커밋 및 푸시**
   - Summary: `deploy: yago vibe prod with yagovibe.com`
   - "Commit to main" 클릭
   - "Publish repository" 클릭

---

### Step 2: Vercel 배포 (3분)

1. **Vercel 접속**
   - https://vercel.com
   - GitHub 계정으로 로그인

2. **프로젝트 추가**
   - "Add New..." → "Project"
   - `yago-vibe` 저장소 선택

3. **환경 변수 추가**
   - Settings → Environment Variables
   - 아래 목록 복사하여 추가:

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

4. **Deploy 클릭**

---

## 🎯 완료!

**총 소요 시간: 약 8분**

---

## 📝 참고

- 모든 설정 파일은 이미 준비되어 있습니다
- Vercel이 자동으로 Vite를 인식합니다
- 배포 후 `https://yago-vibe.vercel.app` 접속 가능

