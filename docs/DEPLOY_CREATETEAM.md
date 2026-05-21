# 🔥 createTeam 함수 배포 가이드

**생성일**: 2025-01-27  
**목적**: createTeam 함수를 Firebase Functions에 배포

---

## ✅ 수정 완료

`functions/src/index.ts`에 `createTeam` export 추가 완료:

```typescript
export { createTeam } from "./createTeam";
```

---

## 🚀 배포 방법

### 1단계: functions 폴더로 이동

```bash
cd functions
```

### 2단계: 함수 배포

```bash
# createTeam만 배포
firebase deploy --only functions:createTeam

# 또는 모든 함수 배포
firebase deploy --only functions
```

### 3단계: 배포 확인

1. Firebase Console → Functions 탭
2. `createTeam` 함수가 "Active" 상태인지 확인
3. Region이 `asia-northeast3`인지 확인

---

## 📋 배포 후 확인 사항

- [ ] Firebase Console에 `createTeam` 함수 표시됨
- [ ] 함수 상태: "Active"
- [ ] Region: `asia-northeast3`
- [ ] 팀 생성 버튼 클릭 시 정상 작동

---

## 🔗 Firebase Console

https://console.firebase.google.com/project/yago-vibe-spt/functions

---

**배포 완료 후 팀 생성 기능이 정상 작동합니다!** 🎉
