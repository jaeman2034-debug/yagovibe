# 🔧 yagovibe.com ERR_CONNECTION_RESET 오류 해결 가이드

## 📋 문제 상황

- ✅ `www.yagovibe.com` - 정상 작동
- ✅ `yago-vibe-spt.web.app` - 정상 작동
- ❌ `yagovibe.com` - `ERR_CONNECTION_RESET` 오류

## 🔍 DNS 확인 결과

```
nslookup yagovibe.com
이름:    yagovibe.com
Addresses:  199.36.158.100-103 (Firebase Hosting IP)
```

✅ DNS 설정은 정상입니다.

---

## 🚨 가능한 원인

### 1. Firebase Hosting 사이트 연결 문제
루트 도메인(`yagovibe.com`)이 Firebase Hosting 사이트에 제대로 연결되지 않았을 수 있습니다.

### 2. SSL 인증서 문제
`yagovibe.com`의 SSL 인증서가 발급되지 않았거나 만료되었을 수 있습니다.

### 3. 사이트 활성화 문제
`yagovibe.com` 사이트가 비활성화되어 있을 수 있습니다.

---

## ✅ 해결 방법

### Step 1: Firebase Console에서 사이트 확인

1. **Firebase Console** → **Hosting** → **사이트** 클릭
2. **`yagovibe.com` 도메인** 클릭
3. 다음 항목 확인:
   - ✅ **사이트 ID**: `yago-vibe-spt` (또는 다른 사이트 ID)
   - ✅ **연결 상태**: "연결됨" 또는 "활성화됨"
   - ✅ **SSL 인증서**: "활성화됨" (초록색)

### Step 2: 커스텀 도메인 다시 연결 (필요 시)

만약 `yagovibe.com`이 연결되어 있지 않다면:

1. **Firebase Console** → **Hosting** → **사이트** 클릭
2. **`yago-vibe-spt` 사이트** 클릭
3. **커스텀 도메인** 탭 클릭
4. **도메인 추가** 클릭
5. **`yagovibe.com`** 입력
6. Firebase가 제공하는 **TXT 레코드** 확인
7. **DNS 관리자**(가비아)에서 TXT 레코드 추가
8. Firebase가 **SSL 인증서 자동 발급** (최대 15분)

### Step 3: DNS TXT 레코드 확인

**가비아 DNS 관리**에서 확인:

1. **TXT 레코드** 확인:
   - `hosting-site=yago-vibe-spt` (이미 있음)
2. **A 레코드** 확인:
   - `@` → `199.36.158.100-103` (정상)

### Step 4: SSL 인증서 재발급 (필요 시)

만약 SSL 인증서가 문제라면:

1. **Firebase Console** → **Hosting** → **사이트** → **`yagovibe.com`** 클릭
2. **SSL 인증서** 섹션에서:
   - **재발급** 버튼 클릭 (있다면)
   - 또는 **도메인 삭제 후 다시 추가**

---

## 🔍 Firebase Console 확인 체크리스트

### Hosting → 사이트
- [ ] `yago-vibe-spt` 사이트가 존재하는지 확인
- [ ] `yagovibe.com`이 커스텀 도메인으로 연결되어 있는지 확인
- [ ] `www.yagovibe.com`이 커스텀 도메인으로 연결되어 있는지 확인

### `yagovibe.com` 도메인 상태
- [ ] **연결 상태**: "연결됨" 또는 "활성화됨"
- [ ] **SSL 인증서**: "활성화됨" (초록색)
- [ ] **사이트 연결**: `yago-vibe-spt` 사이트에 연결되어 있는지

---

## 🧪 테스트 방법

### 1. Firebase Console에서 확인
1. Firebase Console → Hosting → 사이트
2. `yagovibe.com` 도메인 클릭
3. 상태 확인

### 2. 브라우저에서 테스트
1. **시크릿 모드**에서 `https://yagovibe.com` 접속
2. 오류 메시지 확인:
   - `ERR_CONNECTION_RESET` → SSL 인증서 또는 사이트 연결 문제
   - `404 Not Found` → 사이트 연결 문제
   - `Site Not Found` → 도메인 연결 문제

### 3. curl로 테스트 (터미널)
```bash
curl -I https://yagovibe.com
```

예상 응답:
```
HTTP/2 200
```

---

## 🚨 긴급 해결 방법

만약 Firebase Console에서 `yagovibe.com`이 연결되어 있지 않다면:

### 방법 1: 사이트에 도메인 다시 추가

1. **Firebase Console** → **Hosting** → **사이트** → **`yago-vibe-spt`** 클릭
2. **커스텀 도메인** 탭 → **도메인 추가**
3. **`yagovibe.com`** 입력
4. Firebase가 제공하는 **DNS 설정 가이드** 따르기
5. DNS 레코드 추가 후 **확인** 클릭
6. SSL 인증서 발급 대기 (최대 15분)

### 방법 2: 도메인 삭제 후 재추가

1. **Firebase Console** → **Hosting** → **사이트** → **`yago-vibe-spt`** 클릭
2. **커스텀 도메인** 탭에서 **`yagovibe.com`** 삭제
3. **도메인 추가** 클릭
4. **`yagovibe.com`** 다시 추가
5. DNS 레코드 확인 및 SSL 인증서 재발급 대기

---

## 📋 최종 확인 사항

### Firebase Console
- [ ] `yagovibe.com`이 `yago-vibe-spt` 사이트에 연결되어 있음
- [ ] SSL 인증서가 활성화되어 있음 (초록색)
- [ ] 사이트 상태가 "활성화됨" 또는 "연결됨"

### DNS 설정 (가비아)
- [ ] A 레코드: `@` → `199.36.158.100-103` ✅
- [ ] TXT 레코드: `hosting-site=yago-vibe-spt` ✅

### 테스트
- [ ] `https://yagovibe.com` 접속 성공
- [ ] `https://yagovibe.com/login` 접속 성공

---

## ✅ 완료

**가장 가능성 높은 원인**: Firebase Hosting에서 `yagovibe.com`이 사이트에 제대로 연결되지 않았거나, SSL 인증서가 발급되지 않았을 수 있습니다.

**해결 방법**: Firebase Console에서 `yagovibe.com` 도메인 상태를 확인하고, 필요하다면 다시 연결하세요.

