# 🎙 Whisper STT 설정 가이드

## ✅ 완료된 작업

1. ✅ `app.json`에 마이크 권한 설정 추가
2. ✅ 오디오 녹음 서비스 구현 (`services/audioRecording.ts`)
3. ✅ Whisper API 호출 유틸리티 생성 (`services/whisperAPI.ts`)
4. ✅ `app/(tabs)/index.tsx`에 마이크 녹음 UI 통합

## 📦 필수 패키지 설치

다음 명령어를 실행하여 필요한 패키지를 설치하세요:

```bash
cd mobileApp
npx expo install expo-av expo-file-system
```

## 🔧 환경 변수 설정 (선택사항)

`.env` 파일 또는 `app.config.js`에 다음 환경 변수를 설정할 수 있습니다:

```env
EXPO_PUBLIC_WHISPER_ENDPOINT=https://handleimageandvoiceanalyze-2q3hdcfwca-du.a.run.app
EXPO_PUBLIC_IMAGE_ANALYZE_URL=https://handleimageandvoiceanalyze-2q3hdcfwca-du.a.run.app
```

기본값으로 Firebase Functions 엔드포인트가 사용됩니다.

## 🚀 사용 방법

1. **앱 실행**
   ```bash
   npx expo start -c
   ```

2. **마이크 권한 승인**
   - 첫 실행 시 마이크 권한 요청 팝업이 표시됩니다.
   - "허용"을 선택하세요.

3. **녹음 시작**
   - "🎤 녹음 시작" 버튼을 탭합니다.
   - 버튼이 빨간색으로 변하고 "🎙️ 녹음 중..."으로 표시됩니다.

4. **녹음 중지**
   - 다시 버튼을 탭하여 녹음을 중지합니다.
   - Whisper API를 통해 음성이 텍스트로 변환됩니다.

5. **결과 확인**
   - 인식된 텍스트가 화면에 표시됩니다.

## 📁 파일 구조

```
mobileApp/
├── app/
│   └── (tabs)/
│       └── index.tsx          # 메인 화면 (녹음 UI 포함)
├── services/
│   ├── audioRecording.ts      # 오디오 녹음 서비스
│   └── whisperAPI.ts          # Whisper API 호출
└── app.json                    # 앱 설정 (마이크 권한 포함)
```

## 🐛 문제 해결

### 마이크 권한 오류
- **증상**: "마이크 권한이 없습니다" 오류
- **해결**: 
  1. 기기 설정 → 앱 → YAGO VIBE → 권한 → 마이크 허용
  2. 앱을 재시작

### 녹음이 시작되지 않음
- **확인**: `expo-av` 패키지가 설치되었는지 확인
- **해결**: `npx expo install expo-av` 실행

### 음성 인식이 작동하지 않음
- **확인**: Firebase Functions 엔드포인트가 올바른지 확인
- **확인**: 네트워크 연결 상태 확인
- **해결**: `.env` 파일에 올바른 엔드포인트 URL 설정

## 🎯 다음 단계

1. **UI 개선**: 녹음 중 시각적 피드백 추가 (애니메이션 등)
2. **실시간 전사**: WebSocket을 통한 실시간 음성 인식
3. **음성 명령 처리**: NLU 통합하여 음성 명령 처리
4. **오디오 최적화**: 녹음 품질 및 형식 최적화
