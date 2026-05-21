# 🎯 최종 해결 방법 (완전판)

## ❌ 현재 오류

```
auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.projectconfigservice.getprojectconfig-are-blocked
```

## 🔍 핵심 문제점

**단순히 URL을 추가하는 것이 아니라, 다음 단계를 모두 완료해야 합니다:**

1. ✅ "애플리케이션 제한"에서 "웹사이트 (웹 사이트)" 선택 (필수!)
2. ✅ 웹사이트 제한 목록의 체크박스 활성화 확인
3. ✅ **저장 버튼 클릭** (가장 중요!)
4. ✅ 충분한 대기 시간 (15-30분)

## ✅ 최종 해결 방법 (단계별)

### Step 1: Google Cloud Console 접속

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials**

3. **"API keys" 섹션에서 Browser key 찾기**
   - 키 값: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`와 정확히 일치하는 키 찾기

4. **Browser key 클릭 → 편집**

### Step 2: 애플리케이션 제한 활성화 (⚠️ 필수!)

1. **"애플리케이션 제한" (Application restrictions) 섹션 확인**

2. **"웹사이트 (웹 사이트)" 또는 "HTTP referrers (web sites)" 선택**
   - ⚠️ **중요**: 다른 항목이 선택되어 있으면 안 됨:
     - ❌ "없음" (None)
     - ❌ "IP 주소" (IP addresses)
     - ❌ "Android 앱" (Android apps)
     - ❌ "iOS 앱" (iOS apps)
   - ✅ **반드시 "웹사이트 (웹 사이트)" 또는 "HTTP referrers (web sites)" 선택**

3. **선택 후 화면이 업데이트되는지 확인**

### Step 3: 웹사이트 제한 목록 확인 및 추가

1. **"웹사이트 제한" (Website restrictions) 섹션 확인**

2. **다음 도메인 추가 (각각 별도 줄, 앞뒤 공백 없음):**
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```

3. **체크박스 활성화 확인 (⚠️ 중요!)**
   - 각 항목 앞에 체크박스가 **자동으로 선택되어 있는지** 확인
   - ⚠️ **체크박스가 비활성화(빈 박스) 상태라면:**
     - 해당 항목을 삭제
     - 다시 추가하여 활성화되도록 시도
     - 또는 페이지를 새로고침 후 다시 확인

4. **도메인 형식 확인:**
   - ✅ 올바름: `http://localhost:5173/*` (프로토콜 + 포트 + 와일드카드)
   - ❌ 잘못됨: `http://localhost:5173` (와일드카드 없음)
   - ❌ 잘못됨: `localhost:5173/*` (프로토콜 없음)
   - ❌ 잘못됨: `http://localhost:5173/` (와일드카드 없음)

### Step 4: API 제한사항 확인

1. **"API 제한사항" (API restrictions) 섹션 확인**

