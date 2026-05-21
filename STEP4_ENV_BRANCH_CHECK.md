# 🔍 STEP 4-1: 환경 분기 코드 확인

## 📌 목표
DEV 환경에서만 Emulator 연결, 운영 환경에서는 자동 해제 확인

## ✅ 확인 사항

### 1. Firebase 초기화 코드 확인
**파일**: `src/lib/firebase.ts`

**필수 조건**:
```typescript
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8086);
}
```

### 2. 빌드 테스트
```bash
npm run build
```

**확인 사항**:
- 빌드 결과에서 Emulator 연결 코드가 제거되었는지
- `dist/` 폴더의 번들에서 `localhost:9099` 또는 `localhost:8086` 참조 없음

### 3. 프로덕션 모드 테스트
- `https://실도메인` 접속
- Network 탭 확인: `localhost:9099`, `localhost:8086`로 요청 없음

---

## ⚠️ 주의사항

**이거 하나 틀리면 운영에서 전부 로컬로 붙는 사고 발생**

- Emulator 연결 코드가 프로덕션 빌드에 포함되면
- 운영 환경에서 `localhost:9099`로 요청 시도
- → 연결 실패 → 서비스 전체 다운

---

## 🔍 확인 방법

1. **코드 확인**: `src/lib/firebase.ts`에서 `import.meta.env.DEV` 조건 확인
2. **빌드 확인**: `npm run build` 후 번들 분석
3. **프로덕션 테스트**: 실제 도메인 접속 테스트
