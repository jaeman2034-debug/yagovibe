# ✅ 프로덕션 안정화 체크리스트

**출시 전 필수 확인 사항**

---

## 🔒 안정성

### 네트워크
- [ ] Whisper 스트리밍 reconnect 처리
- [ ] 네트워크 끊김 시 자동 재시도
- [ ] 타임아웃 설정 (각 API별)

### 상태 관리
- [ ] executed / state race condition 점검
- [ ] 동시 호출 방지 (mutex)
- [ ] 상태 초기화 로직 검증

### 에러 처리
- [ ] 모든 API 호출 try-catch
- [ ] Fallback 체인 완전성 확인
- [ ] 에러 로깅 (에러 추적 시스템 연동)

---

## 📊 로깅

### 필수 로그
- [ ] `finalText`: 최종 인식 텍스트
- [ ] `agentAction`: Agent 결정 액션
- [ ] `fallbackReason`: Fallback 사용 이유
- [ ] `executionTime`: 실행 시간
- [ ] `success`: 성공 여부

### 로그 형식
```typescript
{
  timestamp: number;
  sessionId: string;
  finalText: string;
  agentAction: string;
  fallbackReason?: string;
  executionTime: number;
  success: boolean;
}
```

---

## 🎯 성능

### 응답 시간
- [ ] Agent 응답 < 2.5초 (타임아웃 설정)
- [ ] STT 응답 < 1초 (chunk 처리)
- [ ] 전체 실행 < 5초

### 비용
- [ ] LLM 호출 1회로 고정 (검증)
- [ ] 불필요한 API 호출 제거
- [ ] Places API 호출 최소화

---

## 🧪 테스트

### 시나리오 테스트
- [ ] 기본 검색 (100회)
- [ ] 자동 길안내 (100회)
- [ ] 지시어 해석 (50회)
- [ ] 실패 복구 (50회)

### 경계 케이스
- [ ] 빈 텍스트
- [ ] 매우 긴 텍스트
- [ ] 네트워크 끊김
- [ ] API 실패

---

## 🔐 보안

### API 키
- [ ] Secret Manager 사용 (Firebase Functions)
- [ ] 클라이언트에 노출되지 않음

### 권한
- [ ] 마이크 권한 명확한 안내
- [ ] 권한 거부 시 graceful 처리

---

## 📱 사용자 경험

### 피드백
- [ ] 상태 표시 (Wake / Listening / Processing)
- [ ] 실행 직전 딜레이 (300ms)
- [ ] 사운드 큐 (선택적)

### 접근성
- [ ] 화면 없이도 사용 가능 (음성만)
- [ ] 오류 메시지 명확성

---

## 📈 모니터링

### 메트릭
- [ ] 성공률 추적
- [ ] 평균 응답 시간
- [ ] Fallback 사용률
- [ ] 에러율

### 알림
- [ ] 에러율 임계값 초과 시 알림
- [ ] API 실패 시 알림

---

**체크리스트 완료 시 프로덕션 배포 가능**
