# 공지사항 데이터 마이그레이션 가이드

## 🎯 목표

Firestore Emulator의 `notices` 루트 컬렉션 데이터를 `associations/{associationId}/notices` 서브컬렉션 구조로 이동

---

## 📋 마이그레이션 절차

### 1. 현재 데이터 확인

**Emulator UI에서 확인:**
- `http://localhost:4001` → Firestore 탭
- `notices` 컬렉션의 모든 문서 확인
- 각 문서의 필드 구조 확인

### 2. 대상 협회(Association) 확인

**필요한 정보:**
- `associationId`: 예) `assoc-nowon-football`
- 협회 문서 존재 여부 확인

### 3. 데이터 이동 (Emulator UI에서)

**방법 A: 수동 이동 (권장)**

1. Emulator UI → Firestore 탭
2. `notices` 컬렉션의 각 문서 확인
3. 새 경로로 데이터 생성:
   - Collection: `associations`
   - Document ID: `assoc-nowon-football` (또는 실제 associationId)
   - 하위 컬렉션 추가:
     - Collection: `notices`
     - Document ID: (기존 문서 ID 또는 새로 생성)
     - 필드 복사:
       - `title`
       - `content`
       - `status`: `"published"`
       - `isOfficial`: `true`
       - `createdAt`: (기존 timestamp 유지)
       - 기타 필요한 필드

**방법 B: 스크립트로 이동 (대량 데이터용)**

브라우저 콘솔에서 실행:

```javascript
// 1. 기존 notices 데이터 읽기
import('firebase/firestore').then(({ collection, getDocs }) => {
  import('/src/lib/firebase').then(({ db }) => {
    const oldNoticesRef = collection(db, 'notices');
    getDocs(oldNoticesRef).then(snap => {
      console.log('기존 공지 개수:', snap.docs.length);
      
      // 2. 새 경로로 데이터 복사
      const associationId = 'assoc-nowon-football'; // 실제 ID로 변경
      snap.docs.forEach(async (doc) => {
        const data = doc.data();
        const newRef = collection(db, `associations/${associationId}/notices`);
        
        // 새 문서 생성
        import('firebase/firestore').then(({ addDoc }) => {
          addDoc(newRef, {
            ...data,
            // createdAt은 기존 값 유지
          }).then(newDoc => {
            console.log('✅ 공지 이동 완료:', doc.id, '→', newDoc.id);
          });
        });
      });
    });
  });
});
```

### 4. 데이터 검증

**확인 사항:**
- `associations/{associationId}/notices`에 문서가 생성되었는지
- 필드가 모두 복사되었는지
- `status: "published"` 확인
- `createdAt` timestamp 유지 확인

### 5. 기존 데이터 정리 (선택)

마이그레이션 완료 후 `notices` 루트 컬렉션 삭제 가능 (테스트 데이터인 경우)

---

## ⚠️ 주의사항

1. **Timestamp 유지**: `createdAt` 필드는 반드시 기존 timestamp 유지
2. **문서 ID**: 기존 ID를 유지하거나 새로 생성 가능 (중요하지 않음)
3. **필드 누락 방지**: 모든 필드를 복사해야 함

---

## ✅ 마이그레이션 완료 체크리스트

- [ ] `associations/{associationId}/notices`에 공지 문서 생성됨
- [ ] 모든 필드가 정상적으로 복사됨
- [ ] 프론트엔드에서 공지가 정상 표시됨
- [ ] 기존 `notices` 루트 컬렉션 정리 (선택)

---

## 🔄 실서비스 마이그레이션

실서비스 Firestore로 전환 시:
1. 위 절차를 Firebase Console에서 동일하게 수행
2. 또는 Cloud Functions로 마이그레이션 스크립트 실행
