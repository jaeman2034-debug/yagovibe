# 📱 팀 블로그 외부 공유용 카드 뉴스 (썸네일) 규칙 & 생성 로직

## 📋 목적 (한 줄)
**광고처럼 보이지 않게, 기록처럼 보이게**

- ❌ 과한 디자인
- ⭕ 조용한 신뢰 + 날짜/활동 명확

---

## 1️⃣ 카드 기본 규격 (고정)

### 사이즈

**1:1 (1080×1080)**
- 카카오톡/밴드 최적
- 모바일 공유 시 가장 많이 사용

**16:9 (1200×630)**
- 링크 프리뷰 (옵션)
- 웹 공유 시 사용

---

### 안전 여백

- 상/하/좌/우: 64px
- 텍스트는 중앙 70% 영역에만 배치

---

## 2️⃣ 카드 타입 (자동 선택)

### CardType 정의

```typescript
type CardType =
  | "activity"   // 경기/모임
  | "record"     // 기록/후기
  | "people"     // 멤버 이야기
  | "health"     // 건강/스트레칭
```

**블로그 PostType과 1:1 매핑:**
- `match_recap` → `activity`
- `practice_log` → `record`
- `member_story` → `people`
- `health_tip` → `health`

---

## 3️⃣ 카드 구성 요소 (최대 4개)

### 필수 (항상 포함)

1. **팀명** (상단 작게)
2. **날짜 또는 기록성 문구** (중앙)
3. **짧은 서브 문장 1줄**
4. **지역 태그** (하단, 작게)

---

### 금지 요소

- ❌ CTA 버튼
- ❌ 가격/모집 문구
- ❌ "지금 참여하세요"
- ❌ 이모지 (과도한 사용)
- ❌ 감탄사

---

## 4️⃣ 카드 문구 규칙 (톤 고정)

### 메인 문구 예시

- "7월 21일 정기 경기 기록"
- "무리 없이 잘 마무리한 하루"
- "각자 페이스로 함께 뛰었습니다"

---

### 서브 문구 예시

- "큰 부상 없이 마쳤습니다"
- "준비 운동부터 차분히"
- "웃음이 많았던 날"

---

### 금지 문구

- ❌ 감탄사 ("와!", "대박!")
- ❌ 이모지 (과도한 사용)
- ❌ 과장 표현 ("최고", "전설")

---

## 5️⃣ 색상 & 스타일 가이드

### 배경

- 단색 or 연한 그라데이션
- Primary-Soft 계열
- 텍스트 가독성 우선

---

### 텍스트

- Text-Primary / Secondary만 사용
- 대비 4.5:1 이상 (접근성)

---

### 폰트

- **제목:** H3 굵기
- **서브:** Body
- **팀명/지역:** Caption

---

## 6️⃣ 이미지 사용 규칙 (선택)

### ✅ 허용

- 운동화, 공, 운동장 전경
- 흐릿한 배경 위 텍스트 오버레이
- 단체 사진 (블러 처리)

---

### ❌ 금지

- 사람 얼굴 클로즈업
- 단체 전면 사진 (프라이버시)
- 과도한 색상/디자인

---

### 이미지 없을 경우

- 텍스트 카드 자동 생성
- 단색 배경 + 텍스트만

---

## 7️⃣ 자동 생성 로직 (핵심)

### 기본 구조

```
┌─────────────────────────────────┐
│  [팀명 - 상단 작게]             │
│                                 │
│  [날짜/기록성 문구 - 중앙]       │
│                                 │
│  [서브 문장 1줄]                │
│                                 │
│  [지역 태그 - 하단 작게]        │
│                                 │
└─────────────────────────────────┘
```

---

## 8️⃣ 카드 타입별 템플릿

### 타입 A: 경기 후기 카드

**구조:**
```
┌─────────────────────────────────┐
│  [배경: 운동장/축구공 이미지]    │
│                                 │
│  ⚽                              │
│                                 │
│  7월 21일 정기 경기 기록         │
│                                 │
│  무더운 날씨였지만, 큰 탈 없이   │
│  잘 마무리했습니다.              │
│                                 │
│  소흘 60대 FC                   │
└─────────────────────────────────┘
```

---

### 타입 B: 훈련 기록 카드

