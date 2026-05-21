# 🚀 PowerShell 배포 가이드 (Windows)

## ⚠️ PowerShell 주의사항

PowerShell에서는 `&&`가 작동하지 않습니다.

**잘못된 명령**:
```powershell
npm run build && firebase deploy --only hosting  # ❌ 오류 발생
```

---

## ✅ 올바른 방법

### 방법 1: 세미콜론 사용 (권장)
```powershell
npm run build; firebase deploy --only hosting
```

### 방법 2: 두 명령을 따로 실행
```powershell
# 1단계: 빌드
npm run build

# 2단계: 배포
firebase deploy --only hosting
```

### 방법 3: PowerShell 7+ 사용 (&& 지원)
```powershell
# PowerShell 7 이상에서는 && 지원
npm run build && firebase deploy --only hosting
```

---

## 🚀 배포 실행 (PowerShell)

### Step 1: 빌드
```powershell
npm run build
```

### Step 2: 배포
```powershell
firebase deploy --only hosting
```

---

## 💡 PowerShell 팁

### 명령 체이닝
```powershell
# 세미콜론 사용
npm run build; firebase deploy --only hosting

# 또는 조건부 실행 (첫 번째 명령 성공 시에만)
if ($?) { firebase deploy --only hosting }
```

### 에러 처리
```powershell
# 빌드 성공 시에만 배포
npm run build
if ($LASTEXITCODE -eq 0) {
    firebase deploy --only hosting
} else {
    Write-Host "빌드 실패. 배포를 중단합니다."
}
```

---

## 📋 배포 체크리스트 (PowerShell)

1. ✅ 프로젝트 루트로 이동
   ```powershell
   cd C:\Users\samsung256g\Desktop\yago-vibe-spt
   ```

2. ✅ 빌드 실행
   ```powershell
   npm run build
   ```

3. ✅ 배포 실행
   ```powershell
   firebase deploy --only hosting
   ```

---

## 🎯 빠른 배포 스크립트

PowerShell 스크립트 파일 생성: `deploy.ps1`

```powershell
# deploy.ps1
Write-Host "🔨 빌드 시작..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 빌드 성공!" -ForegroundColor Green
    Write-Host "🚀 배포 시작..." -ForegroundColor Yellow
    firebase deploy --only hosting
} else {
    Write-Host "❌ 빌드 실패. 배포를 중단합니다." -ForegroundColor Red
    exit 1
}
```

**실행 방법**:
```powershell
.\deploy.ps1
```

---

## ✅ 배포 준비 완료!

PowerShell에서는 세미콜론(`;`)을 사용하거나 명령을 따로 실행하세요! 🚀
