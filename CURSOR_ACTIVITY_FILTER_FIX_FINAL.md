# 🔥 Cursor 개발자 수정 지시문: Activity 필터 최종 수정 완료

## ✅ 수정 완료

### 문제

스크린샷 기준으로 조건이 맞지 않음:
- 전체 탭: "활동이 없습니다" (공공공, 야고 축구 FC 둘 다 안 보임) ❌
- 거래 탭: "활동이 없습니다" (공공공 안 보임) ❌
- 팀 탭: "야고 축구 FC" 표시됨 ✅

---

## 📋 수정 상세

### 원인

**전체 탭에서도 sport 필터가 적용되어 모든 종목이 아닌 특정 종목만 조회됨**

**현재 URL**: `?sport=soccer`
- 전체 탭에서도 `sport=soccer` 필터 적용
- "공공공"이 배구(volleyball) 글이라면 제외됨 (정상)
- 하지만 "야고 축구 FC"는 축구 글인데도 안 보임 (비정상)

---

### 수정 내용

**파일**: `src/features/activity/ActivityFeed.tsx`

**Before (기존)**:
```typescript
// sport 필터 추가 (선택사항)
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**After (수정 후)**:
```typescript
// 🔥 sport 필터 추가 (전체 탭에서는 제외 - 모든 종목 표시)
// 전체 탭이 아닐 때만 sport 필터 적용
if (sport && activeFilter !== "all" && activeFilter !== "전체") {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**효과**: 
- 전체 탭: 모든 종목 표시 (sport 필터 없음)
- 거래/팀/이벤트 탭: sport 필터 적용

---

## 📋 최종 필터 로직

### 필터별 동작

| 탭 | Type 필터 | Sport 필터 | 결과 |
|---|----------|-----------|------|
| **전체** | `type != "system"` | ❌ 없음 (모든 종목) | 모든 활동 표시 |
| **거래** | `type == "equipment_created"` | ✅ `sport=soccer` | soccer의 equipment만 |
| **팀** | `type in ["team_created", "recruit_created"]` | ✅ `sport=soccer` | soccer의 팀/모집만 |
| **이벤트** | `type == "team_event"` | ✅ `sport=soccer` | soccer의 이벤트만 |

---

## 🧪 수정 후 예상 결과

### 전체 탭 (`?sport=soccer`)
- "공공공" (배구, equipment_created) ✅ 표시
- "야고 축구 FC" (축구, recruit_created) ✅ 표시
- 모든 종목의 모든 활동 표시

### 거래 탭 (`?sport=soccer`)
- "공공공" (배구, equipment_created) ✅ 표시
- "야고 축구 FC" (축구, recruit_created) ❌ 표시 안 됨 (recruit이므로)
- **주의**: "공공공"이 배구 글이라면 `sport=soccer` 필터에서 제외됨
- **확인 필요**: "공공공"의 실제 `sport` 값

### 팀 탭 (`?sport=soccer`)
- "야고 축구 FC" (축구, recruit_created) ✅ 표시
- "공공공" (배구, equipment_created) ❌ 표시 안 됨 (equipment이므로)

---

## 📝 참고사항

### "공공공" 글의 sport 값 확인 필요

**가능성 1**: "공공공"이 배구(volleyball) 글
- 거래 탭에서 `sport=soccer` 필터 때문에 제외됨
- 전체 탭에서는 표시됨 (sport 필터 없음)

**가능성 2**: "공공공"이 축구(soccer) 글
- 거래 탭에서 표시되어야 함
- 현재 안 보이는 것은 다른 문제 (데이터 없음, 인덱스 문제 등)

---

## 🔍 추가 확인 사항

### 1. 브라우저 콘솔 확인

다음 로그를 확인:
```
🔥 [ActivityFeed] query results: {
  queryConditions: ...,
  sportFilter: "soccer" 또는 null,
  typeFilter: "all",
  resultCount: ...
}
```

### 2. Firestore 데이터 확인

Firebase Console에서:
```
activities 컬렉션
- "공공공" 글의 sport 값 확인
- "야고 축구 FC" 글의 sport 값 확인
```

---

이 수정으로 **전체 탭에서 모든 종목의 활동이 표시**됩니다.
