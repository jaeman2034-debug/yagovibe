# 🚀 YAGO VIBE SPORTS - Cursor 개발 프롬프트

> **작성일**: 2024년  
> **목적**: 실제 개발 시 사용할 수 있는 프롬프트 모음

---

## 📋 목차

1. [협회 생성 기능](#1-협회-생성-기능)
2. [대진표 생성 기능](#2-대진표-생성-기능)
3. [AI 에이전트 기능](#3-ai-에이전트-기능)
4. [경기 결과 입력 기능](#4-경기-결과-입력-기능)
5. [순위 자동 업데이트 기능](#5-순위-자동-업데이트-기능)

---

## 1️⃣ 협회 생성 기능

### 프롬프트

```
YAGO 플랫폼의 협회 자동 생성 기능을 구현해주세요.

요구사항:
1. Cloud Function으로 createFederation 함수 생성
2. 다음 8단계를 순차적으로 실행:
   - Step 1: Federation 문서 생성
   - Step 2: 기본 페이지 9개 생성 (home, about, greeting, history, organization, notices, tournaments, matches, standings, clubs, docs, sponsors, contact)
   - Step 3: 기본 메뉴 11개 생성
   - Step 4: 관리자 계정 연결
   - Step 5: 기본 리그 3개 생성 (draft 상태)
   - Step 6: AI 에이전트 7개 생성
   - Step 7: 관리자 대시보드 초기화
   - Step 8: 홈페이지 publish

3. 배치 쓰기로 성능 최적화
4. 에러 발생 시 롤백 로직 포함
5. 생성 완료 후 검증 로직 포함

참고 문서:
- YAGO_FEDERATION_BUILDER_WORKFLOW.md
- YAGO_COMPLETE_SYSTEM_ARCHITECTURE.md

함수 위치: functions/src/federation/createFederation.ts
```

---

## 2️⃣ 대진표 생성 기능

### 프롬프트

```
YAGO 플랫폼의 자동 대진표 생성 기능을 구현해주세요.

요구사항:
1. Cloud Function으로 generateSchedule 함수 생성
2. Round Robin 알고리즘 구현:
   - N개 팀이 있을 때 (N-1) × 2 라운드 생성 (홈/어웨이 고려)
   - 팀 순환 알고리즘 적용
   - 홀수 팀 처리 (BYE 팀 추가)

3. Knockout Tournament 알고리즘 구현:
   - 시드 배정 지원
   - 브래킷 구조 생성
   - 다음 라운드 매치 연결

4. 일정 자동 배정:
   - 시작 날짜부터 경기 간격(일) 고려
   - 라운드별 경기 분산
   - 시간대 분산 (14:00, 16:00, 18:00)

5. 최적화 옵션:
   - 연속 경기 방지 (최소 3일 간격)
   - 주말 선호
   - 홈/어웨이 균형

참고 문서:
- YAGO_AUTO_SCHEDULE_GENERATOR.md

함수 위치: functions/src/league/generateSchedule.ts
```

---

## 3️⃣ AI 에이전트 기능

### 프롬프트

```
YAGO 플랫폼의 AI 에이전트 시스템을 구현해주세요.

요구사항:
1. Cloud Function으로 queryAI 함수 생성
2. 의도 분석 시스템:
   - 키워드 기반 의도 분류 (tournament, match, team, player, rule, registration, general)
   - 엔티티 추출 (날짜, ID 등)
   - 신뢰도 점수 계산

3. 에이전트별 처리 로직:
   - General Assistant: 전체 검색 및 안내
   - Tournament Guide: 대회 정보 제공
   - Match Operations: 경기 운영 보조
   - Team Registration: 팀 등록 안내
   - Player Registration: 선수 등록 안내
   - Rules & Docs: 규정 검색 및 해석
   - Admin Operations: 협회 행정 보조

4. 컨텍스트 구성:
   - Firestore에서 관련 데이터 조회
   - 에이전트별 지식 소스 활용
   - 시스템 프롬프트 동적 생성

5. OpenAI API 통합:
   - GPT-4 모델 사용
   - 에이전트별 temperature 설정
   - 대화 기록 저장

참고 문서:
- YAGO_AI_AGENT_SYSTEM.md

함수 위치: functions/src/ai/queryAI.ts
```

---

## 4️⃣ 경기 결과 입력 기능

### 프롬프트

```
YAGO 플랫폼의 경기 결과 입력 기능을 구현해주세요.

요구사항:
1. Cloud Function으로 updateMatchResult 함수 생성
2. 경기 결과 업데이트:
   - 점수 입력 (홈/어웨이)
   - 세부 점수 입력 (쿼터별, 하프타임 등)
   - 경기 이벤트 입력 (골, 어시스트, 카드 등)
   - 라인업 입력 (선발, 교체)

3. 자동 처리 트리거:
   - 경기 상태를 "completed"로 변경 시 자동 실행
   - 순위 자동 업데이트
   - 선수 통계 자동 업데이트
   - 팀 통계 자동 업데이트
   - Activity Feed 생성
   - 알림 발송

4. 권한 확인:
   - 협회 관리자 또는 경기 운영자만 가능
   - Firestore Security Rules 적용

참고 문서:
- YAGO_COMPLETE_SYSTEM_ARCHITECTURE.md (Automation Layer)

함수 위치: functions/src/match/updateMatchResult.ts
```

---

## 5️⃣ 순위 자동 업데이트 기능

### 프롬프트

```
YAGO 플랫폼의 순위 자동 업데이트 기능을 구현해주세요.

요구사항:
1. Cloud Function으로 updateStandings 함수 생성
2. 순위 계산 로직:
   - 경기 수 (played)
   - 승/무/패 (wins/draws/losses)
   - 득점/실점 (goalsFor/goalsAgainst)
   - 골득실 (goalDifference)
   - 승점 (points)
   - 최근 경기 결과 (form)

3. 정렬 기준:
   - 1순위: 승점 (내림차순)
   - 2순위: 골득실 (내림차순)
   - 3순위: 득점 (내림차순)
   - 4순위: 승수 (내림차순)

4. 배치 업데이트:
   - 시즌의 모든 팀 순위 재계산
   - Firestore 배치 쓰기 사용
   - 트랜잭션으로 일관성 보장

5. 트리거:
   - 경기 결과 입력 시 자동 실행
   - 수동 실행도 지원

참고 문서:
- YAGO_DATA_MODEL_ERD.md (standings 스키마)

함수 위치: functions/src/league/updateStandings.ts
```

---

## 6️⃣ 프론트엔드 컴포넌트

### 협회 홈페이지 컴포넌트

```
YAGO 플랫폼의 협회 홈페이지 컴포넌트를 구현해주세요.

요구사항:
1. FederationHomePage 컴포넌트 생성
2. 섹션 구성:
   - Hero Section (협회 로고, 이름, 설명)
   - Active Tournaments (진행 중인 대회)
   - Today Matches (오늘 경기)
   - Current Standings (현재 순위)
   - Featured Clubs (주요 팀)
   - Sponsors Banner (후원사)
   - AI Chatbot (우하단 고정)

3. 실시간 데이터 구독:
   - useFederation 훅 사용
   - useTournaments 훅 사용
   - useMatches 훅 사용
   - useStandings 훅 사용

4. 반응형 디자인:
   - 모바일/태블릿/데스크톱 지원
   - Tailwind CSS 사용

참고 문서:
- YAGO_FEDERATION_HOMEPAGE_DESIGN.md

파일 위치: src/pages/federations/FederationHomePage.tsx
```

---

## 7️⃣ Firestore Security Rules

### 프롬프트

```
YAGO 플랫폼의 Firestore Security Rules를 구현해주세요.

요구사항:
1. 멀티 테넌트 구조:
   - federationId 기반 데이터 분리
   - 협회별 권한 관리

2. 읽기 권한:
   - 인증된 사용자는 모든 공개 데이터 읽기 가능
   - 협회 관리자는 모든 데이터 읽기 가능

3. 쓰기 권한:
   - Federation: 플랫폼 관리자 또는 협회 슈퍼 관리자만
   - Pages: 협회 관리자만
   - Matches: 협회 관리자 또는 경기 운영자만
   - Standings: 시스템만 (Cloud Functions)

4. 권한 확인:
   - adminUids 배열 확인
   - superAdminUids 배열 확인
   - 역할 기반 권한 확인

참고 문서:
- YAGO_COMPLETE_SYSTEM_ARCHITECTURE.md (보안 아키텍처)

파일 위치: firestore.rules
```

---

## 8️⃣ 커스텀 훅

### useFederation 훅

```
YAGO 플랫폼의 useFederation 커스텀 훅을 구현해주세요.

요구사항:
1. 실시간 데이터 구독:
   - Firestore onSnapshot 사용
   - federationId 기반 조회

2. 반환값:
   - federation: 협회 정보
   - loading: 로딩 상태
   - error: 에러 상태

3. 캐싱:
   - React Query 또는 SWR 사용 (선택)
   - 로컬 상태 관리

4. 에러 처리:
   - 네트워크 에러 처리
   - 권한 에러 처리

파일 위치: src/hooks/useFederation.ts
```

---

## 9️⃣ 통합 테스트

### 프롬프트

```
YAGO 플랫폼의 통합 테스트를 작성해주세요.

요구사항:
1. 협회 생성 플로우 테스트:
   - Federation 문서 생성 확인
   - 기본 페이지 생성 확인
   - 메뉴 생성 확인
   - AI 에이전트 생성 확인

2. 대진표 생성 테스트:
   - Round Robin 대진표 생성 확인
   - Knockout 대진표 생성 확인
   - 일정 배정 확인

3. 경기 결과 입력 테스트:
   - 결과 업데이트 확인
   - 순위 자동 업데이트 확인
   - 통계 자동 업데이트 확인

4. AI 에이전트 테스트:
   - 의도 분석 정확도 확인
   - 응답 생성 확인
   - 대화 기록 저장 확인

테스트 프레임워크: Jest + Firebase Emulator
```

---

## ✅ 개발 체크리스트

### Phase 1: 기본 인프라
- [ ] Firestore 데이터 모델 구현
- [ ] Firestore Security Rules 구현
- [ ] 기본 Cloud Functions 구조 생성

### Phase 2: 협회 생성
- [ ] createFederation 함수 구현
- [ ] 기본 페이지 생성 로직
- [ ] 메뉴 생성 로직
- [ ] AI 에이전트 생성 로직

### Phase 3: 대진표 생성
- [ ] Round Robin 알고리즘 구현
- [ ] Knockout 알고리즘 구현
- [ ] 일정 자동 배정 로직
- [ ] 최적화 알고리즘 구현

### Phase 4: AI 에이전트
- [ ] 의도 분석 시스템 구현
- [ ] 에이전트별 처리 로직 구현
- [ ] OpenAI API 통합
- [ ] 대화 기록 저장

### Phase 5: 경기 운영
- [ ] 경기 결과 입력 기능
- [ ] 순위 자동 업데이트 기능
- [ ] 통계 자동 업데이트 기능
- [ ] Activity Feed 생성

### Phase 6: 프론트엔드
- [ ] 협회 홈페이지 구현
- [ ] 관리자 대시보드 구현
- [ ] AI 챗봇 UI 구현
- [ ] 반응형 디자인 적용

---

**작성일**: 2024년  
**상태**: ✅ Cursor 개발 프롬프트 완료
