# 🚀 관리자 페이지 배포 버튼 설정 가이드

관리자 페이지에서 "배포하기" 버튼을 눌러 Vercel 배포를 자동 트리거하는 시스템 설정 가이드입니다.

## 📋 목차

1. [Vercel Deploy Hook 설정](#1-vercel-deploy-hook-설정)
2. [Cloud Functions 환경 변수 설정](#2-cloud-functions-환경-변수-설정)
3. [Firebase Functions 배포](#3-firebase-functions-배포)
4. [관리자 권한 설정](#4-관리자-권한-설정)
5. [사용 방법](#5-사용-방법)

---

## 1️⃣ Vercel Deploy Hook 설정

### 🔧 1-1. Production Deploy Hook 생성

**Vercel Dashboard** → **Project** → **Settings** → **Deploy Hooks**:

1. **"Create Hook"** 클릭
2. **Name**: `deploy-production`
3. **Branch**: `main`
4. **"Create Hook"** 클릭

**Hook URL 예시**:
```
https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx
```

### 🔧 1-2. Preview Deploy Hook 생성

1. **"Create Hook"** 클릭
2. **Name**: `deploy-dev`
3. **Branch**: `dev`
4. **"Create Hook"** 클릭

**Hook URL 예시**:
```
https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy
```

### ⚠️ 중요

**Deploy Hook URL은 절대 프론트엔드에 직접 노출하면 안 됩니다!**
- Cloud Functions를 통해 안전하게 호출해야 합니다.
- 환경 변수 또는 Firebase Functions Config에 저장해야 합니다.

---

## 2️⃣ Cloud Functions 환경 변수 설정

### 🔧 2-1. Firebase Functions Config 사용 (권장)

```bash
# Functions 디렉토리에서 실행
cd functions

# Production Hook URL 설정
firebase functions:config:set vercel.deploy_production="https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx"

# Preview Hook URL 설정
firebase functions:config:set vercel.deploy_dev="https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy"

# 설정 확인
firebase functions:config:get
```

### 🔧 2-2. 환경 변수 사용 (선택)

`.env` 파일 또는 Vercel/Firebase 환경 변수에서:

```bash
VERCEL_DEPLOY_PRODUCTION_HOOK=https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx
VERCEL_DEPLOY_DEV_HOOK=https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy
```

---

## 3️⃣ Firebase Functions 배포

### 🔧 3-1. Functions 배포

```bash
# Functions 디렉토리에서
cd functions

# 의존성 설치
npm install

# 빌드
npm run build

# Functions 배포
firebase deploy --only functions:deployToVercel

# 또는 모든 Functions 배포
firebase deploy --only functions
```

### 🔧 3-2. 배포 확인

```bash
# Functions 목록 확인
firebase functions:list

# Functions 로그 확인
firebase functions:log --only deployToVercel
```

---

## 4️⃣ 관리자 권한 설정

### 🔧 4-1. Firestore users/{uid} 문서에 role 설정

**Firebase Console** → **Firestore** → **users** → `{uid}` 문서:

```json
{
  "uid": "user_uid",
  "email": "admin@example.com",
  "role": "admin"
}
```

### 🔧 4-2. Firebase Auth Custom Claims 설정 (선택)

**Cloud Functions에서 실행**:

```typescript
import { getAuth } from "firebase-admin/auth";

// 관리자 권한 부여
await getAuth().setCustomUserClaims(uid, { role: "admin" });
```

**또는 Firebase Console에서 직접 설정** (Firebase Extensions 사용 가능)

---

## 5️⃣ 사용 방법

### 🚀 5-1. 관리자 페이지 접속

```
/admin
```

### 🚀 5-2. 배포 버튼 사용

1. **"🔄 프로덕션 배포하기"** 버튼 클릭
   - `main` 브랜치 → Production 환경 배포
   - 즉시 라이브 서비스에 반영

2. **"🧪 테스트 서버(dev) 배포하기"** 버튼 클릭
   - `dev` 브랜치 → Preview 환경 배포
   - 테스트 환경에서 확인

### 🚀 5-3. 배포 상태 확인

- **성공 메시지**: 배포가 성공적으로 시작되었습니다
- **실패 메시지**: 오류 원인 표시
- **배포 이력**: 최근 배포 내역 자동 표시

---

## ✅ 체크리스트

### Vercel 설정

- [ ] Production Deploy Hook 생성 완료
- [ ] Preview Deploy Hook 생성 완료
- [ ] Hook URL 복사 완료

### Firebase Functions 설정

- [ ] Deploy Hook URL 환경 변수 설정 완료
- [ ] `deployToVercel` Function 배포 완료
- [ ] Functions 로그 확인 가능

### 관리자 권한

- [ ] Firestore `users/{uid}` 문서에 `role: "admin"` 설정 완료
- [ ] 또는 Firebase Auth Custom Claims 설정 완료

### 테스트

- [ ] 관리자 페이지에서 배포 버튼 표시 확인
- [ ] Preview 배포 테스트 완료
- [ ] Production 배포 테스트 완료 (신중하게!)
- [ ] 배포 이력 표시 확인

---

## 🚨 문제 해결

### 문제: 배포 버튼이 보이지 않음

1. **권한 확인**:
   - Firestore `users/{uid}` 문서에 `role: "admin"` 설정 확인
   - 또는 Firebase Auth Custom Claims 확인

2. **페이지 새로고침**:
   - 브라우저 캐시 문제일 수 있음

### 문제: 배포 실패

1. **Functions 로그 확인**:
   ```bash
   firebase functions:log --only deployToVercel
   ```

2. **Deploy Hook URL 확인**:
   - Vercel Dashboard에서 Hook URL이 올바른지 확인
   - Firebase Functions Config에서 URL 확인

3. **관리자 권한 확인**:
   - Firestore `users/{uid}` 문서 확인
   - Firebase Auth Custom Claims 확인

### 문제: "Deploy Hook URL이 설정되지 않았습니다" 오류

1. **환경 변수 설정 확인**:
   ```bash
   firebase functions:config:get
   ```

2. **환경 변수 재설정**:
   ```bash
   firebase functions:config:set vercel.deploy_production="..."
   firebase functions:config:set vercel.deploy_dev="..."
   ```

3. **Functions 재배포**:
   ```bash
   firebase deploy --only functions:deployToVercel
   ```

---

## 🎉 완료!

이제 관리자 페이지에서 버튼 하나로 Vercel 배포가 가능합니다!

### ✨ 주요 기능

✅ **버튼 한 번 클릭**으로 Production/Preview 배포  
✅ **GitHub/Vercel 사이트 접속 불필요**  
✅ **배포 이력 자동 기록**  
✅ **관리자 권한 확인**  
✅ **성공/실패 메시지 표시**

### 📝 참고사항

- **Production 배포**는 즉시 라이브 서비스에 반영되므로 신중하게 진행하세요.
- 배포 후 Vercel Dashboard에서 배포 상태를 확인할 수 있습니다.
- 배포 이력은 Firestore `deployHistory` 컬렉션에 자동 저장됩니다.

---

**이제 `git push` 없이도 버튼 하나로 배포가 가능합니다! 🚀**

