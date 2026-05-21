# 🔑 Firebase Functions OpenAI API Key 설정 가이드

## 🚨 문제 원인

Firebase Functions 배포 실패의 원인은 **OpenAI API Key 환경 변수 누락**입니다.

### 오류 메시지
```
Error: User code failed to load. Cannot determine backend specification. Timeout after 10000ms
```

### 근본 원인
- Functions 코드가 `process.env.OPENAI_API_KEY`를 요구
- Firebase Functions 환경 변수에 `OPENAI_API_KEY`가 설정되지 않음
- Functions 초기화 중 무한 대기 → 타임아웃 발생

## ✅ 해결 방법

### 방법 1: Firebase CLI로 설정 (권장)

#### Step 1: OpenAI API Key 확인
- OpenAI 계정에서 API Key 확인
- 또는 `.env.local` 파일에서 `VITE_OPENAI_API_KEY` 확인

#### Step 2: Firebase Functions 환경 변수 설정
```bash
# Firebase CLI로 환경 변수 설정
firebase functions:secrets:set OPENAI_API_KEY
```

이 명령을 실행하면:
1. 대화형 프롬프트가 나타남
2. OpenAI API Key를 입력 (또는 붙여넣기)
3. 자동으로 Secret Manager에 저장됨

#### Step 3: Functions 재배포
```bash
firebase deploy --only functions
```

### 방법 2: Firebase Console에서 수동 설정

#### Step 1: Firebase Console 접속
1. https://console.firebase.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`

#### Step 2: Functions 환경 변수 설정
1. 왼쪽 메뉴에서 **Functions** 클릭
2. 상단의 **Environment variables** 탭 클릭
3. **Add variable** 버튼 클릭
4. 다음 정보 입력:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: OpenAI API Key (예: `sk-...`)
5. **Save** 클릭

#### Step 3: Functions 재배포
```bash
firebase deploy --only functions
```

## 🔍 코드 확인

### Functions 코드에서 OpenAI 사용 확인

`functions/src/lib/openaiClient.ts`:
```typescript
let apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ [OpenAI] Missing OPENAI_API_KEY.");
  console.error("Please set it in:");
  console.error("Firebase Console > Functions > Configuration > Environment variables");
}
```

### 주요 파일들
- `functions/src/lib/openaiClient.ts` - OpenAI 클라이언트 초기화
- `functions/src/exports/reporting.ts` - 리포트 생성 함수들
- `functions/src/exports/voice.ts` - 음성 관련 함수들
- `functions/src/exports/market.ts` - 마켓 관련 함수들

모든 파일에서 `process.env.OPENAI_API_KEY`를 사용합니다.

## ⚠️ 주의 사항

### Secret Manager vs Environment Variables

Firebase Functions V2에서는 두 가지 방식이 있습니다:

1. **Secret Manager** (권장)
   - `firebase functions:secrets:set` 사용
   - 더 안전함
   - 자동으로 암호화됨

2. **Environment Variables**
   - Firebase Console에서 설정
   - 간단하지만 보안 수준이 낮음

### 레거시 방식 (사용 불가)

```bash
# ❌ 이 방식은 더 이상 사용 불가 (2026년 3월 이후)
firebase functions:config:set openai.key="..."
```

## 🚀 배포 후 확인

### 1. Functions 로그 확인
```bash
firebase functions:log
```

다음 메시지가 **없어야** 합니다:
```
❌ [OpenAI] Missing OPENAI_API_KEY.
```

### 2. Functions 목록 확인
```bash
firebase functions:list
```

모든 함수가 정상적으로 배포되었는지 확인합니다.

## 📝 추가 참고

### 환경 변수 확인
```bash
# 현재 설정된 환경 변수 확인
firebase functions:config:get

# Secret Manager 확인
firebase functions:secrets:access OPENAI_API_KEY
```

### 로컬 테스트
```bash
# 로컬에서 환경 변수 설정
export OPENAI_API_KEY="sk-your-key-here"

# 에뮬레이터 실행
firebase emulators:start --only functions
```

## ✅ 체크리스트

- [ ] OpenAI API Key 확인
- [ ] Firebase Functions 환경 변수 설정
- [ ] `firebase deploy --only functions` 실행
- [ ] Functions 로그에서 오류 없음 확인
- [ ] Functions 목록에서 모든 함수 정상 확인

## 🎯 빠른 해결 (한 줄 명령)

```bash
# OpenAI API Key를 입력하라는 프롬프트가 나타남
firebase functions:secrets:set OPENAI_API_KEY && firebase deploy --only functions
```

