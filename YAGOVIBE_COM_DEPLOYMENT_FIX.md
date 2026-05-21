# 🔧 yagovibe.com 배포 해결 가이드

## 📋 현재 상황

### ✅ 확인된 사항
- DNS 설정: 정상 (A 레코드 4개 모두 Firebase Hosting IP로 연결)
- TXT 레코드: 정상
- 가비아 DNS: 적용 완료
- `www.yagovibe.com`: 정상 작동 중 ✅
- `yagovibe.com`: "Site Not Found" ❌ (배포된 콘텐츠 없음)

### 🔍 Firebase Hosting 구조
- 프로젝트: `yago-vibe-spt`
- 사이트 ID: `yago-vibe-spt` (단일 사이트)
- 기본 URL: `https://yago-vibe-spt.web.app`

---

## 🎯 문제 원인

`yagovibe.com` 커스텀 도메인은 Firebase Hosting에 연결되어 있지만, **해당 사이트에 배포된 콘텐츠가 없어서** "Site Not Found" 오류가 발생합니다.

---

## ✅ 해결 방법

### 방법 1: 기본 사이트에 배포 (권장)

단일 사이트이므로, 기본 사이트에 배포하면 커스텀 도메인(`yagovibe.com`, `www.yagovibe.com`)에도 자동으로 반영됩니다.

#### Step 1: 빌드
```bash
npm run build
```

#### Step 2: Firebase Hosting 배포
```bash
firebase deploy --only hosting
```

#### Step 3: 배포 확인
- `https://yago-vibe-spt.web.app` ✅
- `https://yago-vibe-spt.firebaseapp.com` ✅
- `https://www.yagovibe.com` ✅
- `https://yagovibe.com` ✅

---

### 방법 2: 멀티 사이트 설정 (필요 시)

만약 `yagovibe.com`을 별도 사이트로 관리하고 싶다면:

#### Step 1: firebase.json 수정
```json
{
  "hosting": [
    {
      "target": "yago-vibe-spt",
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "/__/auth/**",
          "destination": "/index.html"
        },
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css|woff|woff2|ttf|otf)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**/*.@(html|json)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=3600"
            }
          ]
        },
        {
          "source": "**",
          "headers": [
            { "key": "Access-Control-Allow-Origin", "value": "*" }
          ]
        }
      ]
    }
  ]
}
```

#### Step 2: .firebaserc에 target 추가
```json
{
  "projects": {
    "default": "yago-vibe-spt"
  },
  "targets": {
    "yago-vibe-spt": {
      "hosting": {
        "yago-vibe-spt": [
          "yago-vibe-spt"
        ]
      }
    }
  }
}
```

#### Step 3: 배포
```bash
firebase deploy --only hosting:yago-vibe-spt
```

---

## 🚀 즉시 실행 (방법 1 - 권장)

### Step 1: 빌드 확인 및 실행
```bash
npm run build
```

### Step 2: Firebase Hosting 배포
```bash
firebase deploy --only hosting
```

### Step 3: 배포 확인
- 브라우저에서 `https://yagovibe.com` 접속 확인
- "Site Not Found" 오류가 사라지고 정상 페이지가 표시되어야 함

---

## ✅ 배포 후 확인 사항

### 1. 기본 도메인
- [ ] `https://yago-vibe-spt.web.app` 정상 작동
- [ ] `https://yago-vibe-spt.firebaseapp.com` 정상 작동

### 2. 커스텀 도메인
- [ ] `https://www.yagovibe.com` 정상 작동
- [ ] `https://yagovibe.com` 정상 작동 (Site Not Found 해결)

### 3. SSL 인증서
- [ ] 모든 도메인에서 HTTPS 정상 작동
- [ ] SSL 인증서 자동 발급 확인

---

## 🔧 트러블슈팅

### 배포 후에도 "Site Not Found"가 나오는 경우

1. **Firebase Console 확인**:
   - Firebase Console → Hosting
   - 커스텀 도메인(`yagovibe.com`)이 기본 사이트(`yago-vibe-spt`)에 연결되어 있는지 확인
   - 연결되어 있지 않다면 "도메인 추가" 버튼으로 연결

2. **DNS 전파 대기**:
   - DNS 변경 후 24-48시간 소요될 수 있음
   - 하지만 이미 정상 작동 중이므로 배포만 하면 됨

3. **브라우저 캐시 삭제**:
   - `Ctrl + Shift + R` (하드 새로고침)
   - 또는 시크릿 모드에서 테스트

---

## ✅ 완료

배포를 실행하면 `yagovibe.com`의 "Site Not Found" 오류가 해결됩니다!

