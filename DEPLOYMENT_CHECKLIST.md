# 🚀 YAGO VIBE 배포 체크리스트

Production 배포 전 필수 확인 사항입니다.

## 📋 배포 전 체크리스트

### 1. 코드 준비

- [ ] 모든 기능 구현 완료
- [ ] 코드 린트 에러 없음 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] TypeScript 타입 에러 없음
- [ ] 테스트 통과 (있는 경우)

### 2. 환경 변수 확인

- [ ] `VITE_FIREBASE_API_KEY` 설정
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` 설정
- [ ] `VITE_FIREBASE_PROJECT_ID` 설정
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` 설정
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` 설정
- [ ] `VITE_FIREBASE_APP_ID` 설정
- [ ] `VITE_FUNCTIONS_ORIGIN` 설정
- [ ] `VITE_KAKAO_MAP_KEY` 설정 (있는 경우)
- [ ] `VITE_SENTRY_DSN` 설정 (선택 - 모니터링용)
- [ ] `VITE_APP_VERSION` 설정 (선택 - 버전 추적용)
- [ ] 모든 환경 변수 Vercel에 등록 완료

### 3. Firestore 보안 규칙

- [ ] `firestore.rules.production` 확인
- [ ] Production 규칙 적용 (`cp firestore.rules.production firestore.rules`)
- [ ] Firestore 규칙 배포 (`firebase deploy --only firestore:rules`)
- [ ] 테스트: 비로그인 사용자 접근 차단 확인
- [ ] 테스트: 로그인 사용자 읽기 가능 확인
- [ ] 테스트: 본인 글만 수정/삭제 가능 확인

### 4. Storage 보안 규칙

- [ ] `storage.rules` 확인
- [ ] Storage 규칙 배포 (`firebase deploy --only storage`)
- [ ] 테스트: 업로드/다운로드 권한 확인

### 5. Cloud Functions 배포

- [ ] 모든 Functions 빌드 성공 (`cd functions && npm run build`)
- [ ] Functions 배포 완료 (`firebase deploy --only functions`)
- [ ] Functions 로그 확인 (에러 없음)
- [ ] CORS 설정 확인
- [ ] API 응답 속도 확인

#### 주요 Functions 목록

- [ ] `generateTags`
- [ ] `generateCategory`
- [ ] `generateOneLineSummary`
- [ ] `generateTotalScore`
- [ ] `getRecommendedFeed`
- [ ] `searchProducts`
- [ ] `recommendSimilar`
- [ ] `getSellerTrustScore`
- [ ] `askAdminAI`
- [ ] `negotiateHelper`

### 6. 프론트엔드 배포 (Vercel)

- [ ] GitHub Repository 준비 완료
- [ ] Vercel 프로젝트 생성 완료
- [ ] Vercel 환경 변수 등록 완료
- [ ] 자동 배포 설정 확인 (GitHub 연동)
- [ ] 빌드 성공 확인
- [ ] 배포 URL 확인 (`https://yago-vibe-spt.vercel.app`)

### 7. 도메인 연결 (선택)

- [ ] 도메인 구매 완료
- [ ] Vercel 도메인 연결 완료
- [ ] DNS 설정 완료
- [ ] SSL 자동 적용 확인 (24시간 이내)

### 8. 기능 테스트

#### 인증

- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 로그아웃 테스트
- [ ] 비밀번호 재설정 테스트

#### 마켓

- [ ] 상품 목록 조회 테스트
- [ ] 상품 상세 조회 테스트
- [ ] 상품 등록 테스트
- [ ] 상품 수정 테스트 (본인만 가능)
- [ ] 상품 삭제 테스트 (본인만 가능)
- [ ] 이미지 업로드 테스트

#### AI 기능

- [ ] AI 검색 엔진 테스트
- [ ] AI 추천 피드 테스트
- [ ] AI 유사상품 추천 테스트
- [ ] AI 판매자 신뢰도 테스트
- [ ] AI 채팅 흥정 도우미 테스트
- [ ] 운영자 AI 도우미 테스트 (관리자만)

#### 채팅

- [ ] 채팅방 생성 테스트
- [ ] 메시지 전송 테스트
- [ ] 메시지 수신 테스트
- [ ] AI 흥정 도우미 테스트

#### 관리자

- [ ] 관리자 페이지 접근 테스트 (관리자만)
- [ ] 운영자 AI 도우미 테스트

### 9. 반응형 테스트

- [ ] 데스크톱 (1920px) 테스트
- [ ] 태블릿 (768px) 테스트
- [ ] 모바일 (375px) 테스트
- [ ] 다양한 브라우저 테스트 (Chrome, Safari, Firefox)

### 10. 성능 확인

- [ ] 페이지 로딩 속도 확인 (< 3초)
- [ ] 이미지 최적화 확인 (WebP 변환)
- [ ] 코드 스플리팅 확인
- [ ] AI 호출 응답 시간 확인 (< 5초)

### 11. 보안 확인

- [ ] API 키 노출 없음 확인 (소스 코드 확인)
- [ ] 환경 변수 보안 확인
- [ ] Firestore 규칙 적용 확인
- [ ] 관리자 페이지 접근 제한 확인
- [ ] CORS 설정 확인

### 12. 모니터링 설정

- [ ] Sentry 계정 생성 및 프로젝트 설정
- [ ] Sentry DSN 환경 변수 설정
- [ ] Sentry 에러 추적 테스트 완료
- [ ] Sentry 알림 규칙 설정 (선택)
- [ ] Firebase Console 모니터링 확인
- [ ] Functions 로그 확인 가능
- [ ] Vercel Analytics 설정 (선택)

### 13. 문서화

- [ ] README.md 업데이트
- [ ] 배포 가이드 문서화 완료
- [ ] API 문서화 (있는 경우)

---

## 🎉 배포 완료 후

### 즉시 확인

- [ ] 모든 기능 정상 동작 확인
- [ ] 에러 로그 확인 (없어야 함)
- [ ] 성능 지표 확인

### 24시간 후

- [ ] 도메인 SSL 적용 확인 (있는 경우)
- [ ] 사용자 피드백 확인
- [ ] 에러 로그 재확인

### 1주일 후

- [ ] 사용자 통계 확인
- [ ] 성능 지표 분석
- [ ] 사용자 피드백 반영 계획

---

## 📞 문제 발생 시

### Functions 에러

```bash
# 로그 확인
firebase functions:log

# 재배포
cd functions
npm install
firebase deploy --only functions
```

### 프론트엔드 에러

1. Vercel Dashboard → Deployments → 로그 확인
2. 브라우저 개발자 도구 콘솔 확인
3. 환경 변수 재확인

### Firestore 규칙 에러

```bash
# 규칙 테스트
firebase emulators:start --only firestore

# 규칙 재배포
firebase deploy --only firestore:rules
```

---

**✅ 모든 체크리스트 완료 시 Production 배포 완료!**

