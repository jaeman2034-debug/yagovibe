# 🔥 Firestore 퍼널 실시간 구독 인덱스 설정

## 📋 필요한 인덱스

FunnelPanel의 실시간 구독을 위해 다음 인덱스가 **필수**입니다.

### 1️⃣ eventLogs 컬렉션 인덱스

#### 인덱스 A: createdAt + eventName (복합 쿼리용)

**쿼리:**
```typescript
query(
  collection(db, "eventLogs"),
  where("createdAt", ">=", todayTimestamp),
  where("eventName", "in", ["story_impression", "story_click"]),
  orderBy("createdAt", "desc")
)
```

**필요한 인덱스:**
- Collection: `eventLogs`
- Fields:
  - `createdAt` (Ascending)
  - `eventName` (Ascending)

#### 인덱스 B: createdAt 단독 (정렬용)

**필요한 인덱스:**
- Collection: `eventLogs`
- Fields:
  - `createdAt` (Descending)

---

### 2️⃣ activityLogs 컬렉션 인덱스

#### 인덱스 A: createdAt + event (복합 쿼리용)

**쿼리:**
```typescript
query(
  collection(db, "activityLogs"),
  where("createdAt", ">=", todayTimestamp),
  orderBy("createdAt", "desc")
)
```

**필요한 인덱스:**
- Collection: `activityLogs`
- Fields:
  - `createdAt` (Ascending)
  - `event` (Ascending)

#### 인덱스 B: createdAt 단독 (정렬용)

**필요한 인덱스:**
- Collection: `activityLogs`
- Fields:
  - `createdAt` (Descending)

---

## 🚀 인덱스 생성 방법

### 방법 1: firestore.indexes.json 사용 (권장)

이미 `firestore.indexes.json`에 인덱스가 추가되어 있습니다.

배포:
```bash
firebase deploy --only firestore:indexes
```

### 방법 2: Firebase Console에서 수동 생성

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트 선택: `yago-vibe-spt`

2. **Firestore Database → Indexes 탭**

3. **"인덱스 만들기" 클릭**

4. **eventLogs 인덱스 생성:**
   - 컬렉션 ID: `eventLogs`
   - 필드 추가:
     - `createdAt` → 오름차순
     - `eventName` → 오름차순
   - 쿼리 범위: 컬렉션
   - "만들기" 클릭

5. **activityLogs 인덱스 생성:**
   - 컬렉션 ID: `activityLogs`
   - 필드 추가:
     - `createdAt` → 오름차순
     - `event` → 오름차순
   - 쿼리 범위: 컬렉션
   - "만들기" 클릭

---

## ⏱️ 인덱스 생성 시간

- **소규모 데이터**: 1~3분
- **대규모 데이터**: 10~30분
- **매우 큰 데이터**: 1시간 이상

인덱스 생성 중에도 앱은 정상 작동합니다 (다른 쿼리는 영향 없음).

---

## ✅ 인덱스 생성 확인

1. Firebase Console → Firestore → Indexes
2. 생성된 인덱스 목록 확인
3. 상태 확인:
   - 🟡 **빌드 중**: 인덱스 생성 중
   - 🟢 **사용 가능**: 인덱스 준비 완료

---

## 🧪 테스트

인덱스 생성 완료 후:

1. Admin Dashboard 접속
2. FunnelPanel 로드 확인
3. 콘솔에서 에러 없음 확인:
   ```
   ✅ [FunnelPanel] 실시간 업데이트: {...}
   ```
4. 유저 행동 → 1~2초 내 숫자 업데이트 확인

---

## ⚠️ 인덱스 오류 발생 시

브라우저 콘솔에 다음 에러가 표시될 수 있습니다:

```
FirebaseError: The query requires an index
```

이 경우:
1. 에러 메시지에 포함된 인덱스 생성 링크 클릭
2. 또는 위의 "방법 2"로 수동 생성

---

## 📝 참고

- 인덱스는 **무료**입니다 (Firestore 무료 플랜 포함)
- 인덱스는 **자동으로 유지**됩니다 (데이터 변경 시 자동 업데이트)
- 인덱스 생성 후에는 **영구적으로 유지**됩니다
