# 🔧 ADB PATH 설정 가이드 (Windows)

## ✅ 현재 상태 확인

- **ADB 위치**: `C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools`
- **파일 존재**: `adb.exe`, `fastboot.exe` 확인 완료
- **문제**: PATH 환경변수 미등록

## 🎯 해결 방법

### 1️⃣ Windows PATH 환경변수 추가

#### 방법 A: GUI로 추가 (권장)

1. **시스템 속성 열기**
   - `Win + R` → `sysdm.cpl` 입력 → Enter
   - 또는: 제어판 → 시스템 → 고급 시스템 설정

2. **환경 변수 열기**
   - "고급" 탭 → "환경 변수" 버튼 클릭

3. **PATH 수정**
   - "시스템 변수" 섹션에서 `Path` 선택
   - "편집" 버튼 클릭
   - "새로 만들기" 클릭
   - 다음 경로 추가:
     ```
     C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools
     ```
   - "확인" 클릭 (모든 창)

#### 방법 B: PowerShell로 추가 (관리자 권한 필요)

```powershell
# 관리자 권한 PowerShell에서 실행
$adbPath = "C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$adbPath", "User")
```

### 2️⃣ PowerShell에서 PATH 반영

#### 새 PowerShell 창 열기

환경변수 변경 후 **반드시 새 PowerShell 창**을 열어야 합니다.

또는 현재 세션에서:

```powershell
# 현재 세션에만 반영 (임시)
$env:Path += ";C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools"
```

#### VS Code 터미널 새로고침

1. VS Code 터미널 완전히 닫기
2. VS Code 재시작
3. 새 터미널 열기

### 3️⃣ ADB 직접 실행 테스트

#### 방법 A: 전체 경로로 실행

```powershell
C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools\adb.exe version
```

#### 방법 B: 현재 디렉토리에서 실행

```powershell
cd C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools
.\adb.exe version
```

#### 방법 C: PATH 등록 후 실행

```powershell
# 새 PowerShell 창에서
adb version
```

**예상 출력**:
```
Android Debug Bridge version 1.0.41
Version 34.0.5-10900879
```

### 4️⃣ USB 디버깅 설정 체크리스트

#### 안드로이드 기기 설정

1. **개발자 옵션 활성화**
   - 설정 → 휴대전화 정보 → 빌드 번호 7번 연속 탭

2. **USB 디버깅 활성화**
   - 설정 → 개발자 옵션 → USB 디버깅 ON

3. **USB 연결 모드**
   - USB 연결 시 "파일 전송" 또는 "MTP" 모드 선택

4. **컴퓨터 인증**
   - USB 연결 후 "이 컴퓨터를 항상 허용" 체크 → 확인

#### PC에서 확인

```powershell
# USB 연결 후
adb devices
```

**정상 출력**:
```
List of devices attached
ABC123XYZ    device
```

**문제 해결**:
- `unauthorized`: 기기에서 "USB 디버깅 허용" 확인
- `offline`: USB 케이블 교체 또는 USB 포트 변경
- 아무것도 안 나옴: USB 드라이버 설치 필요

### 5️⃣ Expo + 실제 안드로이드 기기 실행

#### 준비

1. **USB 디버깅 확인**
   ```powershell
   adb devices
   ```
   - 기기가 `device` 상태로 표시되어야 함

2. **웹 서버 실행** (프로젝트 루트)
   ```bash
   npm run dev
   ```

3. **Expo 실행** (mobileApp 폴더)
   ```bash
   cd mobileApp
   npx expo start
   ```

#### USB 연결 기기로 실행

```bash
# Expo 실행 중
# 터미널에서 'a' 키 누르기 (Android)
# 또는
npx expo start --android
```

**자동으로**:
- USB 연결된 기기 감지
- APK 빌드 및 설치
- 앱 실행

#### 수동 실행 (필요시)

```bash
# Expo 서버만 실행
npx expo start

# 별도 터미널에서
adb install -r <expo-build-apk-path>
```

## 🔍 문제 해결

### ❌ "adb is not recognized"

1. PATH 환경변수 확인
   ```powershell
   $env:Path -split ';' | Select-String "platform-tools"
   ```

2. 새 PowerShell 창 열기

3. 전체 경로로 테스트
   ```powershell
   C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools\adb.exe version
   ```

### ❌ "no devices/emulators found"

1. USB 디버깅 확인
   - 기기: 설정 → 개발자 옵션 → USB 디버깅 ON

2. USB 드라이버 설치
   - 기기 제조사 USB 드라이버 설치
   - 또는: [Universal ADB Driver](https://adb.clockworkmod.com/)

3. USB 케이블 확인
   - 데이터 전송 가능한 케이블 사용 (충전 전용 케이블 X)

### ❌ Expo가 기기를 못 찾음

1. ADB 연결 확인
   ```powershell
   adb devices
   ```

2. Expo 재시작
   ```bash
   # Ctrl+C로 중지 후
   npx expo start --clear
   ```

3. Wi-Fi 디버깅 (대안)
   - 기기와 PC가 같은 Wi-Fi
   - `adb tcpip 5555`
   - `adb connect <기기-IP>:5555`

## ✅ 최종 확인

다음 명령어들이 모두 정상 작동해야 합니다:

```powershell
# 1. ADB 버전 확인
adb version

# 2. 연결된 기기 확인
adb devices

# 3. Expo 실행
cd mobileApp
npx expo start --android
```

## 🎯 목표 달성

- ✅ USB 연결된 실기기에서 Expo 앱 실행
- ✅ WebView 기반 로컬 웹앱을 모바일 앱처럼 실전 테스트

