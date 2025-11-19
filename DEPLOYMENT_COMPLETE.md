# 🎉 yagovibe.com 도메인 배포 완료 가이드

## ✅ 완료된 설정

### 1. 도메인 선택 ✅
- **선택된 도메인:** `yagovibe.com`
- **브랜드 최적화:** 완료

### 2. Capacitor 도메인 기반 모드 ✅
- `capacitor.config.ts` 수정 완료
- 프로덕션: `https://yagovibe.com` 사용
- 앱에서 항상 최신 웹 버전 사용

### 3. Vercel 설정 ✅
- HTTPS 강제 활성화
- www → 루트 도메인 리다이렉트
- 보안 헤더 추가 (HSTS 포함)

### 4. SEO 최적화 ✅
- `robots.txt` 생성
- `sitemap.xml` 생성
- SEO 메타 태그 추가
- Open Graph 태그 추가
- Twitter Card 태그 추가

### 5. PWA 최적화 ✅
- manifest.json 도메인 반영 (vite.config.ts에서 자동)
- Service Worker scope 설정 완료

---

## 🚀 다음 단계: 가비아 도메인 구매 및 DNS 설정

### 단계 1: 가비아에서 도메인 구매

1. **가비아 접속**
   - https://www.gabia.com
   - 회원가입/로그인

2. **도메인 구매**
   - `yagovibe.com` 검색
   - 구매 및 결제

3. **도메인 관리**
   - 마이페이지 → 도메인 관리
   - `yagovibe.com` 선택

---

### 단계 2: Vercel에 도메인 추가

1. **Vercel Dashboard**
   - https://vercel.com
   - YAGO VIBE 프로젝트 선택
   - Settings → Domains

2. **도메인 추가**
   - "Add Domain" 클릭
   - `yagovibe.com` 입력
   - `www.yagovibe.com` 추가 (자동 리다이렉트)

3. **DNS 설정 확인**
   - Vercel이 DNS 레코드 제공
   - 또는 네임서버 정보 제공

---

### 단계 3: 가비아 DNS 설정

**옵션 A: Vercel 네임서버 사용 (권장 ⭐)**

1. **Vercel에서 네임서버 확인**
   - Vercel Dashboard → Domains
   - 네임서버 정보 확인:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```

2. **가비아에서 네임서버 변경**
   - 가비아 → 도메인 관리 → DNS 관리
   - 네임서버 설정:
     ```
     네임서버 1: ns1.vercel-dns.com
     네임서버 2: ns2.vercel-dns.com
     ```
   - 저장

**옵션 B: 가비아 DNS 레코드 직접 설정**

1. **Vercel에서 DNS 레코드 확인**
   - Vercel Dashboard → Domains
   - DNS 레코드 정보 확인

2. **가비아에서 레코드 추가**
   - A 레코드 또는 CNAME 레코드 추가
   - Vercel이 제공한 값 입력

---

### 단계 4: DNS 전파 확인

1. **온라인 도구 사용**
   - https://dnschecker.org
   - `yagovibe.com` 입력
   - 전 세계 DNS 서버에서 확인

2. **전파 시간**
   - 보통 1-2시간
   - 최대 24시간 소요

3. **접속 확인**
   - `https://yagovibe.com` 접속
   - 정상 로드되면 성공

---

### 단계 5: 앱 재빌드 (도메인 기반 모드)

1. **Capacitor 설정 확인**
   - `capacitor.config.ts`에 `server.url` 설정됨
   - 프로덕션에서만 도메인 사용

2. **개발 환경 분리 (선택사항)**

   개발 중에는 로컬 파일 사용:
   ```typescript
   // 개발 환경
   server: {
     url: "http://localhost:5173", // 개발 서버
   }
   
   // 프로덕션 환경
   server: {
     url: "https://yagovibe.com", // 도메인
   }
   ```

3. **앱 재빌드**
   ```bash
   npm run build
   npx cap copy
   npx cap open android
   ```

---

## 📋 배포 체크리스트

### 도메인 구매
- [ ] 가비아에서 yagovibe.com 구매
- [ ] 도메인 관리 페이지 접속

### DNS 설정
- [ ] Vercel에 도메인 추가
- [ ] 가비아에서 DNS 설정 (네임서버 또는 레코드)
- [ ] DNS 전파 확인 (1-2시간 대기)

### Vercel 배포
- [ ] GitHub에 코드 푸시
- [ ] Vercel 자동 배포 확인
- [ ] `https://yagovibe.com` 접속 확인
- [ ] SSL 인증서 발급 확인

### 앱 업데이트
- [ ] Capacitor 설정 확인
- [ ] 앱 재빌드
- [ ] Android Studio에서 실행
- [ ] 도메인 기반 모드 작동 확인

### 테스트
- [ ] 웹 브라우저 접속 테스트
- [ ] PWA 설치 테스트
- [ ] 앱 실행 테스트
- [ ] HTTPS 작동 확인
- [ ] SEO 메타 태그 확인

---

## 🎯 주요 변경 사항

### capacitor.config.ts
```typescript
server: {
  url: "https://yagovibe.com",
  cleartext: false, // HTTPS만 허용
}
```

**효과:**
- ✅ 앱에서 항상 최신 웹 버전 사용
- ✅ 서버 배포만으로 앱 업데이트
- ✅ 즉시 업데이트 시스템 완성

### vercel.json
- ✅ HTTPS 강제 리다이렉트
- ✅ www → 루트 도메인 리다이렉트
- ✅ HSTS 헤더 추가

### SEO 최적화
- ✅ robots.txt
- ✅ sitemap.xml
- ✅ 메타 태그
- ✅ Open Graph
- ✅ Twitter Card

---

## 🎉 완료!

이제 YAGO VIBE는:
- ✅ 커스텀 도메인 (`yagovibe.com`)
- ✅ HTTPS 자동 활성화
- ✅ SEO 최적화
- ✅ PWA 최적화
- ✅ 앱 즉시 업데이트 시스템

**다음 단계: 가비아에서 도메인 구매 후 DNS 설정을 진행하세요!**

