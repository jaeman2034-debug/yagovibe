# 🔧 SSL/Domain 문제 해결 가이드

## 🚨 현재 문제
- `ERR_CONNECTION_CLOSED`: www.yagovibe.com 접속 불가

## 🔍 확인해야 할 사항

### 1️⃣ Firebase Hosting에 Custom Domain 연결 확인

**Firebase Console에서 확인:**
1. https://console.firebase.google.com/project/yago-vibe-spt/hosting
2. **"Custom domains"** 탭 확인
3. `www.yagovibe.com`이 등록되어 있는지 확인

**없으면 추가:**
1. **"Add custom domain"** 클릭
2. `www.yagovibe.com` 입력
3. Firebase가 TXT 레코드 제공 → DNS에 추가
4. SSL 인증서 자동 발급 (최대 15분)

### 2️⃣ DNS 설정 확인 (Cloudflare)

**확인해야 할 레코드:**

```
타입: CNAME
이름: www
값: yago-vibe-spt.web.app (또는 ghs.googlehosted.com)
TTL: Auto
Proxy 상태: 회색 (DNS only) ⚠️ 중요!
```

**⚠️ 중요:**
- Proxy를 **회색(DNS only)**으로 설정해야 함
- 노란색(Proxied)이면 Firebase SSL 발급 실패

### 3️⃣ SSL 인증서 상태 확인

**Firebase Console에서:**
- Hosting → Custom domains → `www.yagovibe.com`
- **"Certificate status"** 확인
  - ✅ **Active**: 정상
  - ⏳ **Pending**: 발급 중 (최대 15분 대기)
  - ❌ **Failed**: DNS 설정 확인 필요

### 4️⃣ 기본 도메인으로 접속 테스트

**먼저 기본 도메인으로 확인:**
- https://yago-vibe-spt.web.app
- https://yago-vibe-spt.firebaseapp.com

**이것도 안 되면:**
- 배포 문제일 수 있음
- `firebase deploy --only hosting` 실행 필요

## 🔧 해결 단계

### Step 1: 기본 도메인 확인
```bash
# 브라우저에서 접속 테스트
https://yago-vibe-spt.web.app
```

### Step 2: Custom Domain 추가 (Firebase Console)
1. Firebase Console → Hosting → Custom domains
2. "Add custom domain" → `www.yagovibe.com`
3. TXT 레코드 추가 (Cloudflare DNS)
4. SSL 발급 대기 (최대 15분)

### Step 3: DNS 설정 확인 (Cloudflare)
- CNAME 레코드 확인
- Proxy 상태: 회색 (DNS only)
- TTL: Auto

### Step 4: 재배포
```bash
npm run build
firebase deploy --only hosting
```

## 📋 체크리스트

- [ ] Firebase Console에서 Custom domain 등록 확인
- [ ] SSL 인증서 상태 확인 (Active/Pending/Failed)
- [ ] Cloudflare DNS CNAME 설정 확인
- [ ] Proxy 상태: 회색 (DNS only) 확인
- [ ] 기본 도메인 (yago-vibe-spt.web.app) 접속 확인
- [ ] 재배포 실행

## 🎯 빠른 진단

**1분 안에 확인:**
1. https://yago-vibe-spt.web.app 접속 → **안 되면 배포 문제**
2. Firebase Console → Hosting → Custom domains 확인 → **없으면 추가 필요**
3. Cloudflare DNS → www CNAME 확인 → **잘못 설정됨**

---

**해결 후**: "SSL active 떴다" → 다음 단계로 진행
