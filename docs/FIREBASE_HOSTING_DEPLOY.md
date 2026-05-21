# Firebase Hosting 배포 (YAGO — Vite + React)

메시지에 나온 **Next.js / `.next` / `out`** 설정은 **이 레포에 해당하지 않습니다.**  
여기는 **Vite**이고, `firebase.json`이 이미 **`public": "dist"`** + SPA 리라이트로 맞춰져 있습니다.

---

## 1. 사전 확인 (이미 맞음)

| 항목 | 값 |
|------|-----|
| 빌드 명령 | `npm run build` → `dist/` 생성 |
| Hosting public | `firebase.json` → `"public": "dist"` |
| SPA | `"**" → /index.html` 리라이트 존재 |
| 원클릭 배포 스크립트 | `package.json` → `deploy:hosting`, `deploy` |

---

## 2. 한 번만 하면 되는 설정

1. **Firebase CLI**  
   `npm install -g firebase-tools`

2. **로그인**  
   `firebase login`

3. **프로젝트 연결** (미연결 시)  
   프로젝트 루트에서 `firebase use --add` 로 대상 Firebase 프로젝트 선택  
   (또는 `.firebaserc`에 이미 `default`가 있으면 생략)

4. **프로덕션 환경 변수**  
   빌드 시 `VITE_*`가 번들에 박입니다.  
   - 로컬/CI: `.env.production` 또는 호스팅 빌드 전 `export`  
   - **비밀 값은 Git에 올리지 말 것**

5. **Auth 승인 도메인**  
   Firebase Console → Authentication → 설정 → **승인된 도메인**에  
   `xxx.web.app`, `xxx.firebaseapp.com`, 커스텀 도메인 추가

---

## 3. 배포 명령 (실전)

```bash
# 프론트만 (Hosting)
npm run deploy:hosting

# Hosting + Cloud Functions 같이
npm run deploy
```

내부적으로는 `npm run build` 후 `firebase deploy --only hosting` (또는 hosting+functions)입니다.

---

## 4. 배포 후 스모크 (5분)

- [ ] `https://<프로젝트>.web.app` (또는 커스텀 도메인) 열림  
- [ ] 로그인 / 로그아웃  
- [ ] `/sports` 허브  
- [ ] 팀·경기·초대 링크 한 경로씩  

---

## 5. Next.js / App Hosting을 쓰고 싶다면

그건 **별 아키텍처**입니다. 이 레포는 **정적 SPA + Firebase 백엔드**로 가는 것이 맞고,  
SSR이 필요해지면 그때 Next 또는 Firebase App Hosting **신규 프로젝트**를 검토하는 편이 안전합니다.

---

## 6. Vercel vs Firebase (한 줄)

- **지금 구조 유지**: Firebase Hosting + 같은 프로젝트의 Auth/Firestore/Functions  
- **프론트만 Vercel**: 가능하지만 Auth 도메인·CORS·환경 변수를 **한 벌 더** 맞춰야 함  

MVP는 **Firebase Hosting 한 곳**이 단순합니다.

---

## 한 줄

```text
npm run deploy:hosting → 전 세계 URL 공개. 배포는 끝이 아니라 검증의 시작.
```
