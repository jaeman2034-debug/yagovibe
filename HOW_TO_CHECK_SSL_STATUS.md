# 🔍 SSL 인증서 상태 확인 방법

## 방법 1: Firebase Console에서 확인 (권장)

### Step 1: Firebase Console 접속
1. https://console.firebase.google.com 접속
2. 프로젝트 선택: **yago-vibe-spt**

### Step 2: Hosting 메뉴 진입
1. 왼쪽 메뉴에서 **"Hosting"** 클릭
2. 또는 직접: https://console.firebase.google.com/project/yago-vibe-spt/hosting

### Step 3: Custom Domain 상태 확인
1. **"도메인"** 섹션에서 `www.yagovibe.com` 찾기
2. 다음 중 하나:
   - **세로 점 3개(⋮)** 클릭 → **"도메인 세부정보"** 또는 **"Manage"** 선택
   - 또는 **도메인 이름 클릭**

### Step 4: Certificate Status 확인
**표시되는 상태:**
- ✅ **"Certificate: Active"** 또는 **"인증서: 활성"** → 정상!
- ⏳ **"Certificate: Pending"** 또는 **"인증서: 대기 중"** → 발급 중 (5~15분 대기)
- ❌ **"Certificate: Failed"** 또는 **"인증서: 실패"** → DNS 재설정 필요
- ⚠️ **"Certificate: Error"** → 문제 발생, 도메인 재연결 필요

## 방법 2: 브라우저에서 직접 확인

### HTTPS 접속 테스트
1. 브라우저에서 `https://www.yagovibe.com` 접속 시도
2. 브라우저 주소창의 자물쇠 아이콘 확인:
   - ✅ **잠금 아이콘** → SSL 정상 작동
   - ⚠️ **경고 아이콘** 또는 **"연결이 안전하지 않음"** → SSL 문제
   - ❌ **"ERR_CONNECTION_CLOSED"** → 아직 SSL 발급 안 됨

### 개발자 도구로 확인
1. `https://www.yagovibe.com` 접속
2. `F12` → **"Security"** 탭 클릭
3. **"Certificate"** 확인:
   - 발급자: **"Google Trust Services"** 또는 **"Let's Encrypt"**
   - 유효 기간: 확인

## 방법 3: 명령줄로 확인 (고급)

### Windows PowerShell
```powershell
# SSL 인증서 정보 확인
$uri = "https://www.yagovibe.com"
try {
    $request = [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
    $response = Invoke-WebRequest -Uri $uri -Method Head -UseBasicParsing
    Write-Host "✅ SSL 인증서 정상"
} catch {
    Write-Host "❌ SSL 인증서 오류: $_"
}
```

### 간단한 방법
```powershell
# 단순 접속 테스트
Test-NetConnection -ComputerName www.yagovibe.com -Port 443
```

## 📊 상태별 의미

### ✅ Active (활성)
- SSL 인증서 발급 완료
- HTTPS 접속 정상 작동
- **다음 단계**: 접속 테스트 진행

### ⏳ Pending (대기 중)
- SSL 인증서 발급 중
- **대기 시간**: 보통 5~15분
- **확인 주기**: 5분마다 Firebase Console에서 확인
- **다음 단계**: 발급 완료까지 대기

### ❌ Failed (실패)
- SSL 인증서 발급 실패
- **원인**: DNS 설정 문제 (가장 흔함)
- **해결 방법**:
  1. Cloudflare에서 Proxy 상태 확인 (회색이어야 함)
  2. CNAME 레코드 확인
  3. 도메인 재연결 시도

## 🎯 빠른 확인 체크리스트

1. [ ] Firebase Console → Hosting → `www.yagovibe.com` 클릭
2. [ ] Certificate Status 확인
3. [ ] 브라우저에서 `https://www.yagovibe.com` 접속 시도
4. [ ] 주소창 자물쇠 아이콘 확인

## 📝 확인 후 알려주세요

**상태를 알려주시면 다음 단계 안내합니다:**
- "SSL Active" → 접속 테스트로 넘어감
- "SSL Pending" → 대기 안내
- "SSL Failed" → DNS 재설정 가이드 제공

---

**가장 쉬운 방법**: Firebase Console에서 도메인 클릭 → Certificate Status 확인!
