# 🔧 Firestore Rules 배포 확인

## ✅ 수정 완료된 Rules

### Teams 컬렉션
```rules
match /teams/{teamId} {
  allow read: if isAssociationAdmin(associationId);
  ...
}
```

### Stats 컬렉션
```rules
match /stats/{statId} {
  allow read: if isAssociationAdmin(associationId);
  allow write: if false;
}
```

### Phase Events 컬렉션
```rules
match /phaseEvents/{eventId} {
  allow read: if isAssociationAdmin(associationId);
  allow write: if false;
}
```

### Ops Logs 컬렉션
```rules
match /opsLogs/{logId} {
  allow read: if isAssociationAdmin(associationId);
  allow write: if false;
}
```

## 📝 배포 명령어

```bash
firebase deploy --only firestore:rules
```

## ✅ 배포 후 확인

1. **브라우저 완전 새로고침** (Ctrl+Shift+R)
2. **콘솔 확인**: 권한 오류 사라졌는지 확인
3. **버튼 확인**: "팀원 명단 잠금" 버튼 활성화 여부

## 🔍 문제 지속 시

### 확인 사항
1. Rules 배포 성공 여부 확인
2. `isAssociationAdmin` 함수가 제대로 작동하는지 확인
3. `associations/{associationId}` 문서의 `adminUids` 배열에 현재 사용자 UID가 포함되어 있는지 확인

### 디버깅
```javascript
// 브라우저 콘솔에서
const associationRef = doc(db, `associations/${associationId}`);
const associationSnap = await getDoc(associationRef);
console.log("adminUids:", associationSnap.data()?.adminUids);
console.log("현재 사용자 UID:", auth.currentUser?.uid);
```
