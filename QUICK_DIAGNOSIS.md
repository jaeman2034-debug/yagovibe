# 🔍 빠른 진단 가이드

## 🚨 현재 상태
- `ERR_CONNECTION_CLOSED` 지속
- "이 사이트에 대한 연결이 안전하지 않습니다" 경고

## ✅ 즉시 확인할 3가지

### 1️⃣ 기본 도메인 접속 테스트 (가장 중요)
브라우저에서 직접 접속:
```
https://yago-vibe-spt.web.app
```

**결과에 따른 진단:**
- ✅ **접속 OK** → 도메인/DNS 문제
- ❌ **접속 안 됨** → 배포 문제 (재배포 필요)

### 2️⃣ SSL 인증서 상태 (Firebase Console)
1. Firebase Console → Hosting → `www.yagovibe.com` 클릭
2. **Certificate Status** 확인:
   - ✅ Active → 정상 (DNS 문제일 가능성)
   - ⏳ Pending → 발급 중 (대기 필요)
   - ❌ Failed → DNS 재설정 필요

### 3️⃣ Cloudflare DNS 설정
Cloudflare Dashboard에서 확인:
- **www** CNAME 레코드:
  - 값: `yago-vibe-spt.web.app` 또는 `ghs.googlehosted.com`
  - Proxy 상태: **회색 (DNS only)** ⚠️ 필수!
  - TTL: Auto

## 🔧 해결 방법

### Case 1: 기본 도메인도 안 됨
**→ 배포 문제**

```bash
# 재배포 실행
npm run build
firebase deploy --only hosting
```

### Case 2: 기본 도메인은 OK, www만 안 됨
**→ DNS/도메인 연결 문제**

1. **Cloudflare 확인:**
   - www CNAME 레코드 존재 확인
   - Proxy 상태: 회색 (DNS only)

2. **Firebase Console 확인:**
   - 도메인 연결 상태
   - SSL 인증서 상태

3. **도메인 재연결:**
   - Firebase Console에서 도메인 제거
   - 재추가 및 TXT 레코드 설정

### Case 3: SSL Pending
**→ 발급 대기 중**

- 최대 15분 대기
- 5분마다 Firebase Console에서 상태 확인

---

## 🎯 지금 바로 할 것

1. **기본 도메인 접속 테스트**
   - `https://yago-vibe-spt.web.app`
   - 결과 알려주세요

2. **SSL 인증서 상태 확인**
   - Firebase Console에서 확인
   - Active/Pending/Failed 알려주세요

이 두 가지 확인 결과로 정확한 해결 방법 제시하겠습니다!
