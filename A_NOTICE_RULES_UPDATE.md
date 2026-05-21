# 🔥 A: 공지 Rules 업데이트 (ownerUid 기반)

## 📌 목표
- `ownerUid == request.auth.uid` → write 가능
- 일반 사용자 → read only

## ✅ 완료된 작업

### 1. Firestore Rules 업데이트
- `ownerUid` 기반 권한 체크 함수 `isOwner()` 추가
- `adminUids[0]` 하위 호환 지원
- 공지사항 write 권한: `isOwner()` 함수 사용

### 2. Rules 구조
```javascript
function isOwner(associationId) {
  let assocDoc = get(/databases/$(database)/documents/associations/$(associationId));
  return request.auth != null
    && exists(assocDoc)
    && (
      // ownerUid 기반 (새 구조)
      (assocDoc.data.ownerUid != null && assocDoc.data.ownerUid == request.auth.uid) ||
      // adminUids[0] 기반 (하위 호환)
      (assocDoc.data.adminUids is list && assocDoc.data.adminUids.size() > 0 && assocDoc.data.adminUids[0] == request.auth.uid)
    );
}
```

## ⚠️ 주의사항

### 1. associations 문서에 `ownerUid` 필드 필요
- 기존 데이터는 `adminUids` 배열을 사용
- `adminUids[0]`을 `ownerUid`로 사용하는 하위 호환 제공
- 새로운 협회 생성 시 `ownerUid` 필드 추가 권장

### 2. 데이터 마이그레이션 (선택)
- 기존 `adminUids[0]` → `ownerUid` 필드로 마이그레이션 가능
- 현재는 하위 호환으로 둘 다 지원

## 🔄 다음 단계

1. ✅ Rules 파일 업데이트 완료
2. ⏳ Emulator에서 검증 필요
3. ⏳ associations 문서에 `ownerUid` 필드 확인/추가

## 📝 검증 체크리스트

- [ ] Rules 파일 저장 완료
- [ ] Emulator에서 공지 작성 시도 (소유자 계정)
- [ ] Emulator에서 공지 작성 시도 (일반 사용자 계정)
- [ ] permission-denied 에러 확인 (일반 사용자)
- [ ] 공지 조회는 모든 사용자 가능 확인
