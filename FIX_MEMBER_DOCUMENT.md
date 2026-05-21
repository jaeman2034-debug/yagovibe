# 🔧 teams/{teamId}/members/{uid} 문서 수정 가이드

## 🚨 발견된 문제

### 현재 상태
- **문서 ID**: `OYQAx6XQpSyK7hQ0Cyqf` (랜덤 ID) ❌
- **uid 필드**: `iUZB8RjKlEhb3uotZ6yqtpWtUQE2` ✅
- **role 필드**: `"일반"` ❌ (admin이어야 함)

### 문제점
TeamContext는 다음 경로를 찾습니다:
```
teams/7EvUSvUeWiYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2
```

하지만 실제 문서는:
```
teams/7EvUSvUeWiYBxybFsHXE/members/OYQAx6XQpSyK7hQ0Cyqf
```

**문서 ID가 uid와 일치하지 않아서 찾을 수 없습니다!**

---

## ✅ 해결 방법

### 방법 1: 새 문서 생성 (권장)

1. **Firestore Console에서**
   - 경로: `teams/7EvUSvUeWiYBxybFsHXE/members`
   - "문서 추가" 클릭
   - **문서 ID**: `iUZB8RjKlEhb3uotZ6yqtpWtUQE2` (정확히 입력)
   - 필드:
     ```
     role: "admin" (string)
     joinedAt: [Timestamp] (현재 시간)
     uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2" (선택)
     ```

2. **기존 문서는 유지** (다른 용도로 사용 가능)

### 방법 2: 기존 문서 수정 (선택)

1. **기존 문서 `OYQAx6XQpSyK7hQ0Cyqf` 수정**
   - `role` 필드를 `"admin"`으로 변경
   - **하지만 문서 ID는 변경 불가능** (새 문서 생성 필요)

---

## 📋 정확한 문서 구조

### 올바른 구조
```
teams/7EvUSvUeWiYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2
  ├─ role: "admin" (string)
  ├─ joinedAt: Timestamp
  └─ uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2" (선택)
```

**핵심**: 문서 ID가 `uid`와 정확히 일치해야 합니다!

---

## 🔍 TeamContext가 찾는 경로

```typescript
// src/context/TeamContext.tsx 189줄
const memberDocRef = doc(db, "teams", teamId, "members", user.uid);
// → teams/7EvUSvUeWiYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2
```

---

## ✅ 체크리스트

- [ ] `teams/7EvUSvUeWiYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2` 문서 생성
- [ ] 문서 ID가 `iUZB8RjKlEhb3uotZ6yqtpWtUQE2`와 정확히 일치
- [ ] `role: "admin"` 필드 설정
- [ ] `joinedAt` 필드 설정
- [ ] 페이지 새로고침
- [ ] "우리 팀 관리" 정상 진입

---

**작성일**: 2024년
**상태**: ✅ 문제 원인 확인 완료

