# 🔍 Identity Toolkit API 추가 원인 분석

## 📊 사용자 질문

**"Identity Toolkit API 혹시 이키 추가 원인이 아니니?"**

---

## 🧠 분석 결과

### **가능성 1: API 제한 설정 충돌 (가능성 높음)**

**시나리오:**
1. 이전: "키 제한 안함" (모든 API 허용)
2. Identity Toolkit API 추가 후: "키 제한" 선택 + Identity Toolkit API만 포함
3. 결과: 다른 필수 API들이 제외되어 오류 발생

**필수 API 목록:**
- ✅ **Identity Toolkit API** (Firebase Authentication 필수)
- ✅ **Google OAuth 2.0 API** (Google 로그인 필수)
- ✅ **Maps JavaScript API** (지도 기능 사용 시)
- ✅ **Geocoding API** (위치 검색 사용 시)
- ✅ **Places API** (장소 검색 사용 시)

**문제:**
- Identity Toolkit API만 추가하고 다른 필수 API를 제외하면 오류 발생 가능
- 특히 **Google OAuth 2.0 API**가 없으면 Google 로그인이 실패할 수 있음

---

### **가능성 2: API 제한 설정 변경 (가능성 중간)**

**시나리오:**
1. 이전: "키 제한 안함" (모든 API 허용)
2. Identity Toolkit API 추가 과정에서 실수로 "키 제한" 선택
3. 결과: 일부 API가 차단되어 오류 발생

**해결:**
- "키 제한 안함"으로 되돌리기
- 또는 "키 제한" 선택 시 모든 필수 API 포함

---

### **가능성 3: Identity Toolkit API 자체 문제 (가능성 낮음)**

**시나리오:**
1. Identity Toolkit API가 활성화되지 않음
2. 또는 API 할당량 초과
3. 결과: 인증 요청 실패

**확인 방법:**
- Google Cloud Console → APIs & Services → Enabled APIs
- Identity Toolkit API가 "Enabled" 상태인지 확인

---

## 🛠️ 해결 방법

### **방법 1: "키 제한 안함" 선택 (권장)**

**가장 안전하고 간단한 방법:**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

2. **Browser Key 선택**

3. **편집 버튼 클릭**

4. **API restrictions 설정**
   - "Don't restrict key" (키 제한 안함) 선택
   - 저장 버튼 클릭

5. **장점:**
   - 모든 API 자동 허용
   - 추가 API 관리 불필요
   - 오류 발생 가능성 최소화

---

### **방법 2: "키 제한" 선택 + 모든 필수 API 포함**

**더 안전하지만 관리 필요:**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

2. **Browser Key 선택**

3. **편집 버튼 클릭**

4. **API restrictions 설정**
   - "Restrict key" 선택
   - 다음 API 모두 체크:
     - ✅ **Identity Toolkit API** (필수)
     - ✅ **Google OAuth 2.0 API** (필수 - Google 로그인)
     - ✅ **Maps JavaScript API** (지도 기능 사용 시)
     - ✅ **Geocoding API** (위치 검색 사용 시)
     - ✅ **Places API (New)** (장소 검색 사용 시)

5. **저장 버튼 클릭**

---

## 📋 현재 문제와의 관계

### **현재 발견된 문제:**
1. ❌ API 키 오타: `AlzaSy` → `AIzaSy` (치명적)
2. ❌ 리퍼러 누락: `http://127.0.0.1:5173/*`

### **Identity Toolkit API 추가의 영향:**
- ✅ **직접적인 원인은 아님** (API 키 오타와 리퍼러 누락이 주원인)
- ⚠️ **하지만 API 제한 설정이 잘못되면 추가 오류 발생 가능**

---

## 🎯 권장 해결 순서

### **1단계: API 제한 설정 확인 (즉시)**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

2. **Browser Key 선택**

3. **API restrictions 확인**
   - "Don't restrict key" 선택 (권장)
   - 또는 "Restrict key" 선택 시 모든 필수 API 포함 확인

---

### **2단계: API 키 오타 수정 (최우선)**

1. **`.env.local` 파일 수정**
   - `AlzaSy` → `AIzaSy` (첫 글자는 `AI`)

---

### **3단계: 리퍼러 추가**

1. **Google Cloud Console → Browser Key → 편집**
2. **웹사이트 제한사항에 추가**
   - `http://127.0.0.1:5173/*` 추가

---

## ✅ 결론

### **Identity Toolkit API 추가 자체는 문제가 아님**

**하지만:**
- ⚠️ API 제한 설정이 잘못되면 추가 오류 발생 가능
- ⚠️ "키 제한" 선택 시 모든 필수 API 포함 필요
- ⚠️ 특히 **Google OAuth 2.0 API**가 없으면 Google 로그인 실패

### **권장 설정:**
- ✅ **"키 제한 안함"** 선택 (가장 안전)
- 또는 **"키 제한"** 선택 시 모든 필수 API 포함

### **현재 문제의 주원인:**
1. ❌ **API 키 오타** (AlzaSy → AIzaSy) - 치명적
2. ❌ **리퍼러 누락** (127.0.0.1:5173) - 직접 원인

**Identity Toolkit API 추가는 부차적인 원인일 수 있지만, 주원인은 아닙니다.**

---

## 💡 추가 확인 사항

### **Google Cloud Console에서 확인:**
1. **APIs & Services → Enabled APIs**
   - Identity Toolkit API: Enabled ✅
   - Google OAuth 2.0 API: Enabled ✅ (필수!)

2. **APIs & Services → Credentials → Browser Key**
   - API restrictions: "Don't restrict key" 또는 모든 필수 API 포함 확인

3. **웹사이트 제한사항**
   - `http://127.0.0.1:5173/*` 포함 확인

---

## 🎯 최종 권장사항

1. ✅ **API 제한 설정을 "키 제한 안함"으로 변경** (가장 안전)
2. ✅ **API 키 오타 수정** (`.env.local` 파일)
3. ✅ **리퍼러 추가** (`http://127.0.0.1:5173/*`)
4. ✅ **5-10분 대기 후 재테스트**

이렇게 하면 Identity Toolkit API 추가로 인한 문제도 해결됩니다!

