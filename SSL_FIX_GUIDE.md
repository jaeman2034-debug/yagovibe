# 🔒 developers.yago.ai SSL 인증서 문제 해결 가이드

## 📍 현재 상태
- ✅ DNS: 정상 (13.248.169.48 / 76.223.54.146)
- ❌ SSL: ERR_SSL_UNRECOGNIZED_NAME_ALERT (인증서 이름 불일치)

## 🔍 원인 분석
IP 주소가 CloudFront/Amplify 대역이지만, 프로젝트는 **Firebase Hosting**을 사용 중입니다.
이는 다음 중 하나일 수 있습니다:
1. DNS가 잘못된 플랫폼을 가리키고 있음
2. Firebase Hosting 커스텀 도메인이 설정되지 않음
3. SSL 인증서가 아직 발급되지 않음

## ✅ 해결 방법 (Firebase Hosting 기준)

### 방법 1: Firebase Hosting에 커스텀 도메인 추가

#### 1단계: Firebase 콘솔에서 도메인 추가
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. **Hosting** 메뉴 클릭
4. **"커스텀 도메인 추가"** 버튼 클릭
5. 도메인 입력: `developers.yago.ai`
6. **"다음"** 클릭

#### 2단계: DNS 인증 (TXT 레코드)
Firebase가 **TXT 레코드**를 요청합니다:
```
예시: yago-vibe-spt.firebaseapp.com
```

**Cloudflare DNS에 추가**:
1. Cloudflare 로그인 → `yago.ai` 도메인 선택
2. **DNS → 레코드 추가**
   - **타입**: `TXT`
   - **이름**: `developers` (또는 Firebase가 지정한 값)
   - **값**: Firebase가 제공한 TXT 값 (예: `firebase=yago-vibe-spt`)
   - **TTL**: Auto
   - **Proxy 상태**: **회색 (DNS Only)** ⚠️ 중요!

#### 3단계: CNAME 레코드 확인/수정
Firebase 인증 완료 후, **CNAME 레코드**가 자동으로 제안됩니다:

**Cloudflare DNS 설정**:
```
타입: CNAME
이름: developers
값: yago-vibe-spt.web.app (또는 Firebase가 지정한 값)
TTL: Auto
Proxy 상태: 회색 (DNS Only) ⚠️ 반드시 회색!
```

⚠️ **중요**: Cloudflare Proxy를 **회색(DNS Only)**으로 설정해야 Firebase가 SSL 인증서를 발급할 수 있습니다!

#### 4단계: SSL 인증서 자동 발급 대기
- Firebase가 **자동으로 SSL 인증서 발급** (최대 15분~1시간)
- Firebase 콘솔에서 "인증서 발급 중" 상태 확인
- 완료되면 "활성"으로 표시됩니다

#### 5단계: 배포 실행
```bash
npm run build
firebase deploy --only hosting
```

---

### 방법 2: AWS Amplify/CloudFront를 사용하는 경우

만약 실제로 AWS Amplify를 사용하고 있다면:

#### AWS Amplify 콘솔
1. [AWS Amplify Console](https://console.aws.amazon.com/amplify) 접속
2. 앱 선택
3. **Domain management** → **Add domain**
4. `developers.yago.ai` 입력
5. SSL 인증서 자동 발급 대기 (보통 5~10분)

#### AWS Certificate Manager (ACM)
1. [ACM Console](https://console.aws.amazon.com/acm) 접속
2. **Request a certificate**
3. 도메인 입력: `developers.yago.ai`
4. DNS 검증 레코드 추가 (Cloudflare)
5. 인증서 발급 후 CloudFront 배포에 연결

---

### 방법 3: DNS 확인 및 수정

현재 DNS가 CloudFront/Amplify를 가리키고 있다면, Firebase Hosting으로 변경:

#### Cloudflare DNS 수정
1. Cloudflare 로그인 → `yago.ai` 도메인
2. **DNS → 레코드 편집**
3. `developers` CNAME 레코드 찾기
4. 값을 다음 중 하나로 변경:
   - `yago-vibe-spt.web.app` (Firebase 기본 도메인)
   - 또는 Firebase가 지정한 커스텀 도메인 값
5. **Proxy 상태**: 회색 (DNS Only)으로 설정
6. 저장

#### DNS 전파 확인
```bash
# Windows PowerShell
nslookup developers.yago.ai

# 또는 온라인 도구 사용
# https://dnschecker.org
```

---

## 🔧 트러블슈팅

### SSL 인증서가 발급되지 않는 경우
1. **Cloudflare Proxy 확인**: 회색(DNS Only)인지 확인
2. **TXT 레코드 확인**: Firebase 인증 레코드가 올바르게 추가되었는지 확인
3. **DNS 전파 대기**: 최대 24시간 소요될 수 있음
4. **Firebase 콘솔 재확인**: Hosting → 커스텀 도메인 상태 확인

### ERR_SSL_UNRECOGNIZED_NAME_ALERT 지속
1. **브라우저 캐시 삭제**: `Ctrl+Shift+Delete`
2. **DNS 캐시 플러시**:
   ```powershell
   ipconfig /flushdns
   ```
3. **다른 브라우저/네트워크에서 테스트**
4. **SSL Labs 테스트**: https://www.ssllabs.com/ssltest/analyze.html?d=developers.yago.ai

### Firebase Hosting이 아닌 경우
프로젝트에 다음 파일이 있는지 확인:
- `vercel.json` → Vercel 사용
- `netlify.toml` → Netlify 사용
- `amplify.yml` → AWS Amplify 사용

해당 플랫폼의 SSL 설정 가이드를 따르세요.

---

## 📋 체크리스트

### Firebase Hosting 사용 시
- [ ] Firebase 콘솔에서 `developers.yago.ai` 커스텀 도메인 추가
- [ ] TXT 인증 레코드 추가 (Cloudflare)
- [ ] CNAME 레코드: `developers` → `yago-vibe-spt.web.app` (또는 Firebase 지정 값)
- [ ] Cloudflare Proxy: **회색 (DNS Only)**
- [ ] SSL 인증서 발급 완료 대기 (최대 1시간)
- [ ] `firebase deploy --only hosting` 실행
- [ ] https://developers.yago.ai 접속 테스트

### AWS Amplify 사용 시
- [ ] Amplify Console에서 도메인 추가
- [ ] SSL 인증서 자동 발급 확인
- [ ] CloudFront 배포에 인증서 연결
- [ ] DNS 전파 대기
- [ ] https://developers.yago.ai 접속 테스트

---

## 🚀 빠른 해결 명령어

```bash
# 1. 빌드
npm run build

# 2. Firebase 로그인 확인
firebase login

# 3. 프로젝트 확인
firebase projects:list

# 4. 현재 프로젝트 확인
firebase use

# 5. 배포
firebase deploy --only hosting

# 6. 커스텀 도메인 상태 확인
firebase hosting:sites:list
```

---

## 📞 다음 단계

1. **Firebase 콘솔**에서 커스텀 도메인 추가 시도
2. **Cloudflare DNS**에서 Proxy 상태 확인 (회색으로)
3. **SSL 인증서 발급 대기** (최대 1시간)
4. 배포 후 **https://developers.yago.ai** 접속 테스트

문제가 지속되면 Firebase 콘솔의 **Hosting → 커스텀 도메인** 섹션에서 오류 메시지를 확인하세요.