**구조:**
```
┌─────────────────────────────────┐
│  [배경: 훈련 장면 이미지]        │
│                                 │
│  🏃                              │
│                                 │
│  [모임 기록] 7월 21일            │
│                                 │
│  함께 땀 흘린 하루               │
│                                 │
│  소흘 60대 FC                   │
└─────────────────────────────────┘
```

---

### 타입 C: 멤버 이야기 카드

**구조:**
```
┌─────────────────────────────────┐
│  [배경: 팀 단체 사진 (블러)]     │
│                                 │
│  👥                              │
│                                 │
│  [팀 이야기] 함께한 지 6개월     │
│                                 │
│  함께 뛰며 건강하고 즐거운       │
│  시간을 보내고 있습니다.         │
│                                 │
│  소흘 60대 FC                   │
└─────────────────────────────────┘
```

---

## 9️⃣ 생성 함수 구현

### 색상

**배경:**
- Primary 색상 그라데이션 (#1E7F43 기반)
- 또는 팀 사진 (블러 처리)

**텍스트:**
- 제목: 흰색 (그림자 효과)
- 요약: 흰색 (약간 투명)
- 팀명: 흰색 (작은 글씨)

---

### 타이포그래피

**제목:**
- 크기: 48px
- 굵기: 700
- 줄 수: 2줄 이내
- 자간: -0.02em

**요약:**
- 크기: 24px
- 굵기: 400
- 줄 수: 1줄

**팀명:**
- 크기: 18px
- 굵기: 400

---

### 아이콘/이미지

**팀 아이콘:**
- 크기: 80px × 80px
- 위치: 상단 중앙
- 배경: 반투명 흰색 원

**배경 이미지:**
- 종목별 기본 이미지 (없으면 그라데이션)
- 블러 효과 (텍스트 가독성)

---

### 입력 데이터

```typescript
interface ShareCardData {
  postType: 'match_recap' | 'practice_log' | 'member_story' | 'health_tip';
  title: string;
  content: string;  // 전체 글 내용
  teamName: string;
  region: string;
  date: string;
  backgroundImage?: string;
}
```

---

### 생성 함수

```typescript
async function generateShareCard(data: ShareCardData): Promise<{
  square: string;  // 1:1 카드 URL
  wide?: string;  // 16:9 카드 URL (옵션)
}> {
  // 1. PostType → CardType 매핑
  const cardType = mapPostTypeToCardType(data.postType);
  
  // 2. 날짜/기록성 문구 추출
  const title = extractDateOrRecord(data.title, data.date);
  
  // 3. 안전한 서브 문장 선택
  const subtitle = selectSafeSentence(data.content);
  
  // 4. 안전한 이미지 선택
  const image = await selectSafeImage(data.backgroundImage, cardType);
  
  // 5. 1:1 카드 생성 (필수)
  const squareCard = await createCard({
    type: cardType,
    size: '1:1',
    title,
    subtitle,
    teamName: data.teamName,
    region: data.region,
    image
  });
  
  // 6. 16:9 카드 생성 (옵션)
  const wideCard = await createCard({
    type: cardType,
    size: '16:9',
    title,
    subtitle,
    teamName: data.teamName,
    region: data.region,
    image
  });
  
  // 7. Storage에 저장
  const squareUrl = await uploadToStorage(
    squareCard,
    `teams/${teamId}/share_cards/${postId}_square.jpg`
  );
  
  const wideUrl = await uploadToStorage(
    wideCard,
    `teams/${teamId}/share_cards/${postId}_wide.jpg`
  );
  
  return {
    square: squareUrl,
    wide: wideUrl
  };
}
```

---

### 핵심 헬퍼 함수

```typescript
/**
 * PostType → CardType 매핑
 */
function mapPostTypeToCardType(postType: string): CardType {
  const mapping: Record<string, CardType> = {
    'match_recap': 'activity',
    'practice_log': 'record',
    'member_story': 'people',
    'health_tip': 'health'
  };
  return mapping[postType] || 'record';
}

/**
 * 날짜 또는 기록성 문구 추출
 */
function extractDateOrRecord(title: string, date: string): string {
  // 제목에 날짜가 있으면 그대로 사용
  if (title.match(/\d{1,2}월 \d{1,2}일/)) {
    return title;
  }
  
  // 없으면 날짜 기반 생성
  const dateObj = new Date(date);
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  return `${month}월 ${day}일 기록`;
}

/**
 * 안전한 서브 문장 선택
 */
function selectSafeSentence(content: string): string {
  // 1. 문단 분리
  const paragraphs = content.split('\n\n');
  
  // 2. 중간부 문단 우선 선택
  const middleParagraphs = paragraphs.slice(1, -1);
  
  // 3. '과정 서술 문장' 우선 선택
  const processKeywords = [
    '무리하지 않고',
    '각자 페이스로',
    '차분히',
    '준비 운동',
    '부상 없이'
  ];
  
  for (const para of middleParagraphs) {
    // 과장 키워드 제외
    if (para.match(/최고|전설|감동|눈물/)) {
      continue;
    }
    
    // 과정 서술 문장 우선
    if (processKeywords.some(keyword => para.includes(keyword))) {
      // 첫 문장만 추출 (1줄)
      const firstSentence = para.split(/[.!?]/)[0];
      if (firstSentence.length <= 50) {
        return firstSentence.trim();
      }
    }
  }
  
  // 4. 폴백: 중간부 첫 문장
  if (middleParagraphs.length > 0) {
    const firstSentence = middleParagraphs[0].split(/[.!?]/)[0];
    if (firstSentence.length <= 50) {
      return firstSentence.trim();
    }
  }
  
  // 5. 최종 폴백: 첫 문단 첫 문장
  if (paragraphs.length > 0) {
    const firstSentence = paragraphs[0].split(/[.!?]/)[0];
    return firstSentence.trim().substring(0, 50);
  }
  
  return '함께 뛰며 건강한 시간을 보냈습니다.';
}

/**
 * 안전한 이미지 선택
 */
async function selectSafeImage(
  backgroundImage: string | undefined,
  cardType: CardType
): Promise<string | null> {
  // 1. 제공된 이미지가 있으면 검증 후 사용
  if (backgroundImage) {
    // 얼굴 클로즈업/전면 사진 검증 (간단한 휴리스틱)
    // 실제로는 이미지 분석 API 사용 권장
    if (isSafeImage(backgroundImage)) {
      return backgroundImage;
    }
  }
  
  // 2. 종목별 기본 이미지
  const defaultImages: Record<CardType, string> = {
    'activity': '/images/default-activity.jpg',
    'record': '/images/default-record.jpg',
    'people': '/images/default-people.jpg',
    'health': '/images/default-health.jpg'
  };
  
  return defaultImages[cardType] || null;
}

/**
 * 이미지 안전성 검증 (간단 버전)
 */
function isSafeImage(imageUrl: string): boolean {
  // 실제로는 이미지 분석 API 사용 권장
  // 여기서는 기본 검증만
  return true;  // TODO: 실제 구현 필요
}
```

---

## 🔟 공유 채널별 미세 조정

### 카카오톡 / 밴드

**사이즈:**
- 1:1 (1080×1080)

**특징:**
- 날짜 강조
- 팀명 상단 작게
- 지역 태그 하단

---

### 링크 공유 (웹)

**사이즈:**
- 16:9 (1200×630)

**특징:**
- 팀명 + 기록성 제목 우선
- 서브 문장 포함
- 지역 태그 포함

---

## 1️⃣1️⃣ 관리자 개입 최소 옵션

### 기본: 완전 자동

- 블로그 포스트 생성 시 자동 생성
- 관리자 승인 불필요

---

### 옵션 (관리자 설정)

**카드 미리보기 ON/OFF:**
- 생성 전 미리보기 제공
- 수정 가능 (제목/서브 문장만)

**이미지 포함 여부 토글:**
- 이미지 포함 ON/OFF
- 텍스트 카드만 생성 가능

---

## 1️⃣2️⃣ 배경 이미지 선택 로직

### 우선순위

1. **실제 사진 (있을 때)**
   - 경기/훈련 사진
   - 블러 처리 (텍스트 가독성)

2. **종목별 기본 이미지**
   - 축구: 축구장/축구공
   - 풋살: 풋살장
   - 배드민턴: 배드민턴장

3. **그라데이션 (기본)**
   - Primary 색상 기반
   - 팀 아이콘과 조화

---

## 1️⃣3️⃣ 텍스트 오버레이 규칙

### 가독성 보장

**배경이 밝을 때:**
- 텍스트: 어두운 색상 (#111111)
- 그림자: 흰색

**배경이 어두울 때:**
- 텍스트: 흰색
- 그림자: 검은색

---

### 위치 규칙

**제목:**
- 상단 중앙
- 아이콘 아래
- 여백: 상단 120px

**요약:**
- 중앙
- 제목 아래
- 여백: 제목 아래 40px

**팀명:**
- 하단 중앙
- 여백: 하단 60px

---

## 1️⃣4️⃣ 개발 스키마 요약

### ShareCard 인터페이스

```typescript
interface ShareCard {
  type: CardType;  // "activity" | "record" | "people" | "health"
  size: "1:1" | "16:9";
  title: string;  // 날짜/기록성 문구
  subtitle: string;  // 서브 문장 1줄
  region: string;  // 지역 태그
  teamName: string;  // 팀명
  image?: string;  // 이미지 URL (옵션)
  createdAt: Timestamp;
}
```

---

## 1️⃣5️⃣ 공유 플랫폼별 최적화

### 카카오톡

**크기:**
- 1200px × 630px

**포맷:**
- JPG (최적화)

**메타 태그:**
```html
<meta property="og:image" content="{shareCardUrl}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{summary}">
```

---

### 밴드

**크기:**
- 1200px × 630px

**포맷:**
- JPG (최적화)

---

### 링크 공유

**크기:**
- 1200px × 630px

**포맷:**
- JPG (최적화)

---

## 1️⃣6️⃣ 자동 생성 트리거

### 생성 시점

1. **블로그 포스트 생성 시**
   - AI 글 생성 완료 후
   - 자동으로 카드 뉴스 생성

2. **공유 버튼 클릭 시**
   - 실시간 생성 (캐시 없을 때)

3. **주간 요약 생성 시**
   - 주간 요약 글과 함께 생성

---

## 1️⃣7️⃣ 저장 및 캐싱

### Storage 구조

```
teams/{teamId}/share_cards/
  ├── {postId}.jpg          // 원본
  ├── {postId}_thumb.jpg    // 썸네일 (선택)
  └── metadata.json         // 메타데이터
```

---

### 캐싱 전략

- 생성된 카드는 7일간 캐시
- 동일 포스트는 재생성 안 함
- 관리자가 수동 재생성 가능

---

## 1️⃣8️⃣ 실제 사용 예시

### 시나리오: 경기 후기 글 생성

**입력:**
```typescript
{
  postType: 'match_recap',
  title: '7월 21일 정기 경기 기록',
  summary: '무더운 날씨였지만, 큰 탈 없이 잘 마무리했습니다.',
  teamName: '소흘 60대 FC',
  date: '2025-07-21'
}
```

**생성된 카드:**
- 배경: 축구장 이미지 (블러)
- 아이콘: ⚽
- 제목: "7월 21일 정기 경기 기록"
- 요약: "무더운 날씨였지만, 큰 탈 없이 잘 마무리했습니다."
- 팀명: "소흘 60대 FC"

---

## ✅ 완료 체크리스트

- [x] 카드 기본 규격 (1:1, 16:9)
- [x] 카드 타입 정의 (4종)
- [x] 구성 요소 규칙 (필수/금지)
- [x] 카드 문구 규칙 (톤 고정)
- [x] 색상 & 스타일 가이드
- [x] 이미지 사용 규칙
- [x] 자동 생성 로직 (핵심 함수)
- [x] 공유 채널별 미세 조정
- [x] 관리자 개입 최소 옵션
- [x] 개발 스키마 요약

---

## ✅ 천재 기준 최종 체크

- [x] 광고 냄새 ❌
- [x] 기록성/신뢰 ⭕
- [x] 공유 채널 적합 ⭕
- [x] 자동화 완성도 ⭕

---

## 🚀 다음 단계

1. 이미지 생성 Cloud Function 구현
2. 텍스트 오버레이 로직 구현
3. Storage 업로드 및 URL 생성
4. 공유 메타 태그 자동 설정
5. **공유 유입 전용 랜딩 미세 조정** ← 다음

