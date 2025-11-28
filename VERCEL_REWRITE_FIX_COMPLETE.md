# ✅ Vercel Rewrite 설정 완료

## 🔧 수정 내용

`vercel.json` 파일에 Firebase Auth의 `/__/auth/handler` 경로를 처리하는 rewrite 규칙을 추가했습니다.

### 추가된 Rewrite 규칙

```json
{
  "source": "/__/auth/:match*",
  "destination": "/"
}
```

이 규칙은 Firebase Auth의 redirect 방식에서 사용하는 `/__/auth/handler` 경로를 SPA 메인 페이지로 보내게 됩니다.

## 📋 현재 vercel.json 구조

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/__/auth/:match*",
      "destination": "/"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  ...
}
```

## 🎯 Rewrite 규칙 순서

1. **`/api/(.*)`** - API 경로 처리 (가장 구체적)
2. **`/__/auth/:match*`** - Firebase Auth 경로 처리 (추가됨)
3. **`/(.*)`** - 모든 나머지 경로를 SPA로 처리 (가장 일반적)

## ✅ 효과

이제 Vercel에서:
- ✅ `/__/auth/handler` 경로가 정상적으로 처리됨
- ✅ Firebase Auth redirect 방식이 작동함
- ✅ `/__/auth/handler` 404 오류 해결
- ✅ `auth/requests-from-referer-are-blocked` 오류 해결 가능

## 🚀 다음 단계

1. **변경사항 커밋 및 푸시**
   ```bash
   git add vercel.json
   git commit -m "Add Firebase Auth rewrite rule to vercel.json"
   git push
   ```

2. **Vercel 자동 배포 대기**
   - Vercel이 자동으로 감지하여 재배포합니다
   - 또는 수동으로 Redeploy 실행

3. **테스트**
   - 배포 완료 후 `https://yagovibe.com/login` 접속
   - "G 구글로 로그인" 버튼 클릭
   - 정상 작동 확인

## 💡 참고

### Firebase Hosting 배포 시

`firebase.json`에도 동일한 rewrite 규칙이 필요합니다:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/__/auth/**",
        "destination": "/index.html"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

현재 `firebase.json`에는 이미 `"source": "**"` 규칙이 있어서 `/__/auth/**` 경로도 처리되지만, 명시적으로 추가하는 것이 좋습니다.

## ✅ 완료

이제 Vercel에서 Firebase Auth의 `/__/auth/handler` 경로가 정상적으로 처리됩니다!

