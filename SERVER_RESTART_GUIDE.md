# 🔧 개발 서버 재시작 가이드

## 현재 상황
- `ERR_EMPTY_RESPONSE` 오류 발생
- 포트 5179에서 서버는 리스닝 중이지만 응답하지 않음

## 해결 방법

### 방법 1: 서버 완전 재시작 (권장)

1. **모든 Node 프로세스 종료**
   ```powershell
   # PowerShell에서 실행
   Get-Process node | Stop-Process -Force
   ```

2. **포트 5179 해제**
   ```powershell
   # 포트를 사용하는 프로세스 종료
   netstat -ano | findstr :5179
   # PID 확인 후
   taskkill /PID [PID번호] /F
   ```

3. **서버 재시작**
   ```bash
   npm run dev
   ```

### 방법 2: 다른 포트로 시작

만약 포트 5179가 계속 문제가 되면:

```bash
# vite.config.ts 수정 또는
# 포트 변경
npm run dev -- --port 5178
```

### 방법 3: HTTPS 인증서 문제인 경우

`vite.config.ts`에서 HTTPS 설정이 있으면 인증서 문제일 수 있습니다:

```typescript
// vite.config.ts에서 HTTPS 임시로 비활성화
server: {
  // https: { ... } 주석 처리
  port: 5179,
  host: true,
}
```

## 빠른 해결 (원라이너)

PowerShell에서 실행:
```powershell
Get-Process node | Stop-Process -Force; Start-Sleep -Seconds 2; npm run dev
```

## 확인 사항

서버가 정상 작동하는지 확인:
- 브라우저에서 `http://localhost:5179` 접속
- 콘솔에 "VITE vX.X.X ready" 메시지 확인
- 네트워크 탭에서 응답 코드 200 확인

## 여전히 안 되면

1. **캐시 클리어**
   ```bash
   # node_modules/.vite 폴더 삭제
   rm -rf node_modules/.vite
   # Windows PowerShell
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   ```

2. **포트 변경**
   - vite.config.ts에서 port를 5178로 변경
   - 또는 다른 포트 사용

3. **방화벽 확인**
   - Windows 방화벽이 포트 5179를 차단하지 않는지 확인

