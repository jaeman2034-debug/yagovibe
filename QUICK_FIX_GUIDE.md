# ⚡ 빠른 수정 가이드 (즉시 적용)

## 🎯 문제 요약

- **현재 데이터**: `team_members/{docId}` (루트 컬렉션)
- **필요한 구조**: `teams/{teamId}/members/{uid}` (서브컬렉션)
- **결과**: "우리 팀 관리"에서 팀이 없다고 나옴

---

## ✅ 즉시 해결 방법 (5분 컷)

### STEP 1: Firestore Console에서 문서 생성

1. **Firestore Console 열기**
   - https://console.firebase.google.com/project/yago-vibe-spt/firestore

2. **경로로 이동**
   - `teams` → `7EVuSVuWeIYBxybFsHXE` → `members` (서브컬렉션)

3. **문서 추가**
   - 문서 ID: `iUZB8RjKlEhb3uotZ6yqtpWtUQE2`
   - 필드:
     ```
     role: "admin" (string)
     joinedAt: [Timestamp] (현재 시간)
     ```

4. **ownerUid 확인 (선택)**
   - `teams/7EVuSVuWeIYBxybFsHXE` 문서 확인
   - `ownerUid` 필드가 `iUZB8RjKlEhb3uotZ6yqtpWtUQE2`인지 확인

### STEP 2: 페이지 새로고침

- 브라우저에서 `Ctrl + Shift + R` (캐시 무시 새로고침)
- "우리 팀 관리" 클릭
- ✅ 정상 진입 확인

---

## 📝 변경된 코드

### ✅ TeamContext.tsx
- `team_members` 루트 컬렉션 조회 → `teams/{teamId}/members/{uid}` 서브컬렉션 조회로 변경

### ✅ requireAdmin.ts
- `teams/{teamId}/members/{uid}` 우선 확인 (3순위)
- `team_members` 레거시 지원 유지 (4순위)

### ✅ firestore.rules
- `teams/{teamId}/members/{uid}` 구조 기준으로 권한 체크

---

## 🔄 자동 마이그레이션 (선택)

나중에 모든 `team_members` 데이터를 자동으로 마이그레이션하려면:

```bash
# 마이그레이션 스크립트 실행
npx ts-node scripts/migrate-team-members.ts
```

또는 Functions로 HTTP 엔드포인트 생성 후 호출

---

## ✅ 검증 체크리스트

- [ ] `teams/7EVuSVuWeIYBxybFsHXE/members/iUZB8RjKlEhb3uotZ6yqtpWtUQE2` 문서 생성됨
- [ ] `role: "admin"` 필드 존재
- [ ] `joinedAt` 필드 존재
- [ ] 페이지 새로고침 완료
- [ ] "우리 팀 관리" 정상 진입
- [ ] 권한 기반 기능 정상 작동

---

**작성일**: 2024년
**상태**: ✅ 즉시 적용 가능

