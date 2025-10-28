# 🧩 Google Maps API 키 디버깅 가이드

## ✅ 적용된 변경 사항

다음 파일들에 API 키 확인 로그를 추가했습니다:
- `src/utils/googleMapsLoader.ts`
- `src/pages/VoiceMapSearch.tsx`
- `src/pages/voice/VoiceMap.tsx`

모든 파일 상단에 다음 로그가 추가되었습니다:
```typescript
console.log("🧩 Google Maps API KEY =", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
```

## 🔍 진단 방법

### Step 1: 개발 서버 재시작

```bash
# 현재 서버 완전히 종료 (Ctrl + C)
npm run dev
```

### Step 2: 브라우저 콘솔 확인

페이지를 열면 자동으로 다음 로그가 출력됩니다:
```
🧩 Google Maps API KEY = AIzaSy...
```

### Step 3: 결과 분석

#### ✅ 정상 케이스
```
🧩 Google Maps API KEY = AIzaSyCJOahD8gJGDIGM...
```
→ API 키가 정상적으로 로드됨
→ 문제는 Google Cloud Console 설정 (도메인 제한 등)

#### ❌ 문제 케이스 1: undefined
```
🧩 Google Maps API KEY = undefined
```
→ **Vite가 .env.local 파일을 읽지 못함**

**해결 방법**:
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 파일명이 정확한지 확인 (`.env.local`, 대소문자 구분)
3. 서버 재시작 (중요!)
4. `.env.local` 파일 내용 확인:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy실제_키
   ```

#### ❌ 문제 케이스 2: 빈 문자열 또는 플레이스홀더
```
🧩 Google Maps API KEY = 
또는
🧩 Google Maps API KEY = your-google-maps-api-key
```
→ **.env.local 파일에 플레이스홀더 값이 있음**

**해결 방법**:
1. `.env.local` 파일 열기
2. `VITE_GOOGLE_MAPS_API_KEY` 값을 실제 발급받은 키로 변경
3. 서버 재시작

## 🚨 Vite가 .env.local을 못 읽는 경우

### 원인
1. 파일 위치가 잘못됨
2. 파일명 오타
3. 서버를 재시작하지 않음
4. 환경 변수 이름이 `VITE_`로 시작하지 않음

### 해결 방법

1. **파일 위치 확인**
   ```
   프로젝트 루트/
   ├── .env.local         ← 여기 있어야 함
   ├── package.json
   ├── vite.config.ts
   └── ...
   ```

2. **파일 내용 확인**
   ```env
   # 올바른 형식
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy실제_발급받은_키
   
   # 잘못된 형식들
   GOOGLE_MAPS_API_KEY=...      ❌ VITE_ 접두사 없음
   VITE_GOOGLE_MAPS_API_KEY = ... ❌ = 뒤에 공백
   ```

3. **서버 재시작** (필수!)
   ```bash
   # 완전히 종료 후
   npm run dev
   ```

4. **브라우저 강제 새로고침**
   - `Ctrl + Shift + R`

## ✅ 확인 체크리스트

- [ ] `.env.local` 파일이 프로젝트 루트에 있음
- [ ] 파일 내용에 `VITE_GOOGLE_MAPS_API_KEY=...` 형식으로 설정됨
- [ ] `=` 뒤에 공백 없음
- [ ] 플레이스홀더 값(`your-google-maps-api-key`)이 아님
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 콘솔에서 `🧩 Google Maps API KEY = ...` 로그 확인
- [ ] undefined가 아닌 실제 키 값이 표시됨

## 🎯 다음 단계

만약 API 키가 정상적으로 로드되는데도 InvalidKeyMapError가 발생한다면:

→ **Google Cloud Console 설정 문제**
- `FIX_INVALID_KEY_ERROR.md` 파일 참고
- Maps JavaScript API 활성화 확인
- API 키 도메인 제한 설정 확인

---

**먼저 브라우저 콘솔에서 `🧩 Google Maps API KEY = ...` 값이 올바르게 표시되는지 확인하세요!**

