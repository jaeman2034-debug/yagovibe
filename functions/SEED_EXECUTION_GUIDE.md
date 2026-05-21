# 🌱 시드 데이터 실행 가이드

**목표**: 로컬 환경에서 Firebase Admin SDK 인증 문제를 해결하고 시드 스크립트를 실제 Firestore에 실행

---

## 📋 사전 준비

### 1. 서비스 계정 키 파일 준비

Firebase Console에서 서비스 계정 키를 다운로드해야 합니다:

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt/settings/serviceaccounts/adminsdk

2. **서비스 계정 키 생성**
   - "새 비공개 키 생성" 클릭
   - JSON 파일 다운로드

3. **파일 위치**
   - 다운로드한 JSON 파일을 다음 경로에 복사:
   - `C:\Users\samsung256g\Desktop\yago-vibe-spt\functions\serviceAccountKey.json`

---

## 🚀 실행 방법 (Windows PowerShell)

### 방법 1: 새 PowerShell 세션에서 실행 (권장)

```powershell
# 1. 새 PowerShell 창 열기

# 2. 프로젝트 디렉토리로 이동
cd C:\Users\samsung256g\Desktop\yago-vibe-spt\functions

# 3. 서비스 계정 키 환경 변수 설정
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\samsung256g\Desktop\yago-vibe-spt\functions\serviceAccountKey.json"

# 4. 에뮬레이터 환경 변수 제거 (확인)
echo $env:FIRESTORE_EMULATOR_HOST
# 값이 나오면 제거: Remove-Item Env:FIRESTORE_EMULATOR_HOST

# 5. 시드 스크립트 실행
npx ts-node src/migrations/seed-nowon-association.ts
```

### 방법 2: 일괄 실행 스크립트 사용

`functions/run-seed.ps1` 파일을 실행:

```powershell
.\run-seed.ps1
```

---

## ✅ 성공 기준

### 터미널 로그 확인

다음 메시지가 표시되어야 합니다:

```
🔥 PROJECT ID: yago-vibe-spt
Starting seed data migration for Nowon Football Association...
✅ Created association: assoc-nowon-football
✅ Created 3 association priority facilities
✅ Created policy config for association: assoc-nowon-football
✅ Created 8 teams (3 members, 3 non-members, 2 academies)
✅ Created 4 sample bookings

✅ Seed data migration completed successfully!
   - Project ID: yago-vibe-spt
   - Association: assoc-nowon-football
   - Facilities: 3
   - Teams: 8
   - Bookings: 4

🔥 Check Firestore Console: https://console.firebase.google.com/project/yago-vibe-spt/firestore
```

### Firestore 콘솔 확인

Firebase Console > Firestore Database에서 다음 컬렉션 확인:

- ✅ `associations/assoc-nowon-football`
- ✅ `facilities/` (3개 문서)
  - `facility-army-academy`
  - `facility-gyeonggi-mechanical`
  - `facility-seoul-tech`
- ✅ `teams/` (8개 문서)
  - 회원팀: `team-nowon-fc`, `team-gangbuk-fc`, `team-gongneung-fc`
  - 비회원팀: `team-dongbu-fc`, `team-jungang-fc`, `team-bukbu-fc`
  - 아카데미: `team-nowon-youth`, `team-silver-fc`
- ✅ `bookings/` (4개 문서)
- ✅ `associations/assoc-nowon-football/config/policy`

---

## ❌ 문제 해결

### 에러: "Could not load the default credentials"

**원인**: 서비스 계정 키 파일이 없거나 경로가 잘못됨

**해결**:
1. `serviceAccountKey.json` 파일이 `functions/` 디렉토리에 있는지 확인
2. 환경 변수 경로 확인:
   ```powershell
   echo $env:GOOGLE_APPLICATION_CREDENTIALS
   ```
3. 절대 경로 사용 (상대 경로 대신)

### 에러: "connect ECONNREFUSED 127.0.0.1:8210"

**원인**: 에뮬레이터 환경 변수가 설정되어 있음

**해결**:
1. 새 PowerShell 세션에서 실행 (가장 확실함)
2. 또는 환경 변수 제거:
   ```powershell
   Remove-Item Env:FIRESTORE_EMULATOR_HOST
   Remove-Item Env:FIREBASE_AUTH_EMULATOR_HOST
   Remove-Item Env:FIREBASE_STORAGE_EMULATOR_HOST
   ```

### 데이터가 생성되지 않음

**확인 사항**:
1. 프로젝트 ID 확인: 로그에서 "🔥 PROJECT ID: yago-vibe-spt" 출력 확인
2. Firestore 콘솔에서 올바른 프로젝트 확인
3. 콘솔 URL 확인: 로그 마지막 줄의 URL로 이동

---

## 📝 주의사항

- ⚠️ `serviceAccountKey.json`은 절대 Git에 커밋하지 마세요 (`.gitignore`에 포함됨)
- ⚠️ 서비스 계정 키는 프로젝트의 모든 데이터에 접근 가능하므로 보안에 주의하세요
- ⚠️ 프로덕션 환경에서는 환경 변수나 비밀 관리 서비스를 사용하세요

---

**시드 데이터 생성 성공 후, Policy Engine 실제 연결 및 UI 테스트로 진행합니다.**

