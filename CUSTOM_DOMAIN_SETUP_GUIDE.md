# 🔧 Firebase Hosting 커스텀 도메인 연결 가이드

## 📊 현재 상황

- ✅ `www.yagovibe.com` - 연결됨
- ❌ `yagovibe.com` - 설정 필요 (연결 안 됨)

---

## 🛠️ 해결 방법

### **1단계: Firebase 콘솔에서 도메인 상태 확인**

1. **Firebase 콘솔** → Hosting → 커스텀 도메인
2. `yagovibe.com` 클릭하여 상세 정보 확인
3. **"설정 필요"** 상태의 원인 확인:
   - DNS 설정 필요?
   - SSL 인증서 발급 대기 중?
   - TXT 레코드 인증 필요?

---

### **2단계: DNS 설정 확인**

#### **Cloudflare DNS 설정 확인**

`yagovibe.com`에 다음 DNS 레코드가 필요합니다:

1. **A 레코드 또는 CNAME 레코드**

**옵션 A: A 레코드 사용 (권장)**
```
타입: A
이름: @ (또는 yagovibe.com)
값: Firebase가 제공하는 IP 주소
TTL: Auto
Proxy 상태: DNS only (회색 ☁️)
```

**옵션 B: CNAME 레코드 사용**
```
타입: CNAME
이름: @ (또는 yagovibe.com)
값: yago-vibe-spt.web.app
TTL: Auto
Proxy 상태: DNS only (회색 ☁️)
```

⚠️ **중요**: 
- Cloudflare Proxy를 **반드시 회색(DNS only)**으로 설정
- 노란색(Proxied)으로 설정하면 Firebase SSL 발급이 실패합니다

---

### **3단계: Firebase가 요청한 DNS 레코드 확인**

Firebase 콘솔에서 `yagovibe.com`을 클릭하면 다음 중 하나를 요청할 수 있습니다:

#### **A. TXT 레코드 인증 (도메인 소유권 확인)**
```
타입: TXT
이름: @ (또는 yagovibe.com)
값: Firebase가 제공한 TXT 레코드 값
TTL: Auto
```

#### **B. CNAME 레코드 인증**
```
타입: CNAME
이름: Firebase가 제공한 서브도메인 (예: _firebase-verify.yagovibe.com)
값: Firebase가 제공한 CNAME 값
TTL: Auto
```

---

### **4단계: DNS 레코드 추가 후 확인**

1. Cloudflare에 DNS 레코드 추가
2. DNS 전파 대기 (보통 5-15분)
3. Firebase 콘솔에서 "검증" 또는 "다시 확인" 버튼 클릭

---

### **5단계: SSL 인증서 발급 대기**

1. DNS 인증 완료 후 Firebase가 자동으로 SSL 인증서 발급 시작
2. 발급 시간: **최대 15분~1시간**
3. 상태가 "연결됨"으로 변경될 때까지 대기

---

## 🔍 일반적인 문제 해결

### **문제 1: "DNS 설정 필요" 상태가 계속됨**

**원인:**
- DNS 레코드가 제대로 추가되지 않음
- DNS 전파가 완료되지 않음
- Cloudflare Proxy가 활성화되어 있음

**해결:**
1. Cloudflare에서 Proxy 상태 확인 (회색이어야 함)
2. DNS 레코드 값이 정확한지 확인
3. `nslookup` 또는 `dig` 명령어로 DNS 확인:
   ```bash
   nslookup yagovibe.com
   dig yagovibe.com
   ```

---

### **문제 2: SSL 인증서 발급 실패**

**원인:**
- Cloudflare Proxy가 활성화되어 있음
- DNS 레코드가 올바르지 않음

**해결:**
1. Cloudflare Proxy 비활성화 (회색으로 변경)
2. DNS 레코드 재확인
3. Firebase 콘솔에서 "SSL 인증서 다시 발급" 시도

---

### **문제 3: www는 연결되는데 루트 도메인은 안 됨**

**원인:**
- `www.yagovibe.com`은 서브도메인으로 CNAME 사용 가능
- `yagovibe.com`은 루트 도메인이므로 A 레코드 또는 ALIAS 레코드 필요

**해결:**
1. **Cloudflare의 경우**: A 레코드 또는 CNAME Flattening 사용
   - Cloudflare는 자동으로 CNAME Flattening을 지원하므로 CNAME 레코드 사용 가능
2. **A 레코드 사용**: Firebase가 제공하는 IP 주소로 A 레코드 설정

---

## ✅ 체크리스트

### **DNS 설정 확인**
- [ ] `yagovibe.com`에 올바른 DNS 레코드 추가됨
- [ ] Cloudflare Proxy가 비활성화됨 (회색 ☁️)
- [ ] DNS 전파 완료 (nslookup으로 확인)

### **Firebase 설정 확인**
- [ ] Firebase 콘솔에서 도메인 추가됨
- [ ] TXT/CNAME 레코드 인증 완료
- [ ] SSL 인증서 발급 대기 중 또는 완료

### **테스트**
- [ ] `yagovibe.com` 접속 테스트
- [ ] HTTPS 연결 확인
- [ ] `www.yagovibe.com`과 동일한 콘텐츠 표시 확인

---

## 🚀 빠른 해결 방법

### **방법 1: Firebase 콘솔에서 도메인 다시 설정**

1. Firebase 콘솔 → Hosting → 커스텀 도메인
2. `yagovibe.com` 클릭
3. "도메인 제거" → 다시 추가
4. Firebase가 제공한 DNS 레코드를 Cloudflare에 추가

### **방법 2: DNS 레코드 직접 확인**

Firebase 콘솔에서 요청한 정확한 DNS 레코드를 확인하고 Cloudflare에 추가:

1. Firebase 콘솔에서 `yagovibe.com` 상세 정보 확인
2. 요청된 DNS 레코드 값 복사
3. Cloudflare DNS에 정확히 추가

---

## 📝 참고

- DNS 전파는 보통 **5-15분** 소요
- SSL 인증서 발급은 **최대 1시간** 소요
- Cloudflare Proxy를 비활성화해야 Firebase SSL 발급 가능
- `www.yagovibe.com`이 이미 연결되어 있다면 DNS 설정 경험이 있으므로 동일한 방식으로 진행

