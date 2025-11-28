# Firebase Storage CORS 설정 가이드

## ⚠️ 중요: 버킷 이름 확인 완료

실제 Storage 버킷 이름: **`yago-vibe-spt.firebasestorage.app`**

코드에서 버킷 이름을 수정했습니다:
- ❌ 이전: `yago-vibe-spt.appspot.com`
- ✅ 수정: `yago-vibe-spt.firebasestorage.app`

## 문제 상황
- Network 탭에서 "Failed to load response data" 및 "No content available for preflight request" 오류 발생
- Firebase Storage 업로드가 0%에서 멈춤

## 원인
1. **버킷 이름 불일치** (해결됨)
2. Firebase Storage 버킷에 CORS 설정이 없거나 잘못 설정되어 있어서 브라우저가 CORS preflight 요청에 실패함

## 해결 방법

### 1. Google Cloud Console에서 CORS 설정 적용 (필수)

1. [Google Cloud Console - Storage](https://console.cloud.google.com/storage/browser/yago-vibe-spt.firebasestorage.app?project=yago-vibe-spt) 접속
2. 버킷 `yago-vibe-spt.firebasestorage.app` 선택 (이미 열려있음)
3. **"Configuration" (구성)** 탭 클릭
4. **"CORS"** 섹션 찾기
5. **"Edit CORS configuration"** 클릭
6. 다음 JSON 붙여넣기:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-*"],
    "maxAgeSeconds": 3600
  }
]
```

7. **"Save"** 클릭

### 2. 또는 gsutil을 사용한 CORS 설정 (명령줄)

```bash
# CORS 설정 적용
gsutil cors set cors.json gs://yago-vibe-spt.firebasestorage.app

# 설정 확인
gsutil cors get gs://yago-vibe-spt.firebasestorage.app
```

### 3. cors.json 파일 내용

프로젝트 루트의 `cors.json` 파일이 다음과 같이 설정되어 있는지 확인:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-*"],
    "maxAgeSeconds": 3600
  }
]
```

## 확인 방법

1. **Google Cloud Console에서 CORS 설정 확인**
   - Storage → Buckets → `yago-vibe-spt.firebasestorage.app` → Configuration → CORS
   - 설정이 저장되었는지 확인

2. **브라우저에서 업로드 재시도**
   - 페이지 새로고침 (Ctrl + Shift + R)
   - 이미지 업로드 시도

3. **Network 탭에서 확인**
   - `firebasestorage.googleapis.com` 요청의 Status가 **200 (OK)**인지 확인
   - Response Headers에 `Access-Control-Allow-Origin: *` 포함 여부 확인
   - Preflight 요청(OPTIONS)이 성공하는지 확인

## 변경 사항 요약

### 버킷 이름 수정
- `src/lib/firebase.ts`에서 `storageBucket`을 `yago-vibe-spt.firebasestorage.app`으로 수정

### CORS 설정 추가
- `OPTIONS` 메서드 추가 (CORS preflight 요청 필수)
- `Authorization` 헤더 추가 (Firebase 인증 토큰용)
- `x-goog-*` 헤더 추가 (Firebase Storage 특수 헤더용)

## 다음 단계

1. ✅ 코드 수정 완료 (`src/lib/firebase.ts`)
2. ⏳ Google Cloud Console에서 CORS 설정 적용 필요
3. ⏳ 브라우저에서 업로드 테스트

CORS 설정 적용 후에도 문제가 계속되면 알려주세요!
