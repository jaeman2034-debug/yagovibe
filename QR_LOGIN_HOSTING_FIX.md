# 🔧 QR 로그인 Firebase Hosting 설정 수정 가이드

## 🔴 문제 진단 결과

### 현재 상태
- ❌ `https://yagovibe.com/qr-login` → **404 에러**
- ❌ Custom Domain에 SPA rewrite 설정이 적용되지 않음

### 원인
- `yagovibe.com` Custom Domain이 Firebase Hosting의 SPA rewrite 설정을 받지 못함
- 또는 Custom Domain이 다른 Hosting site에 연결되어 있음

---

## ✅ 해결 방법

### Step 1: firebase.json 확인 ✅ **완료**

**현재 설정:**
```json
{
  "hosting": {
    "site": "yago-vibe-spt",
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**결과:** ✅ **설정 있음** (정상)

---

### Step 2: Firebase Hosting Custom Domain 확인

**Firebase Console → Hosting → Custom domains**

확인 사항:
- [ ] `yagovibe.com`이 **같은 Hosting site (`yago-vibe-spt`)**에 연결되어 있는지
- [ ] `www.yagovibe.com`도 같은 site에 연결되어 있는지
- [ ] SSL 인증서 상태: **Active** ✅

**만약 다른 site에 연결되어 있다면:**
- Custom Domain을 올바른 site로 재연결 필요

---

### Step 3: Hosting 재배포 (필수)

**명령어:**
```bash
firebase deploy --only hosting
```

**중요:**
- ❌ Functions / Rules 배포 불필요
- ✅ **Hosting만 재배포**

**재배포 후:**
- Custom Domain에 rewrite 설정이 적용됨
- `/qr-login` 경로가 정상 작동

---

### Step 4: 재확인 테스트

#### PC 브라우저 테스트
```
https://yagovibe.com/qr-login?sessionId=test
```

**예상 결과:**
- ✅ 전화번호 로그인 화면 표시
- ❌ 404 에러 (재배포 필요)

#### 모바일 QR 스캔 테스트
1. QR 코드 생성
2. 모바일에서 스캔
3. `yagovibe.com/qr-login?sessionId=xxx`로 열림
4. 전화번호 입력 화면 표시

---

## 🎯 최종 확인 체크리스트

### 즉시 확인 (필수)

1. [ ] `firebase.json`에 `rewrites` 설정 있음 ✅ (확인 완료)
2. [ ] Firebase Console에서 Custom Domain이 같은 site에 연결됨
3. [ ] `firebase deploy --only hosting` 실행
4. [ ] PC 브라우저에서 `https://yagovibe.com/qr-login?sessionId=test` 접속
   - 전화번호 화면 표시 ✅
   - 404 에러 ❌ (재배포 필요)

---

## 🔧 예상 수정 사항

### 케이스 A: Custom Domain이 다른 site에 연결됨

**수정:**
1. Firebase Console → Hosting → Custom domains
2. `yagovibe.com` 삭제
3. 올바른 site (`yago-vibe-spt`)에 다시 연결
4. SSL 인증서 활성화 대기
5. `firebase deploy --only hosting` 재배포

---

### 케이스 B: 같은 site에 연결되어 있지만 rewrite 미적용

**수정:**
1. `firebase deploy --only hosting` 재배포
2. 배포 완료 후 5-10분 대기 (CDN 캐시 갱신)
3. 다시 테스트

---

## 👉 다음 액션

**아래 질문에 답해주세요:**

1. **`firebase.json`에 `rewrites` 설정이 실제로 있나요?**
   - ✅ YES (확인 완료)
   - ❌ NO

2. **`firebase deploy --only hosting`을 방금 다시 했나요?**
   - ✅ YES
   - ❌ NO

3. **Firebase Console에서 Custom Domain이 같은 site에 연결되어 있나요?**
   - ✅ YES
   - ❌ NO (다른 site에 연결됨)

---

**결과를 알려주시면 정확한 수정 지점을 안내하겠습니다.** 🔧
