# 📘 ARCHITECTURE.md (FINAL)

## 목적

이 문서는 팀/권한/멤버십 도메인의 단일 기준이다.

여기 적힌 구조와 규칙은 변경 시 반드시 합의가 필요하다.

## 핵심 원칙 (TL;DR)

- **자동화 → 규칙 → 문서**
- **권한의 진실은 오직 하나**
- **생성은 서버, 검증은 Rules**
- **캐시는 캐시일 뿐, 진실 아님**

## 데이터 모델 (정본)

```
/users/{uid}

/teams/{teamId}
  ├─ members/{uid}        ← 권한의 단일 진실
  ├─ blog
  ├─ blog_posts
  ├─ fees
  └─ auditLogs

/team_members/{teamId_uid} ← 조회용 인덱스
```

## 권한 모델 (Single Source of Truth)

### ✅ 유일한 권한 기준

`/teams/{teamId}/members/{uid}`

### ❌ 금지

- `team_members`로 권한 판단
- `users` 문서에 team 정보 저장
- 클라이언트에서 members 생성/수정

## 팀 생성 원칙 (Atomic)

**팀은 멤버 없이는 존재할 수 없다**

### 서버 플로우

1. team 생성
2. owner → members/{uid} (admin)
3. team_members 인덱스 생성
   → **트랜잭션으로 묶임**

**실패 시: 팀 생성 자체가 실패**

## members 규칙 (절대 변경 금지)

- 문서 ID = uid
- `addDoc` ❌
- `setDoc(doc(uid))` ⭕
- 서버만 write 가능

## team_members 컬렉션의 정체

- **목적**: 조회 최적화
- **역할**: 캐시
- **권한 판단**: ❌

👉 **삭제돼도 서비스는 정상 동작해야 함**

## Firestore Rules 철학

- Rules는 검증만 한다
- 생성/수정/권한 부여 ❌
- 서버가 만든 구조를 깨지 못하게 막는다

## 흔한 실수 (금지 목록)

- `addDoc`으로 members 생성
- uid 필드는 있는데 문서 ID 랜덤
- `team_members`로 관리자 판단
- prod/emulator 혼용
- Rules보다 프론트 먼저 의심

## 변경 시 체크리스트

변경하려는 사람이 아래 질문에 모두 **YES**여야 한다.

- 단일 진실 소스는 유지되는가?
- 서버-only 원칙은 유지되는가?
- 캐시를 진실로 쓰지 않는가?
- 트랜잭션 원자성은 깨지지 않는가?

## 이 문서의 지위

- "참고 문서" ❌
- **"헌법"** ⭕

