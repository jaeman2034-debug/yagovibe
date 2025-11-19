# 🚀 yagovibe.com 도메인 배포 완전 가이드

## ✅ 1단계: 도메인 선택 완료

**선택된 도메인:** `yagovibe.com` ✅

**선택 이유:**
- ✅ 길이 짧음
- ✅ 브랜드 감성 있음
- ✅ 메인 서비스 이름(YAGO VIBE) 그대로
- ✅ 스포츠 + AI + 중고거래 + 커뮤니티 전부 커버
- ✅ SEO 최적화 (하이픈 없음)
- ✅ 사용자 신뢰도 높음

---

## 🚀 2단계: 가비아 도메인 구매 가이드

### 2-1. 가비아에서 도메인 구매

1. **가비아 접속**
   - https://www.gabia.com 접속
   - 회원가입/로그인

2. **도메인 검색 및 구매**
   - 도메인 검색: `yagovibe.com`
   - 구매 진행
   - 결제 완료

3. **도메인 관리 페이지 접속**
   - 가비아 → 마이페이지 → 도메인 관리
   - `yagovibe.com` 선택

---

### 2-2. 네임서버 확인

**가비아 기본 네임서버:**
```
ns1.gabia.co.kr
ns2.gabia.co.kr
```

**또는 Vercel 네임서버 사용 (권장):**
- Vercel에서 제공하는 네임서버 사용
- 더 빠른 DNS 전파

---

### 2-3. DNS 레코드 설정

**가비아 → 도메인 관리 → DNS 관리**

**추가할 레코드:**

#### A 레코드 (루트 도메인)
```
타입: A
호스트: @ (또는 비워두기)
값: 76.76.21.21
TTL: 3600
```
*Vercel의 IP 주소 (변경될 수 있음, Vercel에서 확인 필요)*

#### CNAME 레코드 (www 서브도메인)
```
타입: CNAME
호스트: www
값: cname.vercel-dns.com
TTL: 3600
```

**또는 Vercel 네임서버 사용 (더 간단):**

#### Vercel 네임서버로 변경
```
네임서버 1: ns1.vercel-dns.com
네임서버 2: ns2.vercel-dns.com
```

**장점:**
- Vercel이 자동으로 DNS 관리
- SSL 인증서 자동 발급
- 더 빠른 전파

---

## 🚀 3단계: Vercel 프로젝트로 도메인 연결

### 3-1. Vercel Dashboard 접속

1. **Vercel 접속**
   - https://vercel.com 접속
   - 로그인

2. **프로젝트 선택**
   - YAGO VIBE 프로젝트 선택
   - Settings → Domains

### 3-2. 도메인 추가

**추가할 도메인:**
1. `yagovibe.com` (루트 도메인)
2. `www.yagovibe.com` (www 서브도메인)

**Vercel에서 자동 처리:**
- ✅ SSL 인증서 자동 발급
- ✅ HTTPS 자동 활성화
- ✅ www → 루트 도메인 리다이렉트 자동 설정

### 3-3. DNS 확인

**Vercel에서 제공하는 DNS 설정:**
- A 레코드 또는 CNAME 레코드
- 가비아 DNS 관리에 추가

**또는 네임서버 변경:**
- 가비아에서 Vercel 네임서버로 변경
- Vercel이 자동으로 DNS 관리

---

## 🚀 4단계: HTTPS 강제 활성화

### 4-1. Vercel 자동 처리

Vercel은 자동으로:
- ✅ SSL 인증서 발급 (Let's Encrypt)
- ✅ HTTPS 강제 리다이렉트
- ✅ HTTP → HTTPS 자동 전환

### 4-2. 확인 방법

**배포 후 확인:**
```
http://yagovibe.com → https://yagovibe.com (자동 리다이렉트)
https://yagovibe.com → 정상 작동
```

---

## 🚀 5단계: Capacitor 앱 도메인 기반 모드로 변경

### 5-1. capacitor.config.ts 수정

**현재 모드:** 로컬 파일 기반 (`webDir: "dist"`)

**변경할 모드:** URL 기반 (도메인 연결)

**장점:**
- ✅ 앱에서 항상 최신 웹 버전 사용
- ✅ 즉시 업데이트 시스템
- ✅ 서버 배포만으로 앱 업데이트

---

## 🚀 6단계: Android/iOS 앱 빌드 재생성

### 6-1. Capacitor 설정 변경 후

1. **빌드 및 복사**
   ```bash
   npm run build
   npx cap copy
   ```

2. **Android Studio에서 재빌드**
   - Build → Make Project
   - Run ▶

### 6-2. 앱 동작

- 웹뷰가 `https://yagovibe.com` 로드
- 항상 최신 버전 사용
- 서버 업데이트 시 앱 자동 반영

---

## 🚀 7단계: PWA 설치 모드 자동 최적화

### 7-1. manifest.json 도메인 반영

- `start_url` 도메인 반영
- `scope` 도메인 반영

### 7-2. Service Worker scope 조정

- 도메인 기반 scope 설정
- 오프라인 캐싱 최적화

---

## 🚀 8단계: 글로벌 실전 배포 테스트

### 8-1. 크로스 브라우저 테스트

- ✅ Chrome
- ✅ Safari
- ✅ Firefox
- ✅ Edge

### 8-2. 디바이스 테스트

- ✅ 모바일 (Android/iOS)
- ✅ 태블릿
- ✅ PC

### 8-3. PWA 설치 테스트

- ✅ Chrome/Edge 설치
- ✅ Safari 설치 (iOS)
- ✅ 홈 화면 추가

### 8-4. SEO 최적화

- ✅ Sitemap 생성
- ✅ robots.txt 설정
- ✅ 메타 태그 최적화

---

## 📋 체크리스트

### 도메인 구매
- [ ] 가비아에서 yagovibe.com 구매
- [ ] 도메인 관리 페이지 접속

### DNS 설정
- [ ] Vercel 네임서버로 변경 또는 DNS 레코드 추가
- [ ] DNS 전파 확인 (최대 24시간, 보통 1-2시간)

### Vercel 연결
- [ ] Vercel 프로젝트에 도메인 추가
- [ ] SSL 인증서 발급 확인
- [ ] HTTPS 작동 확인

### Capacitor 설정
- [ ] capacitor.config.ts 수정
- [ ] 앱 재빌드

### 테스트
- [ ] 웹 브라우저에서 접속 확인
- [ ] PWA 설치 테스트
- [ ] 앱 실행 테스트

---

**다음 단계: 가비아에서 도메인 구매 후 DNS 설정을 진행하세요!**

