# 🚀 YAGO VIBE 배포 가이드

## ✅ Firebase Hosting 배포

### 1️⃣ 빌드 확인
```bash
npm run build
```

### 2️⃣ Firebase 로그인
```bash
firebase login
```

### 3️⃣ 호스팅 배포
```bash
firebase deploy --only hosting
```

## 🌐 커스텀 도메인 설정 (app.yagovibe.com)

### [1] Cloudflare DNS 설정

1. **Cloudflare 로그인** → yagovibe.com 도메인 선택
2. **DNS → 레코드 추가**

```
타입: CNAME
이름: app
값: ghs.googlehosted.com
TTL: Auto
Proxy 상태: Proxied (회색 ☁️) ⚠️ 노란색 아님!
```

⚠️ **중요**: Proxy(프록시)를 **반드시 회색으로** 유지하세요!
- Firebase가 SSL 인증서를 직접 발급해야 합니다
- 노란색(Proxied)으로 설정하면 Firebase SSL 발급이 실패합니다

### [2] Firebase 콘솔 커스텀 도메인 연결

1. **Firebase 콘솔** → Hosting → **커스텀 도메인 추가**
2. 입력: `app.yagovibe.com`
3. Firebase가 **TXT 레코드** 인증 요청
   → Cloudflare에 추가
4. 인증 완료 후 Firebase가 **자동 SSL 발급** (최대 15분)

### [3] 배포 실행

```bash
firebase deploy --only hosting
```

## 📋 firebase.json 설정 완료

현재 설정:
- ✅ `site: "yago-vibe-spt"` - 사이트 ID
- ✅ `public: "dist"` - 빌드 폴더
- ✅ `rewrites` - SPA 라우팅 지원
- ✅ `headers` - CORS 및 HTTPS 보안

## 🎯 배포 후 확인

배포 완료 후:
- https://yago-vibe-spt.web.app
- https://yago-vibe-spt.firebaseapp.com
- (커스텀 도메인 연결 완료 후) https://app.yagovibe.com

## 🔧 트러블슈팅

### "Site not found" 오류
```bash
firebase use --add
# 프로젝트 선택: yago-vibe-spt
```

### SSL 발급 실패
- Cloudflare Proxy를 회색으로 확인
- TXT 레코드가 제대로 추가되었는지 확인

### 배포 실패
```bash
firebase login --reauth
firebase deploy --only hosting
```

## 🤖 GitHub Actions 자동 배포 (추천)

### 설정
1. GitHub Repository → Settings → Secrets → Actions
2. New secret 추가:
   - `FIREBASE_SERVICE_ACCOUNT`: Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > JSON 키
   - `VITE_OPENAI_API_KEY`: OpenAI API 키
   - `VITE_KAKAO_API_KEY`: Kakao Maps API 키
   - `VITE_SLACK聚集EBHOOK_URL`: Slack Webhook URL

### 사용법
```bash
git add .
git commit -m "✨ 새로운 기능 추가"
git push origin main
```

push하면 자동으로:
1. ✅ 빌드 실행
2. ✅ Firebase Hosting 배포
3. ✅ 배포 완료 알림

`.github/workflows/deploy.yml` 파일이 자동 처리합니다!

## 📋 배포 체크리스트

### Firebase Hosting
- [x] `firebase.json` 설정 완료
- [x] `site: "yago-vibe-spt"` 추가
- [x] `cleanUrls: true` 추가
- [x] `headers` 설정 완료

### 커스텀 도메인
- [ ] Cloudflare DNS 설정 (CNAME: app → cname.vercel-dns.com)
- [ ] Firebase 콘솔에 도메인 추가
- [ ] SSL 인증서 자동 발급 확인
- [ ] https://app.yagovibe.com 접속 테스트

### GitHub Actions
- [ ] `.github/workflows/deploy.yml` 생성 완료
- [ ] GitHub Secrets 설정
- [ ] main 브랜치 push 테스트
