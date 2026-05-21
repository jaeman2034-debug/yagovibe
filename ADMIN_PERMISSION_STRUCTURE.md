# 관리자 권한 구조 설계 문서

## 🎯 목표

협회 관리자(Association Admin)와 슈퍼 관리자(Super Admin)의 권한을 명확히 분리하고, Firestore Rules와 프론트엔드 로직을 일관되게 유지합니다.

---

## 📋 권한 구조

### 1. 협회 관리자 (Association Admin)
**정의:** 특정 협회(`association`)의 공지를 관리할 수 있는 권한

**권한 범위:**
- ✅ 해당 협회의 공지 생성/수정/삭제
- ✅ 해당 협회의 공지 게시 (`status: "published"`)
- ✅ 해당 협회의 공지 고정 (`isPinned: true`)
- ❌ 다른 협회의 공지 관리 불가

**저장 위치:**
```javascript
associations/{associationId}
├── adminUids: ["uid1", "uid2", ...]  // 배열 타입
```

**Firestore Rules 체크:**
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}
```

---

### 2. 슈퍼 관리자 (Super Admin)
**정의:** 모든 협회의 공지를 관리할 수 있는 권한

**권한 범위:**
- ✅ 모든 협회의 공지 생성/수정/삭제
- ✅ 모든 협회의 공지 게시
- ✅ 모든 협회의 공지 고정
- ✅ 시스템 전체 설정 관리

**저장 위치 (선택적):**
```javascript
users/{uid}
├── role: "SUPER_ADMIN"  // 또는 별도 컬렉션
```

**Firestore Rules 체크 (선택적):**
```javascript
function isSuperAdmin() {
  return request.auth != null &&
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "SUPER_ADMIN";
}
```

---

## 🔧 현재 구현 방식

### 프론트엔드: Firestore 문서 기반 권한 체크

**Hook: `useIsAssociationAdmin`**
```typescript
// src/hooks/useIsAssociationAdmin.ts
export function useIsAssociationAdmin(associationId?: string) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!associationId || !user?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    
    const checkAdmin = async () => {
      const assocRef = doc(db, 'associations', associationId);
      const assocSnap = await getDoc(assocRef);
      
      if (assocSnap.exists()) {
        const data = assocSnap.data();
        const adminUids = data.adminUids || [];
        setIsAdmin(Array.isArray(adminUids) && adminUids.includes(user.uid));
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };
    
    checkAdmin();
  }, [associationId, user?.uid]);
  
  return { isAdmin, loading };
}
```

**장점:**
- ✅ 실시간 권한 변경 가능
- ✅ Custom Claims 불필요
- ✅ 단순한 구조

**단점:**
- ⚠️ Firestore 읽기 비용 발생
- ⚠️ `adminUids` 배열 타입 관리 필요

---

### Firestore Rules: 동일한 방식

**Rules 함수:**
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}
```

**일관성:** ✅ 프론트엔드와 Rules가 동일한 방식으로 권한 체크

---

## 🔄 권한 체크 플로우

### 공지 생성/수정 시

```
1. 사용자가 "게시하기" 클릭
   ↓
2. 프론트엔드: useIsAssociationAdmin 체크
   - isAdmin === true → 버튼 활성화
   - isAdmin === false → 버튼 비활성화
   ↓
3. handleSave 실행
   ↓
4. Firestore write 시도
   ↓
5. Firestore Rules: isAssociationAdmin 체크
   - true → write 허용
   - false → write 거부 (Missing or insufficient permissions)
   ↓
6. 결과 반환
   - 성공 → Toast + Drawer 닫기
   - 실패 → 에러 UI 표시 + draft로 롤백
```

---

## ✅ 권한 구조 체크리스트

### 데이터 구조
- [ ] `associations/{id}.adminUids`가 **배열 타입**인지 확인
- [ ] `adminUids` 배열에 관리자 UID 포함 확인
- [ ] 슈퍼 관리자 필드 설정 (선택적)

### Firestore Rules
- [ ] `isAssociationAdmin` 함수 정상 작동
- [ ] `adminUids is list` 타입 체크 포함
- [ ] 관리자는 `status: "published"` 생성/수정 가능
- [ ] 일반 유저는 `draft` 상태에서만 수정 가능

### 프론트엔드
- [ ] `useIsAssociationAdmin` 훅 정상 작동
- [ ] `useIsAssociationSuperAdmin` 훅 구현 (선택적)
- [ ] 권한에 따른 UI 분기 정상 작동

---

## 🎯 권장 사항

### 현재 구조 유지 (권장)
- ✅ Firestore 문서 기반 권한 체크
- ✅ 실시간 권한 변경 가능
- ✅ Custom Claims 불필요

### 개선 사항 (선택적)
- 🔄 슈퍼 관리자 지원 추가
- 🔄 권한 캐싱 (성능 최적화)
- 🔄 권한 변경 알림 (실시간)

---

## 📝 다음 단계

1. ✅ Firestore Rules 배포
2. ✅ `adminUids` 배열 타입 확인 및 수정
3. ✅ Rules Simulator 테스트
4. ✅ 게시 버튼 테스트
5. ✅ 권한 구조 문서화 완료

