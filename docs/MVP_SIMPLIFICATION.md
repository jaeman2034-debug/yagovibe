# MVP 단순화 작업 내역

## ✅ 완료된 작업

### 1. phase 단일 상태 머신 추가
- `type Phase = 'IDLE' | 'SEARCHING' | 'CONFIRMED' | 'NAVIGATING'`
- 기존 `navStatus`, `searchPhase` 임시 비활성화 (주석 처리)

### 2. 단일 진실 3개만 유지
- `phase`: 상태 머신
- `location`: 위치 상태
- `confirmedDestination`: 목적지

### 3. onPlacesUpdate 단순화
- `phase !== 'SEARCHING'`이면 검색 결과 무시
- 검색 결과가 오면 첫 번째 장소를 `confirmedDestination`으로 확정
- `phase = 'CONFIRMED'`로 전환

### 4. startNavigation 단순화
- `phase !== 'CONFIRMED'`이면 차단
- `location.status !== 'READY'`이면 차단
- `phase = 'NAVIGATING'`으로 전환

### 5. Places API 호출 가드
- `phase !== 'SEARCHING'`이면 검색 차단
- `location.status !== 'READY'`이면 검색 차단

## ⚠️ 남은 작업 (점진적 처리 필요)

### 1. STT/TTS 관련 코드 비활성화
- `useSpeechToText` 훅 사용 부분 주석 처리
- `speakOnce`, `speakSequence` 호출 부분 주석 처리

### 2. 기존 상태 변수 참조 제거
- `navStatus`, `navigationStarted`, `recommendedPlace` 등 참조 제거
- `phase` 기준으로 통일

### 3. UI 컴포넌트 조건 단순화
- `NavigationCard` mode를 `phase` 기준으로 변경
- `DestinationLabel` 표시 조건을 `phase` 기준으로 변경

### 4. 검색 트리거 단순화
- 검색 입력 시 `phase = 'SEARCHING'`으로 전환
- 검색 완료 시 `phase = 'CONFIRMED'`로 전환

## 🎯 다음 단계

1. 검색 입력 핸들러에서 `phase = 'SEARCHING'` 설정
2. STT/TTS 관련 코드 완전 비활성화
3. 기존 상태 변수 참조 제거
4. 테스트 및 검증
