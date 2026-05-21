# ✅ 환경 변수 확인 방법

> PowerShell에서 직접 실행할 수 없습니다. 아래 방법을 사용하세요.

---

## 🔍 방법 1: .env 파일 확인

```bash
# .env 파일 내용 확인
cat .env

# 또는 PowerShell에서
Get-Content .env
```

**확인할 것:**
- `VITE_AUTH_MODE=PROD` (운영 환경)
- `VITE_AUTH_MODE=DEV` (개발 환경)

---

## 🔍 방법 2: 코드에서 확인

**파일:** `src/lib/firebase.ts` 또는 `src/utils/authPhone.ts`

```typescript
// 개발 환경에서는 console.log로 확인
console.log("현재 모드:", import.meta.env.PROD ? "PROD" : "DEV");
console.log("AUTH_MODE:", import.meta.env.VITE_AUTH_MODE);
```

**실행:**
```bash
npm run dev
# 브라우저 콘솔에서 확인
```

---

## 🔍 방법 3: 빌드 후 확인

```bash
# 빌드
npm run build

# 빌드된 파일에서 확인
# dist 폴더의 파일을 열어서 확인
```

---

## 🔍 방법 4: 환경 변수 직접 확인 (PowerShell)

```powershell
# .env 파일 읽기
Get-Content .env | Select-String "VITE_AUTH_MODE"

# 또는
Get-Content .env
```

---

## ✅ 올바른 배포 전 체크 방법

### 1. .env 파일 확인

```powershell
Get-Content .env
```

**확인할 것:**
```
VITE_AUTH_MODE=PROD
VITE_AUTH_TEST_MODE=false
```

### 2. Firebase 콘솔 확인

1. Firebase Console → Authentication → Sign-in method → Phone
2. 테스트 전화번호 삭제 확인
3. Authorized domains에 실 도메인 추가 확인

### 3. 빌드 테스트

```powershell
npm run build
```

빌드가 성공하면 환경 변수는 정상입니다.

---

## 🚨 주의사항

- `const isProd = import.meta.env.PROD;`는 **코드 파일 안에서만** 사용 가능
- PowerShell에서 직접 실행 불가
- 환경 변수는 빌드 시점에 주입됨

---

## ✅ 빠른 확인 명령어

```powershell
# .env 파일 확인
Get-Content .env

# 빌드 테스트
npm run build
```

이 두 가지로 충분합니다! 🚀
