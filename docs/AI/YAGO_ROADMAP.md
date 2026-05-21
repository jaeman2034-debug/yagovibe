# YAGO 리팩토링 로드맵

**생성일**: 2025-01-27  
**현재 Phase**: Phase 1 - 문서화 및 ChatPage 분석

---

## 전체 로드맵 개요

```
Phase 1: 문서화 + ChatPage 분석          [현재]
    ↓
Phase 2: ChatPage UI 분리 시작
    ↓
Phase 3: ChatPage 훅 및 서비스 추출
    ↓
Phase 4: Chat 도메인 완전 분리
    ↓
Phase 5: 서비스 레이어 구축 (전역)
    ↓
Phase 6: Market 도메인 정리
    ↓
Phase 7: Map 도메인 안정화
    ↓
Phase 8: Activity/Team 도메인 정리
    ↓
Phase 9: 최종 통합 및 테스트
```

---

## Phase 1: 문서화 및 ChatPage 분석 ✅ (진행 중)

### 목표
- 프로젝트 기준 문서 생성
- ChatPage.tsx 정밀 분석
- 안전한 리팩토링 계획 수립

### 작업 내용
- [x] `docs/AI/` 폴더 생성
- [x] `YAGO_PROJECT_CONTEXT.md` 작성
- [x] `YAGO_ARCHITECTURE.md` 작성
- [x] `YAGO_ROADMAP.md` 작성
- [ ] ChatPage.tsx 정밀 분석 (다음 단계)

### 산출물
- 프로젝트 컨텍스트 문서
- 아키텍처 설계 문서
- 리팩토링 로드맵

### 예상 기간
**1일**

---

## Phase 2: 폴더 구조 생성 (다음)

### 목표
- 목표 아키텍처 폴더 구조 생성
- 기존 파일은 아직 이동하지 않음

### 작업 내용
- [ ] `src/app/` 폴더 구조 생성
- [ ] `src/core/` 폴더 구조 생성
- [ ] `src/features/` 폴더 구조 생성
- [ ] `src/shared/` 폴더 구조 생성
- [ ] 기존 파일은 그대로 유지

### 산출물
- 목표 폴더 구조
- 마이그레이션 준비 완료

### 예상 기간
**1일**

---

## Phase 3: ChatPage UI 분리 시작

### 목표
- ChatPage.tsx에서 UI 컴포넌트만 추출
- 비즈니스 로직은 아직 유지

### 작업 내용
- [ ] `ChatHeader` 컴포넌트 추출
- [ ] `MessageList` 컴포넌트 추출
- [ ] `MessageBubble` 컴포넌트 추출
- [ ] `ChatInput` 컴포넌트 추출
- [ ] `MediaPreview` 컴포넌트 추출
- [ ] ChatPage.tsx에서 props로 전달

### 산출물
- `src/features/chat/components/` 생성
- ChatPage.tsx 줄 수 감소 (2,520 → ~1,500줄 예상)

### 예상 기간
**3-5일**

### 리스크
- Props drilling 발생 가능
- 상태 관리 복잡도 증가 가능

---

## Phase 4: ChatPage 훅 추출

### 목표
- 상태 관리 로직을 커스텀 훅으로 추출
- Firebase 호출은 아직 컴포넌트에 유지

### 작업 내용
- [ ] `useChatMessages` 훅 추출
- [ ] `useChatRoom` 훅 추출
- [ ] `useChatSend` 훅 추출
- [ ] `useChatMedia` 훅 추출
- [ ] `useChatSTT` 훅 추출

### 산출물
- `src/features/chat/hooks/` 생성
- ChatPage.tsx 줄 수 감소 (~1,500 → ~800줄 예상)

### 예상 기간
**5-7일**

### 리스크
- 훅 간 의존성 복잡도 증가
- 상태 동기화 문제 가능

---

## Phase 5: Chat 서비스 레이어 구축

### 목표
- Firebase 호출을 서비스 레이어로 이동
- 컴포넌트는 서비스만 호출

### 작업 내용
- [ ] `chatService.ts` 생성 (Firestore 호출)
- [ ] `messageService.ts` 생성
- [ ] `roomService.ts` 생성
- [ ] `mediaService.ts` 생성
- [ ] 컴포넌트에서 서비스 호출로 변경

### 산출물
- `src/features/chat/services/` 생성
- ChatPage.tsx 줄 수 감소 (~800 → ~200줄 예상)

### 예상 기간
**5-7일**

### 리스크
- 서비스 레이어 설계 오류
- 타입 정의 불일치

---

## Phase 6: Chat 도메인 완전 분리

### 목표
- Chat 도메인을 완전히 독립적으로 분리
- 다른 도메인과의 의존성 제거

### 작업 내용
- [ ] Chat 타입 정의 정리
- [ ] Chat 관련 유틸리티 이동
- [ ] Chat 관련 상수 이동
- [ ] 의존성 정리 및 테스트

### 산출물
- 완전히 독립적인 Chat 도메인
- ChatPage.tsx 최종 버전 (~200줄 이하)

### 예상 기간
**3-5일**

---

## Phase 7: 서비스 레이어 구축 (전역)

