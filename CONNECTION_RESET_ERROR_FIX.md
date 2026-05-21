# 🔧 ERR_CONNECTION_RESET 오류 해결 가이드

## ❌ 현재 문제

### 오류 메시지
```
ERR_CONNECTION_RESET
연결이 다시 설정되었습니다.
```

### 발생 위치
- `https://yagovibe.com/login` 접속 시 발생

---

## 🔍 가능한 원인

### 1. DNS 전파 문제
- DNS 설정 변경 후 전파 시간 소요 (최대 24-48시간)
- 하지만 이미 정상 작동했으므로 이 가능성은 낮음

### 2. Firebase Hosting 배포 문제
- 배포가 완료되지 않았을 수 있음
- 배포 중 오류가 발생했을 수 있음

### 3. SSL 인증서 문제
- 커스텀 도메인의 SSL 인증서 발급 실패
- SSL 인증서 만료

### 4. 네트워크 연결 문제
- 일시적인 네트워크 문제
- 방화벽 또는 프록시 설정 문제

---

## ✅ 해결 방법

### Step 1: Firebase 기본 도메인 확인

먼저 Firebase의 기본 도메인에서 접속이 되는지 확인:

1. **기본 도메인 접속 테스트**:
   - `https://yago-vibe-spt.web.app/login`
   - `https://yago-vibe-spt.firebaseapp.com/login`

2. **결과 확인**:
   - ✅ 기본 도메인에서 접속되면 → 커스텀 도메인 문제
   - ❌ 기본 도메인에서도 접속 안 되면 → Firebase Hosting 배포 문제

---

### Step 2: Firebase Console 확인

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/hosting
   ```

2. **배포 기록 확인**
   - 최신 배포가 완료되었는지 확인
   - 배포 상태가 "성공"인지 확인
   - 배포 시간 확인

3. **커스텀 도메인 확인**
   - `yagovibe.com`이 기본 사이트에 연결되어 있는지 확인
   - SSL 인증서 상태 확인
   - "인증서 발급 중" 또는 "활성" 상태여야 함

---

### Step 3: DNS 설정 확인

1. **가비아 DNS 설정 확인**
   - A 레코드가 Firebase Hosting IP로 올바르게 설정되어 있는지 확인
   - TXT 레코드가 올바르게 설정되어 있는지 확인

2. **DNS 전파 확인**
   ```
   # 명령 프롬프트에서 확인
   nslookup yagovibe.com
   ```

---

### Step 4: 네트워크 문제 해결

1. **다른 네트워크에서 테스트**
   - 모바일 데이터 사용
   - 다른 Wi-Fi 네트워크 사용

2. **다른 브라우저에서 테스트**
   - Chrome
   - Edge
   - Firefox

3. **방화벽/프록시 확인**
   - 회사 네트워크나 VPN 사용 중이면 비활성화 후 테스트

---

### Step 5: Firebase Hosting 재배포

문제가 계속되면 재배포:

```bash
# 빌드 확인
npm run build

# 재배포
firebase deploy --only hosting
```

---

## 📋 체크리스트

### 즉시 확인
- [ ] `https://yago-vibe-spt.web.app/login` 접속 테스트
- [ ] `https://yago-vibe-spt.firebaseapp.com/login` 접속 테스트
- [ ] Firebase Console → Hosting → 배포 기록 확인
- [ ] Firebase Console → Hosting → 커스텀 도메인 SSL 상태 확인

### DNS 확인
- [ ] 가비아 DNS 설정 확인
- [ ] `nslookup yagovibe.com` 실행하여 IP 확인

### 네트워크 확인
- [ ] 다른 네트워크에서 테스트
- [ ] 다른 브라우저에서 테스트
- [ ] VPN/프록시 비활성화 후 테스트

### 재배포 (필요 시)
- [ ] `npm run build` 실행
- [ ] `firebase deploy --only hosting` 실행
- [ ] 배포 완료 확인

---

## ✅ 완료

먼저 Firebase 기본 도메인(`https://yago-vibe-spt.web.app/login`)에서 접속이 되는지 확인하세요.

- ✅ 기본 도메인에서 접속되면 → 커스텀 도메인 문제 (DNS/SSL 확인)
- ❌ 기본 도메인에서도 접속 안 되면 → Firebase Hosting 배포 문제 (재배포 필요)

