# 🚀 배포 빠른 시작 가이드 (Firebase Hosting)

## ✅ 추천: Firebase Hosting

**이유**:
1. ✅ 이미 Firebase 사용 중 (Firestore, Functions)
2. ✅ 설정이 간단
3. ✅ 무료 티어로 시작 가능
4. ✅ CDN 자동 제공
5. ✅ SSL 자동 설정

---

## 📋 배포 전 체크 (5분)

### 1️⃣ Firestore Rules 확인
```bash
# firestore.rules 파일 확인
cat firestore.rules
```

**현재 상태**: ✅ 이미 설정되어 있음 (상세한 규칙 포함)

---

### 2️⃣ 빌드 테스트
```bash
npm run build
```

**예상 결과**: `dist` 폴더 생성

---

### 3️⃣ Firebase 프로젝트 확인
```bash
firebase projects:list
```

현재 프로젝트 확인

---

## 🚀 배포 실행 (3단계)

### Step 1: Firebase Hosting 초기화 (처음 한 번만)
```bash
firebase init hosting
```

**설정**:
- Public directory: `dist`
- Single-page app: `Yes`
- GitHub 연동: `No` (또는 `Yes`)

---

### Step 2: 빌드
```bash
npm run build
```

---

### Step 3: 배포
```bash
firebase deploy --only hosting
```

---

## ✅ 배포 후 확인

### 1. 사이트 접속
배포 완료 후 제공되는 URL:
```
https://your-project-id.web.app
```

### 2. 기능 테스트
- ✅ 로그인
- ✅ 팀 생성
- ✅ 마이페이지에서 팀 확인

---

## 🔄 다음 배포

이후부터는:
```bash
npm run build
firebase deploy --only hosting
```

---

## 📊 배포 체크리스트

- [ ] `firebase init hosting` 실행 (처음만)
- [ ] `npm run build` 성공
- [ ] `firebase deploy --only hosting` 실행
- [ ] 배포된 사이트 접속 확인
- [ ] 로그인 테스트
- [ ] 팀 생성 테스트
- [ ] 마이페이지 확인

---

## 💡 배포 팁

### 프리뷰 배포
```bash
# 프리뷰 채널에 배포
firebase hosting:channel:deploy preview
```

### 롤백
```bash
# 이전 버전으로 롤백
firebase hosting:rollback
```

---

## 🎯 배포 준비 완료!

**Firebase Hosting으로 배포하면 됩니다!** 🚀
