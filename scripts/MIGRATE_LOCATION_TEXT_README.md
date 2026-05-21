# 🔥 기존 상품 행정동(locationText) 마이그레이션 가이드

## 목적

기존 상품의 `latitude`/`longitude` 좌표를 행정동(`locationText`)으로 자동 변환하여 저장합니다.

## 사전 준비

### 1. Firebase Admin Service Account 키 다운로드

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 → 설정(⚙️) → 서비스 계정
3. "새 비공개 키 생성" 클릭
4. `serviceAccount.json` 파일 다운로드
5. 프로젝트 루트에 저장 (`.gitignore`에 추가되어 있는지 확인)

### 2. 환경 변수 설정

#### Windows (PowerShell)
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\samsung256g\Desktop\yago-vibe-spt\serviceAccount.json"
```

#### macOS/Linux
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccount.json"
```

## 실행 방법

### 방법 1: tsx 사용 (권장)

```bash
npx tsx scripts/migrateLocationText.ts
```

### 방법 2: ts-node 사용

```bash
npx ts-node scripts/migrateLocationText.ts
```

## 실행 결과 예시

```
🚀 마이그레이션 시작...

📊 총 150개 상품 발견 (좌표 있음)

✅ abc123 → 서울특별시 중구 신당동
✅ def456 → 서울특별시 노원구 상계동
⚠️  ghi789 → 유효하지 않은 좌표 (999, 999)
❌ jkl012 → Geocoding 실패: API 오류

==================================================
🎉 마이그레이션 완료!
==================================================
✅ 업데이트: 145개
⏭️  스킵: 3개 (이미 locationText 있음)
❌ 실패: 2개
📊 총 처리: 150개
==================================================

✅ 스크립트 완료
```

## 성공 기준

### UI에서 확인

1. **Market 리스트:**
   ```
   📍 신당동 · 약 0.8km
   ```

2. **ProductDetail:**
   ```
   ❌ 위치 정보 없음
   ✅ 📍 서울특별시 중구 신당동
   ```

## 주의사항

1. **API Rate Limit**: 스크립트는 각 요청 사이에 100ms 대기합니다.
2. **중복 실행 안전**: 이미 `locationText`가 있는 상품은 자동으로 스킵됩니다.
3. **에러 처리**: 실패한 상품은 로그에 기록되며, 전체 프로세스는 계속 진행됩니다.

## 문제 해결

### 오류: "Firebase Admin 초기화 실패"

**원인**: Service Account 키 파일을 찾을 수 없음

**해결**:
1. `GOOGLE_APPLICATION_CREDENTIALS` 환경 변수가 올바른 경로를 가리키는지 확인
2. 파일이 실제로 존재하는지 확인
3. 파일 권한 확인 (읽기 가능해야 함)

### 오류: "Geocoding 실패"

**원인**: Cloud Function이 응답하지 않거나 API 키 문제

**해결**:
1. Cloud Function이 배포되어 있는지 확인
2. `geocodeLocation` 함수가 정상 작동하는지 테스트
3. Firebase Console에서 함수 로그 확인

### 오류: "유효하지 않은 좌표"

**원인**: Firestore에 잘못된 좌표 값이 저장됨

**해결**:
1. 해당 상품의 `latitude`/`longitude` 값을 수동으로 확인
2. 필요시 해당 상품을 수동으로 수정하거나 삭제

## 다음 단계

마이그레이션 완료 후:

1. ✅ UI에서 행정동이 정상 표시되는지 확인
2. ✅ 거리 계산이 정확한지 확인
3. ✅ 새 상품 등록 시 자동으로 `locationText`가 저장되는지 확인

