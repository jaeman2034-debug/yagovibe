# 🚀 YAGO VIBE 모니터링 빠른 시작 가이드

5분 안에 모니터링 시스템을 설정하는 방법입니다.

## ⚡ 빠른 설정 (5분)

### 1. Sentry 계정 생성 (2분)

1. https://sentry.io 접속
2. GitHub로 로그인
3. "Create Project" → **React** 선택
4. Project Name: `yago-vibe-spt`
5. DSN 복사

### 2. 환경 변수 설정 (1분)

#### 로컬 개발

`.env.local` 파일에 추가:

```bash
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

#### Vercel 배포

Vercel Dashboard → Project Settings → Environment Variables:

```bash
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 3. 테스트 (2분)

1. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

2. 브라우저 콘솔 확인:
   ```
   ✅ Sentry 초기화 완료 (모니터링 활성화)
   ```

3. 에러 발생 테스트:
   - 브라우저 콘솔에서:
     ```javascript
     throw new Error("테스트 에러");
     ```

4. Sentry Dashboard 확인:
   - https://sentry.io → Issues 탭
   - "테스트 에러" 확인

## ✅ 완료!

이제 모든 에러가 자동으로 Sentry에 전송됩니다!

---

## 📊 모니터링 확인 방법

### Sentry Dashboard

- **URL**: https://sentry.io
- **주요 기능**:
  - **Issues**: 에러 목록 및 상세 정보
  - **Performance**: 성능 메트릭
  - **Releases**: 배포 버전별 추적

### Firebase Console

- **URL**: https://console.firebase.google.com
- **Functions** → **Logs**: Functions 로그 확인

---

## 🎯 다음 단계

1. **알림 설정**: Sentry에서 에러 발생 시 이메일 알림 설정
2. **성능 모니터링**: Sentry Performance에서 느린 API 확인
3. **사용자 피드백**: 에러 발생 시 사용자 피드백 수집 (선택)

---

**모니터링 시스템이 활성화되었습니다! 🎉**

