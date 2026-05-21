# 🔧 Firebase API 키 제한 경고 해결 가이드

## 📊 현재 상황 분석

### 발견된 경고 메시지

**출처**: `src/lib/firebase.ts` 123-133줄

```
🔍 [firebase.ts] ⚠️ 이 API 키를 Google Cloud Console에서 찾아서 HTTP 리퍼러 제한을 확인하세요!
🔍 [firebase.ts] ⚠️ 이 키의 HTTP 리퍼러 제한에 다음을 추가 필수:
      - http://localhost:5173/*
      - http://127.0.0.1:5173/*
      - https://yago-vibe-spt.web.app/*
      - https://yago-vibe-spt.firebaseapp.com/*
      - https://yagovibe.com/*
      - https://www.yagovibe.com/*
🔍 [firebase.ts] ⚠️ API 제한사항에서 '키 제한 안함' 또는 'Identity Toolkit API' 포함 확인!
```

### 확인된 API 키

**Firebase Authentication용 Browser key**:
- 키 값: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
- 키 길이: 39자 (정상)
- 용도: Firebase Authentication (Identity Toolkit API)

## 🎯 문제 해결 방법

### 해결책 1: API 키 제한 완전 해제 (권장)

**이 방법은 가장 확실하고 간단합니다.**

#### Step 1: Google Cloud Console 접속

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **Browser key 찾기**
   - "API 키" 섹션에서 "Browser key (auto created by Firebase)" 찾기
   - 키 값이 `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`인지 확인
   - 키 클릭하여 편집 화면으로 이동

#### Step 2: 애플리케이션 제한사항 해제

1. **"애플리케이션 제한사항" 섹션 확인**
   - 현재 설정: "HTTP 리퍼러(웹사이트)" 또는 다른 제한
   
2. **"없음" 선택**
   - "애플리케이션 제한사항" 드롭다운에서 **"없음"** 선택
   - 이렇게 하면 모든 도메인에서 사용 가능

#### Step 3: API 제한사항 해제

1. **"API 제한사항" 섹션 확인**
   - 현재 설정: "키 제한" 또는 특정 API만 허용
   
2. **"키 제한 안 함" 선택**
   - "API 제한사항" 드롭다운에서 **"키 제한 안 함"** 선택
   - 이렇게 하면 모든 API 사용 가능

#### Step 4: 저장

1. **"저장" 버튼 클릭**
   - 화면 하단 또는 상단의 "저장" 버튼 클릭
   - 변경 사항 저장 확인

#### Step 5: 대기 및 테스트

1. **5-10분 대기**
   - Google 서버에 설정이 전파되는 시간
   - 때로는 최대 15분까지 소요될 수 있음

2. **브라우저 캐시 삭제 후 테스트**
   - PC: Ctrl + Shift + Delete
   - 모바일: 브라우저 설정 → 캐시 삭제
   - `https://www.yagovibe.com` 접속하여 로그인 테스트

### 해결책 2: HTTP 리퍼러 제한 유지 (선택적)

**보안을 위해 제한을 유지하고 싶다면 이 방법을 사용하세요.**

#### Step 1: Google Cloud Console 접속

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **Browser key 편집**
   - "Browser key (auto created by Firebase)" 클릭

#### Step 2: HTTP 리퍼러 제한 설정

1. **"애플리케이션 제한사항" 설정**
   - "HTTP 리퍼러(웹사이트)" 선택 (이미 선택되어 있을 수 있음)

2. **"웹사이트 제한사항"에 도메인 추가**

   다음 항목들을 **한 줄씩** 추가:
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```

   **⚠️ 중요 포인트**:
   - 각 항목을 **한 줄씩** 입력
   - `/*` 와일드카드 **반드시** 포함
   - `https://` 또는 `http://` 프로토콜 명시
   - `www.yagovibe.com`과 `yagovibe.com` **둘 다** 추가
   - 앞뒤 공백 없이 입력

#### Step 3: API 제한사항 설정

1. **"API 제한사항" 설정**
   - "키 제한 안 함" 선택 (권장)
   - 또는 "다음 API만 사용" 선택 후:
     - ✅ Identity Toolkit API
     - ✅ Firebase Authentication API
     - ✅ 기타 필요한 API

#### Step 4: 저장 및 대기

1. **"저장" 버튼 클릭**
2. **5-10분 대기**
3. **브라우저 캐시 삭제 후 테스트**

## 📝 체크리스트

### 해결책 1 (제한 완전 해제) - 권장

- [ ] Google Cloud Console 접속
- [ ] Browser key 찾기 (`AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`)
- [ ] 키 편집 화면으로 이동
- [ ] "애플리케이션 제한사항" → "없음" 선택
- [ ] "API 제한사항" → "키 제한 안 함" 선택
- [ ] 저장 버튼 클릭
- [ ] 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] `https://www.yagovibe.com` 테스트
- [ ] 콘솔에서 경고 메시지 사라졌는지 확인

### 해결책 2 (HTTP 리퍼러 제한 유지)

- [ ] Google Cloud Console 접속
- [ ] Browser key 편집
- [ ] "애플리케이션 제한사항" → "HTTP 리퍼러(웹사이트)" 선택
- [ ] `http://localhost:5173/*` 추가
- [ ] `http://127.0.0.1:5173/*` 추가
- [ ] `https://yago-vibe-spt.web.app/*` 추가
- [ ] `https://yago-vibe-spt.firebaseapp.com/*` 추가
- [ ] `https://yagovibe.com/*` 추가
- [ ] `https://www.yagovibe.com/*` 추가
- [ ] "API 제한사항" → "키 제한 안 함" 선택
- [ ] 저장 버튼 클릭
- [ ] 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] 테스트

## 💡 중요 참고사항

### API 키 구분

1. **Browser key (Firebase Authentication용)**
   - 키 값: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
   - 용도: Firebase Authentication (Identity Toolkit API)
   - 이 키의 제한을 해제해야 함

2. **Maps API 키 (Google Maps용)**
   - 키 값: `AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY`
   - 용도: Google Maps JavaScript API
   - 별도로 설정됨 (이미 해결됨)

### 제한 해제의 장단점

**장점**:
- 모든 도메인에서 작동 (개발/프로덕션 모두)
- 경고 메시지 사라짐
- 설정이 간단함

**단점**:
- 보안상 덜 안전함 (다른 도메인에서도 사용 가능)
- 키가 노출되면 악용 가능

**권장사항**:
- 개발 단계에서는 제한 해제 권장
- 프로덕션에서는 HTTP 리퍼러 제한 유지 권장 (해결책 2)

## 🎯 최종 권장 사항

**현재 상황에서는 해결책 1 (제한 완전 해제)을 권장합니다.**

이유:
1. 개발/프로덕션 모두에서 작동 보장
2. 경고 메시지 완전 제거
3. 설정이 간단하고 확실함
4. 모바일 로그인 튕김 문제 해결 가능성 높음

---

**이 가이드를 따라 API 키 제한을 해제하면 경고 메시지가 사라지고 모든 환경에서 정상 작동합니다!** 🎉