### 목표
- 모든 도메인에 서비스 레이어 적용
- Firebase 호출 표준화

### 작업 내용
- [ ] Market 서비스 레이어 구축
- [ ] Team 서비스 레이어 구축
- [ ] Activity 서비스 레이어 구축
- [ ] Map 서비스 레이어 구축
- [ ] 공통 서비스 패턴 정의

### 산출물
- 모든 도메인에 서비스 레이어 적용
- 표준화된 Firebase 호출 패턴

### 예상 기간
**2-3주**

---

## Phase 8: Market 도메인 정리

### 목표
- 155개 파일 구조 정리
- 기능별 그룹화 및 중복 제거

### 작업 내용
- [ ] Market 컴포넌트 그룹화
- [ ] Market 서비스 통합
- [ ] Market 타입 정의 정리
- [ ] Cloud Functions 정리 (선택적)

### 산출물
- 정리된 Market 도메인 구조
- 중복 제거 및 재사용성 향상

### 예상 기간
**3-4주**

---

## Phase 9: Map 도메인 안정화

### 목표
- Map 관련 버그 수정
- 안정적인 구조로 재구성

### 작업 내용
- [ ] Map 컴포넌트 안정화
- [ ] Map 서비스 레이어 구축
- [ ] 모바일 레이아웃 최종 검증
- [ ] 성능 최적화

### 산출물
- 안정적인 Map 도메인
- 모바일/데스크톱 모두 안정화

### 예상 기간
**1-2주**

---

## Phase 10: Activity/Team 도메인 정리

### 목표
- 나머지 도메인 정리
- 전체 아키텍처 일관성 확보

### 작업 내용
- [ ] Activity 도메인 정리
- [ ] Team 도메인 정리
- [ ] 공통 컴포넌트 `shared/`로 이동
- [ ] 의존성 최종 정리

### 산출물
- 완전히 정리된 프로젝트 구조
- 일관된 아키텍처

### 예상 기간
**1-2주**

---

## Phase 11: 최종 통합 및 테스트

### 목표
- 전체 시스템 통합 테스트
- 문서화 완료
- 배포 준비

### 작업 내용
- [ ] 전체 통합 테스트
- [ ] 성능 테스트
- [ ] 문서화 완료
- [ ] 배포 체크리스트 작성

### 산출물
- 완전히 리팩토링된 코드베이스
- 완성된 문서
- 배포 준비 완료

### 예상 기간
**1주**

---

## 전체 일정 요약

| Phase | 작업 내용 | 예상 기간 | 누적 기간 |
|-------|----------|----------|----------|
| Phase 1 | 문서화 + 분석 | 1일 | 1일 |
| Phase 2 | 폴더 구조 생성 | 1일 | 2일 |
| Phase 3 | ChatPage UI 분리 | 3-5일 | 5-7일 |
| Phase 4 | ChatPage 훅 추출 | 5-7일 | 10-14일 |
| Phase 5 | Chat 서비스 레이어 | 5-7일 | 15-21일 |
| Phase 6 | Chat 도메인 완전 분리 | 3-5일 | 18-26일 |
| Phase 7 | 서비스 레이어 구축 (전역) | 2-3주 | 5-7주 |
| Phase 8 | Market 도메인 정리 | 3-4주 | 8-11주 |
| Phase 9 | Map 도메인 안정화 | 1-2주 | 9-13주 |
| Phase 10 | Activity/Team 정리 | 1-2주 | 10-15주 |
| Phase 11 | 최종 통합 및 테스트 | 1주 | 11-16주 |

**총 예상 기간**: **11-16주 (약 3-4개월)**

---

## 현재 우선순위

### 🔥 최우선 (지금 바로)
1. **Phase 1**: 문서화 및 ChatPage 분석
2. **Phase 2**: 폴더 구조 생성
3. **Phase 3**: ChatPage UI 분리 시작

### ⚠️ 다음 단계
4. **Phase 4**: ChatPage 훅 추출
5. **Phase 5**: Chat 서비스 레이어 구축

### 📋 이후 계획
6. **Phase 6-11**: 나머지 도메인 정리

---

## 성공 기준

### Phase 1-3 완료 시
- [ ] ChatPage.tsx가 2,520줄 → 1,500줄 이하
- [ ] UI 컴포넌트가 독립적으로 추출됨
- [ ] 빌드 성공 및 기본 동작 확인

### Phase 4-6 완료 시
- [ ] ChatPage.tsx가 200줄 이하
- [ ] Chat 도메인이 완전히 독립적
- [ ] 서비스 레이어가 구축됨

### 전체 완료 시
- [ ] 모든 도메인이 독립적으로 분리됨
- [ ] 서비스 레이어가 모든 도메인에 적용됨
- [ ] 테스트 가능한 구조로 변경됨
- [ ] 문서화 완료

---

## 참고 문서

- [YAGO_PROJECT_CONTEXT.md](./YAGO_PROJECT_CONTEXT.md) - 프로젝트 컨텍스트
- [YAGO_ARCHITECTURE.md](./YAGO_ARCHITECTURE.md) - 아키텍처 설계
