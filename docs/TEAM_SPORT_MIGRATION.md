# 🏃 팀-스포츠 연결 마이그레이션 가이드

## 문제 상황

현재 모든 스포츠 카테고리에서 같은 팀이 보이는 문제가 발생했습니다.

**원인:**
- 팀 조회 시 `sportType` 필터링이 없었음
- `team_members`에서 팀을 찾은 후, `sportType` 일치 여부만 확인
- 결과적으로 모든 종목 화면에서 같은 팀이 표시됨

---

## 해결 방법

### 1️⃣ 팀 조회 로직 수정 (완료)

**변경 전:**
```typescript
// team_members에서 팀 찾기 → teams에서 정보 조회 → sportType 확인
const membersQuery = query(
  collection(db, "team_members"),
  where("uid", "==", user.uid)
);
```

**변경 후:**
```typescript
// teams에서 직접 ownerUid + sportType으로 필터링
const teamsQuery = query(
  collection(db, "teams"),
  where("ownerUid", "==", user.uid),
  where("sportType", "==", sportType)
);
```

### 2️⃣ 팀 생성 시 필수 필드 추가 (완료)

**추가된 필드:**
- `sportType`: 필수 (팀이 속한 스포츠)
- `sportKey`: 호환성을 위해 추가 (sportType과 동일)
- `owners`: 배열 형태로 추가 (권한 체크용)

---

## 기존 데이터 마이그레이션

### 방법 1: Firestore 콘솔에서 수동 수정 (빠름)

1. Firebase Console → Firestore 열기
2. `teams/{teamId}` 문서 선택
3. 다음 필드 추가:
   ```json
   {
     "sportType": "football",  // 또는 "basketball", "tennis", "yoga" 등
     "sportKey": "football",   // sportType과 동일
     "owners": ["ownerUid"]   // ownerUid를 배열로
   }
   ```

### 방법 2: Cloud Function으로 일괄 마이그레이션 (권장)

```typescript
// functions/src/migrateTeamSportTypes.ts
export const migrateTeamSportTypes = onCall(async (request) => {
  const db = getFirestore();
  const teamsSnapshot = await db.collection("teams").get();
  
  for (const teamDoc of teamsSnapshot.docs) {
    const teamData = teamDoc.data();
    
    // sportType이 없으면 기본값 설정
    if (!teamData.sportType) {
      await teamDoc.ref.update({
        sportType: "football", // 기본값 (필요시 변경)
        sportKey: "football",
        owners: teamData.ownerUid ? [teamData.ownerUid] : [],
      });
    }
  }
  
  return { success: true, migrated: teamsSnapshot.size };
});
```

---

## 스포츠 종목 매핑

| 스포츠 | sportType | sportKey |
|--------|-----------|----------|
| 축구 | `football` | `football` |
| 농구 | `basketball` | `basketball` |
| 테니스 | `tennis` | `tennis` |
| 요가 | `yoga` | `yoga` |

---

## 검증 체크리스트

### 수정 후 확인 사항

- [ ] 축구 화면(`/sports/football/team`)에서 축구팀만 보임
- [ ] 농구 화면(`/sports/basketball/team`)에서 농구팀만 보임
- [ ] 테니스 화면(`/sports/tennis/team`)에서 테니스팀만 보임
- [ ] 요가 화면(`/sports/yoga/team`)에서 요가팀만 보임
- [ ] 팀 생성 시 `sportType` 자동 저장됨
- [ ] 기존 팀에 `sportType` 필드 추가됨

---

## 주의사항

### ⚠️ 기존 팀 데이터 처리

**sportType이 없는 팀:**
- 현재는 조회되지 않음 (필터링됨)
- 관리자가 수동으로 `sportType` 추가 필요
- 또는 마이그레이션 스크립트 실행

### ⚠️ 다중 종목 팀

현재 설계는 **"한 팀 = 한 종목"**을 전제로 합니다.

만약 한 팀이 여러 종목을 운영한다면:
- 각 종목별로 별도 팀 문서 생성
- 또는 `sports` 배열 필드 추가 (향후 확장)

---

## 다음 단계

1. ✅ 팀 조회 로직 수정 (완료)
2. ✅ 팀 생성 시 필수 필드 추가 (완료)
3. ⏳ 기존 팀 데이터 마이그레이션 (수동 또는 자동)
4. ⏳ 테스트 및 검증

---

## 참고

- `sportType`과 `sportKey`는 현재 동일한 값 사용
- 향후 `sportKey`를 URL-friendly 형식으로 변경 가능
- 예: `sportType: "football"`, `sportKey: "soccer"`

