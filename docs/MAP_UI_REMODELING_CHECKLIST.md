# 🧠 지도 페이지 UI 리모델링 체크리스트

**목적**: 실서비스 기준 완성형 UI로 리모델링  
**대상**: 개발자  
**상태**: 리모델링 진행 중

---

## 📋 Phase 1: 레이아웃 재구성

### Header 리모델링

- [ ] Header 높이 56px → 48px 변경
- [ ] Header에서 상태 메시지 제거
- [ ] Header에서 Debug 제거
- [ ] Header에서 설명 문구 제거
- [ ] Header z-index: 1000 유지

**파일**: `src/layout/Header.tsx`

---

### TransportTabs 컴포넌트 생성

- [ ] `TransportTabs` 컴포넌트 생성
- [ ] 높이: 44px
- [ ] 위치: `fixed top: calc(48px + env(safe-area-inset-top))`
- [ ] z-index: 999
- [ ] UI: `[ 🚶 도보 ] [ 🚗 자동차 ] [ 🚇 대중교통 ]`
- [ ] 상태 메시지 없음
- [ ] 설명 문구 없음

**파일**: `src/components/map/TransportTabs.tsx` (신규)

---

### 지도 영역 offset 계산

- [ ] 지도 상단 offset: `calc(48px + 44px + env(safe-area-inset-top))`
- [ ] 지도 하단 offset: `calc(BottomActionSheet 높이 + env(safe-area-inset-bottom))`
- [ ] 지도 컨트롤 가려지지 않음 확인

**파일**: `src/pages/GeneralMapPage.tsx`

---

## 📋 Phase 2: 상태 메시지 단일화

### StatusPill 컴포넌트 생성

- [ ] `StatusPill` 컴포넌트 생성
- [ ] 위치: `fixed top: calc(48px + 44px + env(safe-area-inset-top) + 16px)`
- [ ] z-index: 50
- [ ] pill 형태 (rounded-full)
- [ ] 상태 타입: 로딩/음성/에러

**파일**: `src/components/map/StatusPill.tsx` (신규)

---

### 상태 메시지 타입 구현

- [ ] 로딩 상태: `🔍 찾는 중…` (bg-neutral-100, text-neutral-700)
- [ ] 음성 대기: `🎙 지금 말해도 돼요` (bg-green-100, text-green-700)
- [ ] 에러 상태: `📡 연결이 불안정해요 [다시 시도]` (bg-red-100, text-red-700)

**파일**: `src/components/map/StatusPill.tsx`

---

### 기존 상태 메시지 제거

- [ ] 지도 위 여러 pill 제거
- [ ] 설명성 문구 제거 ("축구장 근처에서…" 등)
- [ ] Debug 상태 메시지 제거
- [ ] 상태 메시지 동시 표시 제거

**파일**: `src/pages/GeneralMapPage.tsx`

---

## 📋 Phase 3: 하단 액션 영역

### BottomActionSheet 컴포넌트 생성

- [ ] `BottomActionSheet` 컴포넌트 생성
- [ ] 위치: `fixed bottom-0`
- [ ] z-index: 100
- [ ] Safe Area 적용: `padding-bottom: env(safe-area-inset-bottom)`
- [ ] 배경: `bg-white`
- [ ] 그림자: `shadow-xl`

**파일**: `src/components/map/BottomActionSheet.tsx` (신규)

---

### 상태별 하단 UI 구현

- [ ] 결과 없음: 하단 숨김
- [ ] 검색 완료: `📍 {장소명} [ 여기로 안내할게요 ]`
- [ ] 안내 중: `🧭 {장소명}까지 안내 중 [ 다시 길찾기 ] [ 취소 ]`
- [ ] 에러: `지금은 길찾기를 열 수 없어요 [ 다시 시도 ]`

**파일**: `src/components/map/BottomActionSheet.tsx`

---

### 기존 하단 UI 제거

- [ ] 기존 하단 오버레이 제거
- [ ] 기존 하단 카드 제거
- [ ] 하단 액션을 BottomActionSheet로 통합

**파일**: `src/pages/GeneralMapPage.tsx`

---

## 📋 Phase 4: Debug 제거

### Debug UI 환경 분기

- [ ] 모든 Debug UI에 `process.env.NODE_ENV === 'development'` 조건 추가
- [ ] Debug 배지 제거
- [ ] 내부 상태 값 표시 제거
- [ ] 테스트 버튼 제거

**파일**: `src/pages/GeneralMapPage.tsx`

---

### 콘솔 로그 정리

- [ ] Debug 정보는 `console.log`로만
- [ ] 운영 화면에는 표시 안 함
- [ ] UX 이벤트 로그는 `console.debug` 유지

**파일**: 전체

---

## 📋 Phase 5: 시각적 톤 통일

### 컬러 시스템 적용

- [ ] Primary CTA: Blue 600
- [ ] 로딩: Neutral 100/700
- [ ] 음성: Green 100/700
- [ ] 에러: Red 100/700

**파일**: 전체

---

### 애니메이션 통일

- [ ] 등장: `fadeIn + slideDown 4px`
- [ ] 사라짐: `fadeOut`
- [ ] 튀는 애니메이션 제거
- [ ] 과도한 bounce 제거
- [ ] 깜빡임 제거

**파일**: 전체

---

## 📋 Phase 6: 테스트 & 검증

### 레이아웃 테스트

- [ ] Header + TransportTabs 고정 확인
- [ ] 상태 메시지 중앙 pill 형태 확인
- [ ] 지도 컨트롤 가려지지 않음 확인
- [ ] 하단 액션 시트 엄지 UX 확인

---

### 상태 메시지 테스트

- [ ] 한 화면에 상태 메시지 1개만 표시
- [ ] 상태 전환 시 부드러운 애니메이션
- [ ] 상태 메시지 자동 사라짐 확인

---

### Debug 제거 테스트

- [ ] production 빌드에서 Debug UI 없음
- [ ] 운영 화면에 Debug 흔적 없음
- [ ] 콘솔 로그 최소화 확인

---

### 모바일 테스트

- [ ] iOS Safari 레이아웃 확인
- [ ] Android Chrome 레이아웃 확인
- [ ] Safe Area 적용 확인
- [ ] 하단 액션 시트 터치 영역 확인

---

## 📊 최종 체크리스트

### "천재 지도 UI" 기준

- [ ] 한 화면에 상태 메시지 1개
- [ ] 지도 위가 깨끗함
- [ ] 다음 행동이 항상 하단에 있음
- [ ] Debug 흔적 없음
- [ ] 처음 써도 설명 필요 없음
- [ ] Header + Transport Tabs 고정
- [ ] 상태 메시지 중앙 pill 형태
- [ ] 하단 액션 시트 엄지 UX

---

## 🚀 리모델링 완료 기준

### 필수 완료 항목

- [ ] Phase 1: 레이아웃 재구성 완료
- [ ] Phase 2: 상태 메시지 단일화 완료
- [ ] Phase 3: 하단 액션 영역 완료
- [ ] Phase 4: Debug 제거 완료
- [ ] Phase 5: 시각적 톤 통일 완료
- [ ] Phase 6: 테스트 & 검증 완료

### 완료 시 상태

- ✅ QA에서 UI 지적 거의 없음
- ✅ "감각 있다"는 말 나옴
- ✅ **진짜 출시용** 화면 완성

---

**생성일**: 2024년  
**대상**: 개발자  
**상태**: 리모델링 체크리스트 완료
