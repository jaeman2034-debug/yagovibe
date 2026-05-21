# 🔍 Identity Toolkit API 추가 후 오류 원인 분석

## 📊 현재 상황

### **문제:**
- ✅ API 제한이 없을 때: 정상 작동
- ❌ Identity Toolkit API 추가 후: 오류 발생

### **현재 API 제한 설정:**
- Maps JavaScript API
- Places API (New)
- Geocoding API
- **Identity Toolkit API** ← 추가 후 오류 발생

---

## 🔍 원인 분석

### **가능한 원인 1: 다른 필수 API 누락**

Firebase Authentication (Google 로그인)을 사용하려면 **Identity Toolkit API 외에도 다른 API가 필요**할 수 있습니다:

#### **필수 API 목록:**
1. ✅ **Identity Toolkit API** (이미 추가됨)
2. ❌ **Google OAuth 2.0 API** (누락 가능성 높음)
3. ❌ **Firebase API** (누락 가능성)
4. ❌ **Google Sign-In API** (누락 가능성)

**Google 로그인을 사용하려면 Google OAuth 2.0 API도 필요합니다!**

---

### **가능한 원인 2: Identity Toolkit API 활성화 상태**

API 제한에 추가했지만, 실제로 **활성화되지 않았을 수 있습니다**:

1. Google Cloud Console → API 및 서비스 → 사용 설정된 API
2. "Identity Toolkit API" 검색
3. **활성화** 상태인지 확인
4. 비활성화되어 있으면 **사용 설정** 클릭

---

### **가능한 원인 3: API 키 제한 설정 자체의 문제**

API 제한을 설정하면, **명시적으로 추가하지 않은 API는 모두 차단**됩니다.

따라서:
- Identity Toolkit API만 추가하면 → 다른 필수 API가 차단됨
- Google OAuth 2.0 API가 필요하지만 추가하지 않으면 → 오류 발생

---

## 🛠️ 해결 방법

### **방법 1: 필수 API 모두 추가 (권장)**

Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → Browser Key:

1. **API 제한사항** → **키 제한** 선택
2. **다음 API 모두 추가:**
   - ✅ Identity Toolkit API (이미 추가됨)
   - ✅ **Google OAuth 2.0 API** (추가 필요!)
   - ✅ Maps JavaScript API (이미 추가됨)
   - ✅ Places API (New) (이미 추가됨)
   - ✅ Geocoding API (이미 추가됨)

3. **저장** 클릭

---

### **방법 2: API 제한 제거 (임시 해결책)**

만약 빠른 해결이 필요하다면:

1. **API 제한사항** → **키 제한 안함** 선택
2. **저장** 클릭

**주의:** 이 방법은 보안상 권장되지 않지만, 테스트 목적으로 사용 가능합니다.

---

### **방법 3: Identity Toolkit API 활성화 확인**

1. Google Cloud Console → API 및 서비스 → 사용 설정된 API
2. "Identity Toolkit API" 검색
3. **활성화** 상태인지 확인
4. 비활성화되어 있으면 **사용 설정** 클릭

---

## 🎯 권장 해결 순서

### **1단계: Identity Toolkit API 활성화 확인**
- Google Cloud Console → API 및 서비스 → 사용 설정된 API
- Identity Toolkit API 활성화 확인

### **2단계: Google OAuth 2.0 API 추가**
- Google Cloud Console → API 및 서비스 → 사용자 인증 정보
- Browser Key 선택
- API 제한사항 → 키 제한
- **Google OAuth 2.0 API 추가**
- 저장

### **3단계: 테스트**
- 브라우저 캐시 삭제 (Ctrl+Shift+R)
- Google 로그인 버튼 클릭
- 오류 해결 확인

---

## 📋 필수 API 체크리스트

### **Firebase Authentication (Google 로그인)에 필요한 API:**

1. ✅ **Identity Toolkit API** (필수)
2. ✅ **Google OAuth 2.0 API** (필수 - Google 로그인용)
3. ⚠️ **Firebase API** (선택적 - Firebase 서비스 전체)
4. ⚠️ **Google Sign-In API** (선택적 - 일부 환경에서 필요)

### **현재 추가된 API:**
- ✅ Maps JavaScript API
- ✅ Places API (New)
- ✅ Geocoding API
- ✅ Identity Toolkit API
- ❌ **Google OAuth 2.0 API** ← **누락!**

---

## 🔍 디버깅 팁

### **브라우저 콘솔에서 확인:**

```javascript
// Firebase 설정 확인
getFirebaseConfig()

// Firebase Auth 객체 확인
getFirebaseAuth()

// API Key 확인
getFirebaseApiKey()
```

### **오류 메시지 확인:**

오류 메시지에 다음이 포함되어 있는지 확인:
- `requests-to-this-api-identitytoolkit`
- `oauth`
- `blocked`
- `invalid-action`

---

## ✅ 최종 결론

**오류 원인:**
1. ❌ **Google OAuth 2.0 API 누락** (가장 유력)
2. ❌ **Identity Toolkit API 미활성화** (가능성)
3. ❌ **다른 필수 API 누락** (가능성)

**해결 방법:**
1. ✅ **Google OAuth 2.0 API 추가** (최우선)
2. ✅ **Identity Toolkit API 활성화 확인**
3. ✅ **필수 API 모두 추가**

**우선순위:**
1. 🔴 **Google OAuth 2.0 API 추가** (최우선)
2. 🟡 **Identity Toolkit API 활성화 확인** (중간)
3. 🟡 **다른 필수 API 확인** (중간)

---

## 📝 다음 단계

1. **Google Cloud Console 접속**
   - API 및 서비스 → 사용자 인증 정보
   - Browser Key 선택

2. **API 제한사항 수정**
   - 키 제한 선택
   - **Google OAuth 2.0 API 추가**
   - 저장

3. **테스트**
   - 브라우저 캐시 삭제
   - Google 로그인 버튼 클릭
   - 오류 해결 확인

