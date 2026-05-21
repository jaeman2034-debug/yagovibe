# 🔥 Firebase 무한 루프 방지 가이드

**생성일**: 2025-01-27  
**목적**: Firestore 트리거가 자기 자신을 다시 트리거하는 무한 루프 방지  
**상태**: 🔍 진단 중

---

## 🔴 무한 루프 발생 가능한 패턴

### 1️⃣ 자기 자신을 업데이트하는 트리거

**위험한 패턴:**
```typescript
export const onDocumentWrite = onDocumentWritten(
  "collection/{docId}",
  async (event) => {
    // ❌ 위험: 같은 문서를 업데이트하면 다시 트리거 발생
    await event.data?.after?.ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
```

**문제점:**
- 트리거가 실행됨
- 문서 업데이트
- 다시 트리거 발생
- 무한 루프

---

## ✅ 해결 방법

### 방법 1: 변경 감지 가드 추가

```typescript
export const onDocumentWrite = onDocumentWritten(
  "collection/{docId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    
    // 🔥 가드: 실제로 변경이 필요한 경우만 업데이트
    if (JSON.stringify(before) === JSON.stringify(after)) {
      return; // 변경 없음, 스킵
    }
    
    // 🔥 가드: 특정 필드가 변경된 경우만 업데이트
    if (before?.status === after?.status) {
      return; // status 변경 없음, 스킵
    }
    
    // 업데이트 진행
    await event.data?.after?.ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
```

---

### 방법 2: 플래그 필드 사용

```typescript
export const onDocumentWrite = onDocumentWritten(
  "collection/{docId}",
  async (event) => {
    const after = event.data?.after?.data();
    
    // 🔥 가드: 이미 처리된 문서는 스킵
    if (after?.processed === true) {
      return;
    }
    
    // 처리 로직
    await event.data?.after?.ref.update({
      processed: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
```

---

### 방법 3: 다른 컬렉션에 쓰기

```typescript
export const onDocumentWrite = onDocumentWritten(
  "collection/{docId}",
  async (event) => {
    const docId = event.params.docId;
    
    // 🔥 안전: 다른 컬렉션에 쓰기 (트리거 재발생 없음)
    await db.collection("logs").add({
      docId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
```

---

## 🔍 현재 코드에서 확인해야 할 트리거

### 1. `generateTTSAndPDF.ts`

**위치**: `functions/src/generateTTSAndPDF.ts:141`

**현재 코드:**
```typescript
await event.data?.after?.ref.update({
  audioURL: audioURL || after.audioURL || null,
  pdfURL,
  voice: after.voice || "ko-KR-Standard-A",
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

**확인 필요:**
- 이 업데이트가 다시 트리거를 발생시키는지
- 가드 로직이 있는지

---

### 2. `recomputeStandingsOnMatchUpdate.ts`

**위치**: `functions/src/tournament/recomputeStandingsOnMatchUpdate.ts`

**확인 필요:**
- match 문서를 업데이트하는지
- 가드 로직이 있는지

---

### 3. `onMatchWriteRecomputeStats.ts`

**위치**: `functions/src/tournament/onMatchWriteRecomputeStats.ts`

**확인 필요:**
- stats 문서를 업데이트할 때 match 트리거를 다시 발생시키는지

---

## 🚨 즉시 조치 사항

### 1. Functions 로그 확인

```bash
firebase functions:log -n 200 | Select-String -Pattern "createTeam|generateTTS|recompute"
```

**확인 사항:**
- 같은 함수가 반복 호출되는지
- 호출 간격이 너무 짧은지 (무한 루프 의심)

---

### 2. Firestore 사용량 확인

Firebase Console → Firestore → Usage

**확인 사항:**
- 읽기/쓰기 횟수가 비정상적으로 높은지
- 특정 컬렉션이 급증하는지

---

### 3. Functions 비용 확인

Firebase Console → Functions → Usage

**확인 사항:**
- 함수 호출 횟수가 비정상적으로 높은지
- 특정 함수가 반복 호출되는지

---

## 📋 체크리스트

- [ ] Functions 로그에서 반복 호출 확인
- [ ] Firestore 사용량 확인
- [ ] Functions 비용 확인
- [ ] 무한 루프 발생 트리거 식별
- [ ] 가드 로직 추가
- [ ] 재배포 및 테스트

---

**작성일**: 2025-01-27  
**상태**: 🔍 진단 가이드 작성 완료  
**다음 단계**: Functions 로그 확인 및 무한 루프 발생 트리거 식별
