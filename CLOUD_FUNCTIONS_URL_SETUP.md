# 🔧 Cloud Functions URL 설정 가이드

## ✅ 수정 완료 사항

### 1. 코드 수정 완료
- ✅ `src/config/env.ts`에 `API_ENDPOINT` 추가
- ✅ `src/pages/market/ProductDetail.tsx`의 모든 API 호출을 `API_ENDPOINT` 사용으로 변경
- ✅ 12개의 AI 분석 함수 호출 경로 수정 완료

### 2. 수정된 API 호출 목록
- ✅ `getProductSummary` → `${API_ENDPOINT}/getProductSummary`
- ✅ `getConditionScore` → `${API_ENDPOINT}/getConditionScore`
- ✅ `detectFraudRisk` → `${API_ENDPOINT}/detectFraudRisk`
- ✅ `getImageQualityScore` → `${API_ENDPOINT}/getImageQualityScore`
- ✅ `predictFuturePrice` → `${API_ENDPOINT}/predictFuturePrice`
- ✅ `detectComponents` → `${API_ENDPOINT}/detectComponents`
- ✅ `generateTotalScore` → `${API_ENDPOINT}/generateTotalScore`
- ✅ `recommendSimilar` → `${API_ENDPOINT}/recommendSimilar`
- ✅ `getRelatedProducts` → `${API_ENDPOINT}/getRelatedProducts`
- ✅ `getSellerTrustScore` → `${API_ENDPOINT}/getSellerTrustScore`

## 🔧 .env.local 파일 설정

프로젝트 루트의 `.env.local` 파일에 다음 내용을 추가하세요:

```bash
# ============================================
# Cloud Run URLs (Firebase Functions v2)
# ============================================

# 공통 API 엔드포인트 (다양한 AI 분석 기능 제공)
VITE_FUNCTIONS_ORIGIN=https://api-2q3hdcfwca-du.a.run.app
VITE_API_ENDPOINT=https://api-2q3hdcfwca-du.a.run.app

# 개별 AI 분석 엔드포인트
VITE_ANALYZE_PRODUCT_URL=https://analyzeproduct-2q3hdcfwca-du.a.run.app

# 기타 Functions
VITE_GENERATE_TAGS_URL=https://generatetags-2q3hdcfwca-asia-northeast3.run.app
VITE_GENERATE_SEARCH_META_URL=https://generatesearchmeta-2q3hdcfwca-du.a.run.app
VITE_NLU_ENDPOINT=https://nluhandler-2q3hdcfwca-du.a.run.app
VITE_IMAGE_ANALYZE_URL=https://handleimageandvoiceanalyze-2q3hdcfwca-du.a.run.app
```

## 📌 설정 방법

1. **프로젝트 루트 디렉토리 확인**
   ```
   C:\Users\samsung256g\Desktop\yago-vibe-spt\.env.local
   ```

2. **파일 열기**
   - 텍스트 에디터로 `.env.local` 파일 열기

3. **환경 변수 추가**
   - 위의 환경 변수들을 파일에 추가
   - 기존 내용이 있으면 추가로 작성

4. **파일 저장**
   - 저장 후 개발 서버 재시작 필요

5. **개발 서버 재시작**
   ```bash
   # 개발 서버 중지 (Ctrl+C)
   # 다시 시작
   npm run dev
   ```

## ✅ 확인 방법

1. **브라우저 콘솔 확인**
   - 상품 상세 페이지 접속
   - 개발자 도구 콘솔 열기 (F12)
   - API 호출 URL 확인:
     ```
     fetch: https://api-2q3hdcfwca-du.a.run.app/getProductSummary
     fetch: https://api-2q3hdcfwca-du.a.run.app/getConditionScore
     ...
     ```

2. **네트워크 탭 확인**
   - 개발자 도구 → Network 탭
   - API 호출이 성공하는지 확인
   - 상태 코드가 200 OK인지 확인

## 🎯 기대 결과

환경 변수 설정 후:

1. ✅ 모든 AI 분석 기능 정상 작동
   - 상품 요약
   - 상품 상태 점수
   - 가격 미래 예측
   - 사기 감지
   - 유사상품 추천

2. ✅ "Failed to fetch" 오류 해결
   - 모든 API 호출이 올바른 URL로 요청됨

3. ✅ ProductDetail 페이지 정상 작동
   - 모든 데이터 로딩 완료
   - 이미지 정상 표시

## ⚠️ 주의사항

- `.env.local` 파일은 Git에 커밋하지 마세요 (이미 .gitignore에 포함됨)
- 환경 변수 변경 후 반드시 개발 서버 재시작 필요
- 실제 Cloud Run URL이 위와 다르면 실제 URL로 수정하세요

