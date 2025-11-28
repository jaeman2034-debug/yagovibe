# 🔍 커스텀 도메인 Google Maps 오류 디버깅

## ❌ 현재 상황

- ✅ `https://yagovibe.vercel.app/voice-map` - Google Maps 정상 작동
- ❌ `https://www.yagovibe.com/voice-map` - Google Maps 로드 실패

## 🔍 가능한 원인

### 1. Google Cloud Console 도메인 제한 문제 (가장 가능성 높음)

Firebase Browser Key의 "웹사이트 제한사항"에 `www.yagovibe.com`이 추가되지 않았을 수 있습니다.

**확인 방법:**
1. Google Cloud Console → "API 및 서비스" → "사용자 인증 정보"
2. "Browser key (auto created by Firebase)" 클릭
3. "웹사이트 제한사항" 확인
4. `https://www.yagovibe.com/*`이 있는지 확인

**해결 방법:**
- `https://www.yagovibe.com/*` 추가
- `https://yagovibe.com/*` 추가 (www 없이도 접근 가능하도록)

### 2. Vercel 커스텀 도메인 설정 문제

`www.yagovibe.com`이 Vercel에 제대로 연결되어 있지만, 다른 빌드나 환경 변수를 사용하고 있을 수 있습니다.

**확인 방법:**
1. Vercel Dashboard → 프로젝트 → Settings → Domains
2. `www.yagovibe.com`이 Production 환경에 연결되어 있는지 확인
3. 최신 배포가 커스텀 도메인에 적용되었는지 확인

### 3. DNS/CDN 캐시 문제

이전 빌드가 캐시되어 있을 수 있습니다.

**해결 방법:**
1. 브라우저 캐시 완전 삭제
2. Vercel에서 커스텀 도메인 재배포
3. DNS TTL 확인 (최대 24시간 소요 가능)

### 4. 브라우저 콘솔 오류 확인

`www.yagovibe.com`에서 개발자 도구(F12) → Console 탭에서 확인:
- `RefererNotAllowedMapError` - 도메인 제한 문제
- `InvalidKeyMapError` - API 키 문제
- 다른 오류 메시지

## ✅ 즉시 확인할 사항

1. **브라우저 콘솔 오류 확인**
   - `www.yagovibe.com/voice-map` 접속
   - F12 → Console 탭
   - 오류 메시지 확인

2. **Google Cloud Console 도메인 제한 확인**
   - Firebase Browser Key의 "웹사이트 제한사항"에 `www.yagovibe.com` 추가 여부 확인

3. **Vercel 커스텀 도메인 설정 확인**
   - Vercel Dashboard → Settings → Domains
   - `www.yagovibe.com`이 Production에 연결되어 있는지 확인

