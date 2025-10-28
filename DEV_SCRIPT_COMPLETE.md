# ✅ Dev Script 추가 완료

## ✅ 완료된 작업

### 1️⃣ package.json에 dev 스크립트 추가
- ✅ "dev": "firebase emulators:start --only functions"
- ✅ 간단한 명령어로 에뮬레이터 실행 가능

## 🎯 추가된 스크립트

### functions/package.json
```json
{
  "scripts": {
    "lint": "eslint .",
    "build": "tsc",
    "watch": "tsc --watch",
    "dev": "firebase emulators:start --only functions",  ✅
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  }
}
```

## 🚀 사용 방법

### 에뮬레이터 실행
```bash
cd functions
npm run dev
```

### 또는 빌드 후 실행
```bash
cd functions
npm run build
npm run dev
```

### 루트에서 실행 (빌드 포함)
```bash
cd ..
cd functions
npm run build
cd ..
firebase emulators:start --only functions
```

## 📊 스크립트 목록

| 스크립트 | 명령어 | 설명 |
|---------|--------|------|
| dev | `npm run dev` | 에뮬레이터 실행 (Functions만) |
| build | `npm run build` | TypeScript 컴파일 |
| watch | `npm run watch` | TypeScript 자동 컴파일 |
| serve | `npm run serve` | 에뮬레이터 실행 (Functions만) |
| deploy | `npm run deploy` | Functions 배포 |

## ✨ 장점

### 간단한 명령어
- ✅ `npm run dev` 만 입력하면 실행
- ✅ 길고 복잡한 명령어 불필요
- ✅ 빠른 개발 시작

### 개발 편의성
- ✅ 에뮬레이터 자동 시작
- ✅ Functions 즉시 테스트
- ✅ 로컬 개발 환경 구축

---

**🎉 Dev Script 추가 완료!**

이제 `npm run dev`로 간단하게 에뮬레이터를 실행할 수 있습니다! 🔥✨

