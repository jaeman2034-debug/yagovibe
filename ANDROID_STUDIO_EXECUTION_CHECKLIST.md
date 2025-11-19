# 🚀 Android Studio 실행 체크리스트

## ✅ 실행 전 확인 사항

### 1. Android Studio 열기
```bash
npx cap open android
```

**확인:**
- [ ] Android Studio가 정상적으로 열렸는가?
- [ ] 프로젝트가 자동으로 로드되었는가?

---

### 2. Gradle Sync 확인

**Android Studio 상단에 노란 바가 뜨면:**
- [ ] "Sync Now" 클릭 필수

**확인 사항:**
- [ ] Capacitor 의존성 로드
- [ ] Firebase 의존성 로드
- [ ] AndroidManifest 정상
- [ ] Gradle 의존성 정상

**예상 시간:** 2-5분

---

### 3. Build → Make Project

**경로:**
- Android Studio 상단 메뉴 → Build → Make Project
- 또는 `Ctrl+F9` (Windows) / `Cmd+F9` (Mac)

**결과 확인:**
- ✅ **No errors** → 성공! 다음 단계로 진행
- ❌ **오류 발생** → 오류 내용을 복사해서 알려주세요

**예상 오류 및 해결:**
- `google-services.json not found` → 정상 (푸시 알림만 제한)
- `Gradle sync failed` → 의존성 문제, 해결 가능
- `Manifest error` → 권한 문제, 해결 가능

---

### 4. Run ▶ 실행

**실행 대상 선택:**

#### 📱 Android 실제 장치 (강력 추천)
- USB 연결
- 개발자 모드 켜기
- USB 디버깅 허용
- **장점:** 실제 GPS/카메라/마이크/권한/성능/네트워크 정확히 테스트

#### 📱 Android Emulator
- Pixel 6 / Pixel 7 선택
- **장점:** 빠른 테스트

---

### 5. 첫 실행에서 확인할 화면

**성공 상태:**
- ✅ Splash 화면 잠깐 (흰색 or 기본 아이콘)
- ✅ YAGO VIBE 메인 페이지 로딩
- ✅ 주소창 없음 (앱 모드)
- ✅ React UI 정상 구동
- ✅ 버튼/스크롤/탭 정상 작동

**실패 상태:**
- ❌ 흰 화면만 뜸
- ❌ 크래시 발생
- ❌ 에러 메시지 표시
- ❌ UI가 깨져서 보임

---

## 🔥 실행 후 결과 보고

아래 중 하나를 알려주세요:

### ✅ "앱 실행됨"
- 화면 정상 뜸
- → **다음 단계:** Firebase 완전 연동 점검/수정 진행 (옵션 B)

### ❌ "앱 실행했는데 오류남"
- 오류 메시지 복사
- Logcat 로그 확인
- → **다음 단계:** Android Logcat 수준까지 디버깅하고 원인 파악 후 즉시 수정 코드 제공

### ⚠️ "에뮬레이터에서 매우 느림/안됨"
- 에뮬레이터 설정 확인
- → **다음 단계:** GPU/ARM 이미지 문제 해결

---

## 📋 예상 시나리오

### 시나리오 1: 완벽한 실행 ✅
1. Gradle Sync 성공
2. Build 성공
3. 앱 실행 성공
4. 화면 정상 표시
5. **→ 옵션 B로 이동 (Firebase 완전 연동)**

### 시나리오 2: 빌드 오류 ❌
1. Gradle Sync 실패
2. 또는 Build 실패
3. **→ 오류 내용 알려주시면 즉시 해결**

### 시나리오 3: 실행은 되지만 오류 ❌
1. 앱 실행됨
2. 하지만 크래시 또는 오류 발생
3. **→ Logcat 로그 확인 후 해결**

---

## 🛠️ 문제 해결 준비

제가 준비한 것:
- ✅ Capacitor 설정 확인
- ✅ AndroidManifest 권한 확인
- ✅ Firebase 초기화 코드 확인
- ✅ 빌드 스크립트 확인

**오류 발생 시:**
- 오류 메시지 전체 복사
- Logcat 로그 확인
- → 즉시 해결 코드 제공

---

## 🎯 다음 단계

**Android Studio에서 실행 후 결과를 알려주세요:**

1. ✅ "앱 실행됨" → 옵션 B 진행
2. ❌ "오류 발생" → 오류 내용 알려주시면 해결
3. ⚠️ "느림/문제" → 설정 확인 및 해결

---

**준비 완료! Android Studio에서 실행해보세요!**

