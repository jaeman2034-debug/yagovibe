# ⚡ 관리자 권한 즉시 수정 가이드

## 🎯 한 줄 답변

**관리자 판정 방식**: `associations/{associationId}/members/{uid}` 문서의 `role == "admin"` **또는** `associations/{associationId}` 문서의 `adminUids` 배열

---

## 🔧 즉시 실행 순서

### 1단계: 권한 검증 (브라우저 콘솔)

```javascript
// verify-admin-permission.js 파일 내용을 콘솔에 복사-붙여넣기
```

### 2단계: 문제 발견 시 Firestore Console에서 수정

#### 케이스 A: members 문서 없음
```
경로: associations/{associationId}/members/{uid}
문서 ID: {현재 사용자 UID}
필드: role = "admin" (string)
```

#### 케이스 B: adminUids가 배열이 아님
```
경로: associations/{associationId}
필드: adminUids
타입: array (배열)
값: [현재 사용자 UID, ...]
```

### 3단계: 하드 리프레시
- Ctrl+Shift+R
- 또는 시크릿 모드 재접속

### 4단계: 버튼 확인
- "팀원 명단 잠금" 버튼 활성화 여부 확인

---

## ✅ 합격 조건

- [ ] 권한 검증 스크립트 결과: ✅ 관리자
- [ ] 콘솔 권한 오류: 0건
- [ ] 승인 팀 수 정상 표시
- [ ] 버튼 활성화
