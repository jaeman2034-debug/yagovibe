# 🌐 Cloudflare DNS 설정 가이드 (developers.yago.ai)

## 📋 Firebase Hosting용 DNS 설정

### 1. TXT 레코드 (도메인 소유권 인증)
Firebase Console에서 제공한 TXT 레코드를 추가하세요.

**Cloudflare DNS 설정**:
```
타입: TXT
이름: developers
값: [Firebase가 제공한 TXT 값]
TTL: Auto
Proxy 상태: 회색 (DNS Only) ⚠️ 중요!
```

### 2. CNAME 레코드 (Firebase Hosting 연결)
Firebase 인증 완료 후, CNAME 레코드를 추가/수정하세요.

**현재 상태 확인**:
현재 DNS가 CloudFront/Amplify를 가리키고 있다면, Firebase Hosting으로 변경해야 합니다.

**Cloudflare DNS 수정**:
```
타입: CNAME
이름: developers
값: yago-vibe-spt.web.app
TTL: Auto
Proxy 상태: 회색 (DNS Only) ⚠️ 반드시 회색!
```

⚠️ **중요**: 
- Cloudflare Proxy를 **회색(DNS Only)**으로 설정해야 Firebase가 SSL 인증서를 발급할 수 있습니다!
- 노란색(Proxied)으로 설정하면 SSL 발급이 실패합니다!

### 3. DNS 전파 확인
```powershell
# Windows PowerShell
nslookup developers.yago.ai

# 또는 온라인 도구
# https://dnschecker.org/#CNAME/developers.yago.ai
```

---

## 🔄 AWS Amplify/CloudFront를 사용하는 경우

만약 실제로 AWS Amplify를 사용하고 있다면, Firebase Hosting 대신 AWS 설정을 따라야 합니다.

### AWS Amplify SSL 인증서 발급
1. [AWS Amplify Console](https://console.aws.amazon.com/amplify) 접속
2. 앱 선택
3. **Domain management** → **Add domain**
4. `developers.yago.ai` 입력
5. SSL 인증서 자동 발급 대기 (5~10분)

### AWS Certificate Manager (ACM) 사용
1. [ACM Console](https://console.aws.amazon.com/acm) 접속
2. **Request a certificate**
3. 도메인: `developers.yago.ai`
4. DNS 검증 레코드 추가 (Cloudflare)
5. 인증서 발급 후 CloudFront 배포에 연결

---

## ✅ 체크리스트

### Firebase Hosting 사용 시
- [ ] Firebase Console에서 `developers.yago.ai` 커스텀 도메인 추가
- [ ] TXT 인증 레코드 추가 (Cloudflare)
- [ ] CNAME 레코드: `developers` → `yago-vibe-spt.web.app`
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

