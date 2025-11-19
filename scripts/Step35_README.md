# Step 35: Forced Alignment - 문장 정밀 싱크

faster-whisper를 사용하여 오디오와 텍스트를 정렬하고, 문장별 타임스탬프를 생성하여 Firestore에 저장하는 파이프라인입니다.

## 설치

```bash
pip install faster-whisper google-cloud-firestore pydub tqdm requests
```

### FFmpeg 설치 (오디오 변환용)

**Windows:**
```powershell
# Chocolatey
choco install ffmpeg

# 또는 Winget
winget install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

## 사용 방법

### 1. 로컬 파일에서 본문 읽기

```bash
python scripts/Step35_ForcedAlignment.py \
  --report-id REPORT_DOC_ID \
  --project-id your-firebase-project \
  --audio-url "https://storage.googleapis.com/.../audio.mp3" \
  --content-file ./report.txt \
  --update-firestore
```

### 2. Firestore에서 본문 가져오기

```bash
python scripts/Step35_ForcedAlignment.py \
  --report-id REPORT_DOC_ID \
  --project-id your-firebase-project \
  --audio-url "https://storage.googleapis.com/.../audio.mp3" \
  --pull-firestore \
  --update-firestore
```

### 3. JSON 파일로만 저장 (Firestore 업데이트 안 함)

```bash
python scripts/Step35_ForcedAlignment.py \
  --report-id REPORT_DOC_ID \
  --audio-url "https://storage.googleapis.com/.../audio.mp3" \
  --content-file ./report.txt \
  --out-json alignment_result.json
```

## 인자 설명

| 인자 | 필수 | 설명 |
|------|------|------|
| `--report-id` | ✅ | 리포트 문서 ID |
| `--audio-url` | ✅ | 오디오 파일 URL |
| `--content-file` | ⚠️ | 리포트 본문 파일 경로 (`--pull-firestore` 미사용 시 필수) |
| `--pull-firestore` | ❌ | Firestore에서 본문 가져오기 |
| `--project-id` | ⚠️ | Firebase 프로젝트 ID (`--pull-firestore` 또는 `--update-firestore` 사용 시 필수) |
| `--update-firestore` | ❌ | 결과를 Firestore에 업데이트 |
| `--out-json` | ❌ | 출력 JSON 파일 경로 (기본: `alignment_result.json`) |
| `--model` | ❌ | Whisper 모델 크기: `tiny`, `base`, `small`, `medium`, `large` (기본: `base`) |

## 작동 원리

1. **문장 분할**: 리포트 본문을 문장 단위로 분할
2. **오디오 다운로드**: URL에서 오디오 파일 다운로드
3. **오디오 변환**: WAV 형식으로 변환 (faster-whisper 호환)
4. **단어 타임스탬프 추출**: faster-whisper로 단어 단위 타임스탬프 추출
5. **문장 정렬**: 그리디 매칭 알고리즘으로 문장과 단어 스트림 매칭
6. **타임스탬프 생성**: 각 문장의 `[start, end]` 시간 생성
7. **Firestore 업데이트**: `reports/{id}.sentenceTimestamps` 필드 업데이트

## 출력 형식

```json
{
  "reportId": "REPORT_DOC_ID",
  "sentenceTimestamps": [
    {
      "text": "첫 번째 문장입니다.",
      "start": 0.0,
      "end": 2.5
    },
    {
      "text": "두 번째 문장입니다.",
      "start": 2.5,
      "end": 5.2
    }
  ]
}
```

## Firestore 구조

업데이트되는 필드:
```javascript
{
  sentenceTimestamps: [
    { text: "문장 1", start: 0.0, end: 2.5 },
    { text: "문장 2", start: 2.5, end: 5.2 }
  ]
}
```

## 주의사항

1. **오디오 품질**: 고품질 오디오일수록 정확한 정렬 결과를 얻을 수 있습니다.
2. **모델 크기**: 더 큰 모델(`medium`, `large`)은 정확도가 높지만 처리 시간이 오래 걸립니다.
3. **인터넷 연결**: 오디오 다운로드와 Firestore 업데이트를 위해 인터넷 연결이 필요합니다.
4. **Firebase 인증**: Firestore 업데이트를 위해 Google Cloud 인증이 필요합니다.

## 문제 해결

### FFmpeg 오류
```bash
# FFmpeg 설치 확인
ffmpeg -version
```

### faster-whisper 모델 다운로드 실패
```bash
# 모델 수동 다운로드 위치 확인
python -c "from faster_whisper import WhisperModel; print(WhisperModel('base').model_path)"
```

### Firestore 인증 오류
```bash
# Google Cloud 인증
gcloud auth application-default login
```

