# 팀 블로그 활동 후기 자동 포스트 (실사용)

## 🎯 생성 목표

운영자 노동 0, 팀 블로그 지속 갱신, "활동하는 팀" 인식 고정, 유료 전환 트리거

## 🔄 자동 생성 트리거

### 트리거 A (기본)
- 일정 완료 (`schedule.status = "completed"`)
- 출석 데이터 존재
- 사진 ≥ 1장 (선택, 없으면 텍스트 버전)

### 트리거 B (보조)
- 출석 체크 완료
- 운영자가 "후기 생성" 버튼 클릭

## 📝 실제 생성 예시

### 입력 데이터
```json
{
  "date": "2025-01-18",
  "title": "정기 축구 모임",
  "location": "포천시 생활체육공원",
  "attendanceCount": 10,
  "totalMembers": 12,
  "weather": "맑음",
  "photos": []
}
```

### 생성 결과

#### TITLE
```
오늘도 함께 땀 흘린 소흘 60대 FC ⚽
```

#### EXCERPT
```
포천 생활체육공원에서 열린 정기 축구 모임 후기. 10명이 참여하여 즐거운 시간을 보냈습니다.
```

#### CONTENT (HTML)
```html
<h2>오늘의 활동</h2>

<p>오늘은 포천 생활체육공원에서 소흘 60대 FC의 정기 축구 모임이 있었습니다.</p>

<p><strong>👥 참여 인원:</strong> 10명 / 전체 12명</p>
<p><strong>☀️ 날씨:</strong> 맑음</p>
<p><strong>⚽ 활동 내용:</strong> 가벼운 워밍업 후 미니 게임 진행</p>

<p>무리하지 않으면서도 충분히 몸을 풀 수 있는 시간이었고, 오랜만에 참여한 멤버도 자연스럽게 어울릴 수 있었습니다.</p>

<p>소흘 60대 FC는 꾸준함과 즐거움을 가장 중요하게 생각합니다. 함께 운동하며 건강한 일상을 이어가고 싶으신 분들은 언제든 환영합니다.</p>

<!-- AI 자동 생성 배지 (자동 삽입) -->
<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <p class="text-sm text-blue-800 mb-2">
    <strong>🧠 AI 자동 후기</strong> | <span class="text-xs">📅 2025-01-18 활동</span>
  </p>
  <p class="text-xs text-blue-700 mt-2">
    💡 이 후기는 AI가 자동으로 생성했습니다. 
    <strong>Pro 플랜</strong>에서는 사진 기반 설명, 예약 발행, SNS 공유용 요약을 제공합니다.
  </p>
</div>

<!-- CTA 버튼 영역 (자동 삽입) -->
<div class="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg text-center">
  <p class="text-lg font-semibold text-gray-900 mb-4">함께하시겠어요?</p>
  <p class="text-sm text-gray-600 mb-4">
    이 팀 페이지는 AI가 관리합니다.
  </p>
  <div class="flex justify-center gap-3">
    <button class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
      이 팀에 가입하기
    </button>
  </div>
</div>
```

## 🔍 SEO 태그 (자동 생성)

### Free 플랜
```json
{
  "title": "오늘도 함께 땀 흘린 소흘 60대 FC ⚽",
  "description": "포천 생활체육공원에서 열린 정기 축구 모임 후기. 10명이 참여하여 즐거운 시간을 보냈습니다.",
  "keywords": []
}
```

### Pro 플랜 (SEO 최적화)
```json
{
  "title": "소흘 60대 FC 정기 축구 모임 후기 - 포천시 생활체육공원 | YAGO VIBE",
  "description": "포천시 생활체육공원에서 열린 소흘 60대 FC 정기 축구 모임 후기. 10명 참여, 맑은 날씨 속 즐거운 활동. 60대 축구 모임, 중장년 스포츠.",
  "keywords": [
    "포천 축구 모임",
    "60대 운동 모임",
    "중장년 스포츠",
    "포천시 생활체육공원",
    "아마추어 축구 후기"
  ]
}
```

## 🎨 메타 정보 (자동 삽입)

### 1. AI 자동 생성 배지
- **위치**: 본문 하단
- **내용**: "🧠 AI 자동 후기 | 📅 2025-01-18 활동"
- **유료 전환 메시지**: Free 플랜일 때만 Pro 기능 안내 표시

### 2. 자동 태그
- 🧠 AI 자동 후기
- 📅 날짜 활동
- ⚽ 종목 / 지역 / 연령대

## 💰 무료 vs Pro 기능

| 기능 | Free | Pro |
|------|------|-----|
| 자동 후기 생성 | 월 2회 | 무제한 |
| 사진 기반 설명 | ❌ | ⭕ |
| 예약 발행 | ❌ | ⭕ |
| SNS 공유용 요약 | ❌ | ⭕ |
| 글 톤 선택 | ❌ | ⭕ |

## 🔄 생성 플로우

```
일정 완료 (schedule.status = "completed")
    ↓
onScheduleCompleted 트리거
    ↓
블로그 활성화 확인
    ↓
무료 플랜 제한 체크 (월 2회)
    ↓
출석 데이터 수집
    ↓
AI로 활동 후기 생성
    ↓
Firestore 저장 (published)
    ↓
공개 블로그에 자동 노출
```

## 📊 운영자 UX

### 운영자만 보이는 배너
```
🤖 이번 활동 후기가 AI로 자동 생성되었습니다.
수정하거나, 다음 활동도 자동으로 관리해보세요.

[수정] [숨기기] [재생성 (Pro)]
```

## 🚀 다음 단계

1. **사진 기반 설명** (Pro 전용)
   - 사진 업로드 → AI 이미지 분석 → 활동 장면 요약

2. **예약 발행** (Pro 전용)
   - 특정 날짜/시간에 자동 발행

3. **SNS 공유용 요약** (Pro 전용)
   - 트위터/인스타그램용 짧은 요약 자동 생성

4. **주간 요약 글** (자동)
   - 매주 월요일 이번 주 활동 요약

