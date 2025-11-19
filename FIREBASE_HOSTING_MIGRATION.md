# 🔄 Firebase Hosting으로 전환 가이드 (developers.yago.ai)

## 현재 상황
- DNS: AWS CloudFront/Amplify를 가리킴 (`13.248.169.48`, `76.223.54.146`)
- SSL: 인증서 없음 (Failed to communicate)
- 목표: Firebase Hosting으로 전환하여 SSL 자동 발급

## 단계별 전환 절차

### 1단계: Firebase Console에서 커스텀 도메인 추가

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt/hosting

2. **커스텀 도메인 추가**
   - "커스텀 도메인 추가" 버튼 클릭
   - 도메인 입력: `developers.yago.ai`
   - "다음" 클릭

3. **도메인 소유권 확인**
   - Firebase가 **TXT 레코드**를 제공합니다
   - 예: `firebase=yago-vibe-spt` 또는 유사한 값

### 2단계: Cloudflare DNS 설정

#### A. TXT 레코드 추가 (도메인 소유권 인증)

**Cloudflare DNS 설정**:
```
타입: TXT
이름: developers
값: [Firebase가 제공한 TXT 값]
TTL: Auto
Proxy 상태: 회색 (DNS Only) ⚠️ 중요!
```

#### B. CNAME 레코드 수정 (Firebase Hosting 연결)

**기존 CNAME 레코드 확인**:
- 현재 값이 AWS를 가리키고 있을 가능성이 높습니다

**Cloudflare DNS 수정**:
```
타입: CNAME
이름: developers
값: yago-vibe-spt.web.app
TTL: Auto
Proxy 상태: 회색 (DNS Only) ⚠️ 반드시 회색!
```

⚠️ **중요**: Cloudflare Proxy를 **회색(DNS Only)**으로 설정해야 Firebase가 SSL 인증서를 발급할 수 있습니다!

### 3단계: Firebase 인증 완료 대기

1. Firebase Console에서 TXT 레코드 확인 상태 확인
2. 인증 완료되면 "인증 완료" 상태로 변경됨
3. 다음 단계로 진행 가능

### 4단계: SSL 인증서 자동 발급

1. Firebase가 **자동으로 SSL 인증서 발급** 시작
2. Firebase Console에서 "인증서 발급 중" 상태 확인
3. 완료까지 **최대 1시간** (보통 15~30분)
4. 완료되면 "활성" 상태로 표시됨

### 5단계: 배포 실행

```bash
# 프로젝트 루트에서
npm run build
firebase deploy --only hosting
```

### 6단계: 확인

1. **DNS 전파 확인** (최대 24시간, 보통 몇 분)
   ```powershell
   nslookup developers.yago.ai
   ```

2. **SSL 인증서 확인**
   - https://www.ssllabs.com/ssltest/analyze.html?d=developers.yago.ai
   - 등급이 A 이상으로 표시되어야 함

3. **브라우저 접속 테스트**
   - https://developers.yago.ai
   - 정상적으로 로드되어야 함

---

## 트러블슈팅

### SSL 인증서가 발급되지 않는 경우

1. **Cloudflare Proxy 확인**
   - 회색(DNS Only)인지 확인
   - 노란색(Proxied)이면 회색으로 변경

2. **TXT 레코드 확인**
   - Cloudflare에 올바르게 추가되었는지 확인
   - DNS 전파 대기 (최대 24시간)

3. **CNAME 레코드 확인**
   - 값이 `yago-vibe-spt.web.app`인지 확인
   - Firebase Hosting 사이트 ID와 일치하는지 확인

4. **Firebase Console 확인**
   - Hosting → 커스텀 도메인 섹션에서 오류 메시지 확인
   - 재시도 버튼 클릭

### DNS 전파가 느린 경우

1. **DNS 캐시 플러시**
   ```powershell
   ipconfig /flushdns
   ```

2. **다른 DNS 서버 사용**
   - Google DNS: `8.8.8.8`
   - Cloudflare DNS: `1.1.1.1`

3. **온라인 DNS 체크 도구 사용**
   - https://dnschecker.org/#CNAME/developers.yago.ai

---

## 체크리스트

- [ ] Firebase Console에서 `developers.yago.ai` 커스텀 도메인 추가
- [ ] TXT 인증 레코드 추가 (Cloudflare)
- [ ] CNAME 레코드 수정: `developers` → `yago-vibe-spt.web.app`
- [ ] Cloudflare Proxy: **회색 (DNS Only)** 확인
- [ ] Firebase 인증 완료 대기
- [ ] SSL 인증서 발급 완료 대기 (최대 1시간)
- [ ] `firebase deploy --only hosting` 실행
- [ ] DNS 전파 확인
- [ ] https://developers.yago.ai 접속 테스트
- [ ] SSL Labs 등급 확인 (A 이상)

---

## 예상 타임라인

- **TXT 레코드 추가**: 5분
- **Firebase 인증 완료**: 5~15분
- **SSL 인증서 발급**: 15분~1시간
- **DNS 전파**: 5분~24시간
- **총 소요 시간**: 약 30분~2시간

