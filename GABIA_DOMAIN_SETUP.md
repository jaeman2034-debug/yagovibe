# 🛒 가비아 도메인 구매 및 설정 가이드

## 1️⃣ 가비아 도메인 구매

### 단계별 가이드

1. **가비아 접속**
   - https://www.gabia.com
   - 회원가입/로그인

2. **도메인 검색**
   - 검색창에 `yagovibe.com` 입력
   - 검색 결과 확인

3. **도메인 구매**
   - 구매 버튼 클릭
   - 결제 진행
   - 구매 완료

4. **도메인 관리 페이지**
   - 마이페이지 → 도메인 관리
   - `yagovibe.com` 선택

---

## 2️⃣ DNS 설정 방법 (2가지 옵션)

### 옵션 A: Vercel 네임서버 사용 (권장 ⭐)

**장점:**
- ✅ Vercel이 자동으로 DNS 관리
- ✅ SSL 인증서 자동 발급
- ✅ 더 빠른 전파
- ✅ 설정 간단

**설정 방법:**

1. **Vercel에서 네임서버 확인**
   - Vercel Dashboard → Project → Settings → Domains
   - `yagovibe.com` 추가
   - Vercel이 네임서버 제공:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```

2. **가비아에서 네임서버 변경**
   - 가비아 → 도메인 관리 → DNS 관리
   - 네임서버 설정
   - Vercel 네임서버 입력:
     ```
     네임서버 1: ns1.vercel-dns.com
     네임서버 2: ns2.vercel-dns.com
     ```
   - 저장

3. **전파 대기**
   - 보통 1-2시간 (최대 24시간)
   - 전파 확인: https://dnschecker.org

---

### 옵션 B: 가비아 DNS 레코드 직접 설정

**설정 방법:**

1. **Vercel에서 DNS 정보 확인**
   - Vercel Dashboard → Project → Settings → Domains
   - `yagovibe.com` 추가
   - DNS 레코드 정보 확인

2. **가비아에서 DNS 레코드 추가**
   - 가비아 → 도메인 관리 → DNS 관리
   - 레코드 추가:

   **A 레코드 (루트 도메인):**
   ```
   타입: A
   호스트: @
   값: 76.76.21.21 (Vercel IP, 변경될 수 있음)
   TTL: 3600
   ```

   **CNAME 레코드 (www):**
   ```
   타입: CNAME
   호스트: www
   값: cname.vercel-dns.com
   TTL: 3600
   ```

3. **전파 대기**
   - 보통 1-2시간 (최대 24시간)

---

## 3️⃣ Vercel 도메인 연결

### 단계별 가이드

1. **Vercel Dashboard 접속**
   - https://vercel.com
   - 로그인

2. **프로젝트 선택**
   - YAGO VIBE 프로젝트 선택
   - Settings → Domains

3. **도메인 추가**
   - "Add Domain" 클릭
   - `yagovibe.com` 입력
   - "Add" 클릭

4. **www 서브도메인 추가**
   - `www.yagovibe.com` 추가
   - Vercel이 자동으로 루트 도메인으로 리다이렉트

5. **SSL 인증서 확인**
   - Vercel이 자동으로 SSL 발급
   - 상태: "Valid" 확인

---

## 4️⃣ DNS 전파 확인

### 확인 방법

1. **온라인 도구 사용**
   - https://dnschecker.org
   - `yagovibe.com` 입력
   - 전 세계 DNS 서버에서 확인

2. **터미널에서 확인**
   ```bash
   nslookup yagovibe.com
   ```

3. **브라우저에서 확인**
   - `https://yagovibe.com` 접속
   - 정상 로드되면 성공

---

## 5️⃣ 완료 확인

### 체크리스트

- [ ] 가비아에서 도메인 구매 완료
- [ ] DNS 설정 완료 (네임서버 또는 레코드)
- [ ] Vercel에 도메인 추가 완료
- [ ] SSL 인증서 발급 확인
- [ ] DNS 전파 확인 (1-2시간 대기)
- [ ] `https://yagovibe.com` 접속 확인
- [ ] `https://www.yagovibe.com` → `https://yagovibe.com` 리다이렉트 확인

---

## ⚠️ 주의사항

1. **DNS 전파 시간**
   - 보통 1-2시간
   - 최대 24시간 소요 가능
   - 전파 완료 전까지 접속 불가

2. **SSL 인증서**
   - Vercel이 자동 발급
   - 발급까지 몇 분 소요

3. **www 리다이렉트**
   - Vercel이 자동 설정
   - `www.yagovibe.com` → `yagovibe.com`

---

**다음 단계: DNS 설정 완료 후 Capacitor 설정을 변경하세요!**

