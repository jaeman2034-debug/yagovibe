# ☁️ AWS CloudFront/Amplify SSL 설정 가이드 (developers.yago.ai)

## 현재 상황
- DNS: AWS CloudFront/Amplify를 가리킴 (`13.248.169.48`, `76.223.54.146`)
- 호스트네임: `a904c694c05102f30.awsglobalaccelerator.com`
- SSL: 인증서 없음 (Failed to communicate)

## 옵션 2: AWS에서 SSL 인증서 설정 (현재 플랫폼 유지)

### 방법 A: AWS Amplify 사용 시

#### 1단계: Amplify Console에서 도메인 추가

1. **AWS Amplify Console 접속**
   - https://console.aws.amazon.com/amplify

2. **앱 선택**
   - `developers.yago.ai`를 배포한 앱 선택

3. **Domain management**
   - 좌측 메뉴 → **Domain management** 클릭
   - **Add domain** 버튼 클릭

4. **도메인 입력**
   - `developers.yago.ai` 입력
   - **Configure domain** 클릭

5. **SSL 인증서 자동 발급**
   - AWS가 자동으로 SSL 인증서 발급 (ACM 사용)
   - 완료까지 **5~10분**

6. **DNS 레코드 확인**
   - Amplify가 제공하는 CNAME 레코드 확인
   - Cloudflare DNS에 이미 설정되어 있는지 확인

---

### 방법 B: AWS CloudFront 사용 시

#### 1단계: AWS Certificate Manager (ACM)에서 인증서 요청

1. **ACM Console 접속**
   - https://console.aws.amazon.com/acm

2. **인증서 요청**
   - **Request a certificate** 클릭
   - **Request a public certificate** 선택
   - **Next** 클릭

3. **도메인 입력**
   - **Fully qualified domain name**: `developers.yago.ai`
   - **Validation method**: DNS validation 선택
   - **Request** 클릭

4. **DNS 검증 레코드 추가**
   - ACM이 **CNAME 레코드**를 제공합니다
   - Cloudflare DNS에 추가:
     ```
     타입: CNAME
     이름: [ACM이 제공한 이름]
     값: [ACM이 제공한 값]
     TTL: Auto
     Proxy 상태: 회색 (DNS Only)
     ```

5. **인증서 발급 완료 대기**
   - "Pending validation" → "Issued" 상태로 변경
   - 완료까지 **5~10분**

#### 2단계: CloudFront 배포에 인증서 연결

1. **CloudFront Console 접속**
   - https://console.aws.amazon.com/cloudfront

2. **배포 선택**
   - `developers.yago.ai`를 가리키는 배포 선택

3. **설정 편집**
   - **Edit** 클릭
   - **Alternate domain names (CNAMEs)** 섹션:
     - `developers.yago.ai` 추가

4. **SSL 인증서 선택**
   - **Custom SSL certificate**: ACM에서 발급한 인증서 선택
   - **Security policy**: 최신 버전 선택 (예: TLSv1.2_2021)

5. **변경사항 저장**
   - **Save changes** 클릭

6. **배포 전파 대기**
   - CloudFront 배포 완료까지 **15~30분**

---

## 트러블슈팅

### SSL 인증서가 발급되지 않는 경우

1. **DNS 검증 레코드 확인**
   - Cloudflare에 올바르게 추가되었는지 확인
   - DNS 전파 대기 (최대 24시간)

2. **ACM 상태 확인**
   - ACM Console에서 인증서 상태 확인
   - "Pending validation"이면 DNS 레코드 재확인

3. **CloudFront 설정 확인**
   - Alternate domain name에 올바른 도메인 입력 확인
   - SSL 인증서가 올바르게 연결되었는지 확인

### CloudFront 배포가 완료되지 않는 경우

1. **배포 상태 확인**
   - CloudFront Console에서 배포 진행 상태 확인
   - "In Progress" → "Deployed" 상태로 변경 대기

2. **캐시 무효화**
   - 필요 시 **Invalidations**에서 모든 경로(`/*`) 무효화

---

## 체크리스트

### AWS Amplify 사용 시
- [ ] Amplify Console에서 도메인 추가
- [ ] SSL 인증서 자동 발급 확인
- [ ] DNS 레코드 확인
- [ ] https://developers.yago.ai 접속 테스트
- [ ] SSL Labs 등급 확인

### AWS CloudFront 사용 시
- [ ] ACM에서 SSL 인증서 요청
- [ ] DNS 검증 레코드 추가 (Cloudflare)
- [ ] 인증서 발급 완료 대기
- [ ] CloudFront 배포에 인증서 연결
- [ ] Alternate domain name 설정
- [ ] 배포 전파 대기 (15~30분)
- [ ] https://developers.yago.ai 접속 테스트
- [ ] SSL Labs 등급 확인

---

## 예상 타임라인

- **ACM 인증서 요청**: 5분
- **DNS 검증 완료**: 5~10분
- **인증서 발급**: 5~10분
- **CloudFront 배포**: 15~30분
- **총 소요 시간**: 약 30분~1시간

---

## 참고사항

- AWS Amplify는 자동으로 SSL 인증서를 발급하므로 더 간단합니다
- CloudFront는 수동으로 ACM 인증서를 연결해야 합니다
- 두 방법 모두 DNS 전파를 기다려야 합니다 (최대 24시간, 보통 몇 분)