2. **"키 제한 안함" (Don't restrict key) 선택 (권장)**
   - 또는 "키 제한" (Restrict key) 선택 시:
     - ✅ Identity Toolkit API 포함 확인
     - ✅ Firebase Authentication API 포함 확인

### Step 5: 최종 저장 및 대기 (⚠️ 가장 중요!)

1. **화면 맨 아래 또는 위쪽의 [저장] 또는 [API 키 수정] 버튼 클릭**
   - ⚠️ **중요**: 변경사항을 Google Cloud 서버에 반영하려면 반드시 저장 버튼을 클릭해야 함
   - 저장하지 않으면 변경사항이 적용되지 않음!

2. **저장 확인**
   - 저장 버튼 클릭 후 성공 메시지가 표시되는지 확인
   - 또는 페이지가 업데이트되어 변경사항이 반영되었는지 확인

3. **대기 시간 (⚠️ 매우 중요!)**
   - 저장 후 **최소 15분** (권장 **30분**) 대기
   - Google Cloud 설정이 전 세계적으로 전파되는 데 시간이 필요함
   - ⚠️ **대기 시간 전에 테스트하면 여전히 오류가 발생할 수 있음!**

### Step 6: Firebase Console - Authorized Domains 확인 (보조)

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **Authentication → Settings → Authorized domains**

3. **다음 도메인 확인:**
   - ✅ `localhost` (포트 번호 없이)
   - ✅ `127.0.0.1` (포트 번호 없이)
   - ✅ `yago-vibe-spt.web.app`
   - ✅ `yago-vibe-spt.firebaseapp.com`
   - ✅ `yagovibe.com`
   - ✅ `www.yagovibe.com`

4. **없으면 추가:**
   - "Add domain" 버튼 클릭
   - 도메인 입력 후 "Add" 클릭

### Step 7: Identity Toolkit API 활성화 확인

1. **Google Cloud Console → APIs & Services → Library**

2. **"Identity Toolkit API"** 검색

3. **"사용 설정됨"** 상태인지 확인

4. **활성화되지 않았으면 "사용 설정"** 클릭

### Step 8: 브라우저 캐시 완전 삭제

1. **개발자 도구 (F12) → Application 탭**

2. **Storage** → **Clear site data**

3. **모든 항목 선택:**
   - ✅ Cache storage
   - ✅ Local storage
   - ✅ Session storage
   - ✅ IndexedDB

4. **"Clear site data"** 클릭

5. **하드 리프레시** (Ctrl + Shift + R)

### Step 9: 테스트

1. **시크릿 모드 열기** (Ctrl + Shift + N)

2. **`http://localhost:5173/login`** 접속

3. **Google 로그인 버튼 클릭**

4. **개발자 도구 (F12) → Console 탭에서 오류 확인**

## 📝 핵심 체크리스트

- [ ] Google Cloud Console에서 Browser key 찾기
- [ ] "애플리케이션 제한"에서 "웹사이트 (웹 사이트)" 선택 확인
- [ ] "웹사이트 제한"에 `http://localhost:5173/*` 추가 (정확한 형식)
- [ ] 각 항목의 체크박스가 활성화되어 있는지 확인
- [ ] "API 제한사항"에서 "키 제한 안함" 선택 확인
- [ ] **[저장] 버튼 클릭** (가장 중요!)
- [ ] 저장 후 **30분 이상 대기** (최소 15분)
- [ ] Firebase Console의 Authorized domains 확인
- [ ] Identity Toolkit API 활성화 확인
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트

## ⚠️ 자주 하는 실수

1. **URL만 추가하고 저장하지 않음**
   - ❌ URL을 추가했지만 저장 버튼을 클릭하지 않음
   - ✅ 반드시 저장 버튼을 클릭해야 함!

2. **"애플리케이션 제한"을 선택하지 않음**
   - ❌ "없음" 또는 다른 옵션이 선택되어 있음
   - ✅ 반드시 "웹사이트 (웹 사이트)" 선택

3. **체크박스가 비활성화된 상태로 두기**
   - ❌ 항목을 추가했지만 체크박스가 비활성화되어 있음
   - ✅ 체크박스가 활성화되어 있는지 확인

4. **대기 시간 없이 즉시 테스트**
   - ❌ 저장 후 즉시 테스트
   - ✅ 최소 15분 (권장 30분) 대기 후 테스트

5. **도메인 형식 오류**
   - ❌ `http://localhost:5173` (와일드카드 없음)
   - ❌ `localhost:5173/*` (프로토콜 없음)
   - ✅ `http://localhost:5173/*` (정확한 형식)

## 💡 핵심 포인트

1. **"애플리케이션 제한"에서 "웹사이트 (웹 사이트)" 선택** (필수!)
2. **체크박스 활성화 확인** (중요!)
3. **저장 버튼 클릭** (가장 중요!)
4. **30분 대기** (권장, 최소 15분)
5. **시크릿 모드에서 테스트** (캐시 없이)

이 단계를 정확히 따르면 오류가 해결됩니다!

