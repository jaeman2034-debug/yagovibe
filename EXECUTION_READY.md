# ✅ Android Studio 실행 준비 완료

## 🔍 사전 확인 완료

### ✅ 프로젝트 구조
- ✅ Android 프로젝트 정상 생성
- ✅ Capacitor 설정 완료
- ✅ MainActivity.java 정상
- ✅ AndroidManifest.xml 정상
- ✅ build.gradle 설정 정상

### ✅ 빌드 설정
- ✅ minSdkVersion: 22
- ✅ targetSdkVersion: 34
- ✅ compileSdkVersion: 34
- ✅ Capacitor 의존성 포함
- ✅ Firebase 의존성 준비 (google-services.json 없어도 빌드 가능)

### ✅ 웹 파일 복사
- ✅ `dist/` → `android/app/src/main/assets/public/` 복사 완료
- ✅ index.html, assets, Service Worker 모두 포함

---

## 🚀 실행 단계

### 1️⃣ Android Studio 열기

```bash
npx cap open android
```

**또는 이미 열려 있다면:** 프로젝트가 로드되어 있는지 확인

---

### 2️⃣ Gradle Sync

**Android Studio 상단에 노란 바가 뜨면:**
- "Sync Now" 클릭 필수

**확인 사항:**
- Capacitor 의존성 로드
- Firebase 의존성 로드
- AndroidManifest 정상
- Gradle 의존성 정상

**예상 시간:** 2-5분

---

### 3️⃣ Build → Make Project

**경로:**
- Android Studio 상단 메뉴 → **Build → Make Project**
- 또는 단축키: `Ctrl+F9` (Windows) / `Cmd+F9` (Mac)

**결과 확인:**
- ✅ **BUILD SUCCESSFUL** → 성공! 다음 단계로 진행
- ❌ **BUILD FAILED** → 오류 내용을 복사해서 알려주세요

**예상 가능한 경고 (정상):**
- `google-services.json not found` → 정상 (푸시 알림만 제한, 앱은 실행됨)

---

### 4️⃣ Run ▶ 실행

**실행 대상 선택:**

#### 📱 Android 실제 장치 (강력 추천)
1. USB로 Android 기기 연결
2. 개발자 모드 켜기
3. USB 디버깅 허용
4. Android Studio에서 기기 선택
5. **Run ▶** 버튼 클릭

**장점:**
- 실제 GPS/카메라/마이크/권한/성능/네트워크 정확히 테스트
- 실제 사용자 환경과 동일

#### 📱 Android Emulator
1. 에뮬레이터 실행 (AVD Manager)
2. Pixel 6 / Pixel 7 선택
3. **Run ▶** 버튼 클릭

**장점:**
- 빠른 테스트
- 다양한 기기 테스트 가능

---

### 5️⃣ 첫 실행에서 확인할 화면

**✅ 성공 상태:**
- Splash 화면 잠깐 (흰색 or 기본 아이콘)
- YAGO VIBE 메인 페이지 로딩
- 주소창 없음 (앱 모드, standalone)
- React UI 정상 구동
- 버튼/스크롤/탭 정상 작동

**❌ 실패 상태:**
- 흰 화면만 뜸
- 크래시 발생
- 에러 메시지 표시
- UI가 깨져서 보임

---

## 🔥 실행 후 결과 보고

아래 중 하나를 알려주세요:

### ✅ "앱 실행됨"
- 화면 정상 뜸
- 기본 기능 작동
- **→ 다음 단계:** Firebase 완전 연동 점검/수정 진행 (옵션 B)

### ❌ "앱 실행했는데 오류남"
- 오류 메시지 복사
- Logcat 로그 확인 (Android Studio 하단 Logcat 탭)
- **→ 다음 단계:** Android Logcat 수준까지 디버깅하고 원인 파악 후 즉시 수정 코드 제공

### ⚠️ "에뮬레이터에서 매우 느림/안됨"
- 에뮬레이터 설정 확인
- **→ 다음 단계:** GPU/ARM 이미지 문제 해결

### ⚠️ "빌드 오류 발생"
- 오류 메시지 전체 복사
- **→ 다음 단계:** 즉시 해결 코드 제공

---

## 🛠️ 예상 문제 및 해결 준비

### 문제 1: Gradle Sync 실패
**원인:** 의존성 다운로드 실패
**해결:** 네트워크 확인, Gradle 캐시 정리

### 문제 2: Build 실패
**원인:** 코드 오류, 의존성 충돌
**해결:** 오류 메시지 기반 즉시 수정

### 문제 3: 앱 크래시
**원인:** 런타임 오류, 권한 문제
**해결:** Logcat 로그 확인 후 수정

### 문제 4: 흰 화면
**원인:** JavaScript 오류, 네트워크 문제
**해결:** Chrome DevTools 연결, 콘솔 확인

---

## 📋 실행 체크리스트

- [ ] Android Studio 열기
- [ ] Gradle Sync 완료
- [ ] Build → Make Project 성공
- [ ] 실행 대상 선택 (실제 기기 또는 에뮬레이터)
- [ ] Run ▶ 버튼 클릭
- [ ] 앱 실행 확인
- [ ] 결과 보고

---

## 🎯 다음 단계

**Android Studio에서 실행 후 결과를 알려주세요:**

1. ✅ **"앱 실행됨"** → 옵션 B 진행 (Firebase 완전 연동)
2. ❌ **"오류 발생"** → 오류 내용 알려주시면 즉시 해결
3. ⚠️ **"느림/문제"** → 설정 확인 및 해결

---

## 💡 팁

### Logcat 확인 방법
1. Android Studio 하단 **Logcat** 탭 클릭
2. 필터: `com.yagovibe.app`
3. 오류 메시지 복사

### Chrome DevTools 연결 (웹뷰 디버깅)
1. Chrome에서 `chrome://inspect` 접속
2. "Inspect" 클릭
3. 콘솔에서 JavaScript 오류 확인

---

**준비 완료! Android Studio에서 실행해보세요!**

실행 결과를 알려주시면 다음 단계를 진행하겠습니다.

