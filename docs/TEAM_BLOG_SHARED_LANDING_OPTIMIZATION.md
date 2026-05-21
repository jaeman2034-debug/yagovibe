# 🔗 공유 유입 전용 랜딩 미세 조정 가이드

## 📋 목적
카카오톡/밴드/링크 공유를 통해 유입된 사용자의 **클릭 → 페이지 → CTA** 리텐션 개선

---

## 0️⃣ 전제 (중요한 현실)

### 공유 유입 사용자 특성

- 팀을 모른다
- 가입 의도가 낮다
- "구경만 하러" 들어온다

### 목표 전환

- ❌ 즉시 가입
- ⭕ 신뢰 형성
- ⭕ CTA 클릭

---

## 1️⃣ 공유 유입 감지 로직 (개발 고정)

### 감지 조건

```typescript
const isShareEntry = 
  entry_source === "share" &&
  referrer in ["kakao", "band", "link"];
```

**→ true일 경우 전용 UX 규칙 적용**

---

### 구현 코드

```typescript
function detectShareEntry(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const entrySource = urlParams.get('utm_source');
  const referrer = document.referrer;
  
  const isShareSource = entrySource === 'kakao' || 
                       entrySource === 'band' || 
                       entrySource === 'link';
  
  const isShareReferrer = referrer.includes('kakao.com') ||
                          referrer.includes('band.us') ||
                          referrer.includes('link');
  
  return isShareSource || isShareReferrer;
}
```

---

## 2️⃣ 공유 유입 vs 일반 유입 차이

### 일반 유입 (검색/직접 접속)

**특징:**
- 의도적 접속
- 팀 정보를 찾는 중
- 시간 여유 있음

**UX 목표:**
- 정보 제공
- 탐색 유도

---

### 공유 유입 (카드 뉴스 클릭)

**특징:**
- 우연한 발견
- "이게 뭐지?" 호기심
- 3초 안에 판단

**UX 목표:**
- 즉시 이해
- 신뢰 확립
- 다음 행동 유도

---

## 2️⃣ 공유 유입 감지 로직

### UTM 파라미터

```
/teams/{teamId}/blog?utm_source=kakao&utm_medium=share&utm_content={postId}
```

**감지:**
```typescript
const urlParams = new URLSearchParams(window.location.search);
const isShared = urlParams.get('utm_source') === 'kakao' || 
                urlParams.get('utm_source') === 'band' ||
                urlParams.get('utm_source') === 'link';
```

---

### Referrer 기반 감지

```typescript
const referrer = document.referrer;
const isFromKakao = referrer.includes('kakao.com');
const isFromBand = referrer.includes('band.us');
```

---

## 3️⃣ Above the Fold 미세 조정 (핵심)

### ❌ 기본 Hero (직접 유입용)

```
[함께 운동하기]  ← Primary CTA
```

---

### ⭕ 공유 유입용 Hero

**상태 배지 변경:**
```
🟢 최근 활동 기록 중
```

**캐치프레이즈 아래 보조 문구 (추가):**
```
이 페이지는
실제 팀 활동을 기록한 공개 공간입니다.
```

**📌 효과:**
- 광고/모집 페이지 오해 차단
- 심리적 경계 해제

---

## 4️⃣ 공유 유입 전용 랜딩 구조

### 히어로 영역 (상단 즉시 노출)

**일반 유입:**
- 팀 소개
- 캐치프레이즈
- CTA 버튼

**공유 유입 (미세 조정):**
- ✅ **공유된 글 바로 노출** (상단)
- ✅ **"이 글을 공유했습니다" 배지**
- ✅ **팀 정보 간단히** (1줄)
- ✅ **"더 보기" 버튼** (블로그 전체로)

---

### 콘텐츠 영역

**일반 유입:**
- 전체 블로그 글 목록
- 탭 (Intro/Activity/Reviews)

**공유 유입 (미세 조정):**
- ✅ **공유된 글 전체 본문** (상단 고정)
- ✅ **관련 글 2~3개** (하단)
- ✅ **"이 팀 더 알아보기" 버튼** (중간)

---

## 5️⃣ 첫 CTA 문구 변경 (강요 제거)

### Primary CTA (변경)

**❌ 함께 운동하기**

**⭕ 활동 기록 더 보기**

---

### Secondary CTA

**팀 소개 보기** (유지)

---

### ⚠️ 실제 액션은 스크롤 유도

- CTA 클릭 → 페이지 스크롤 (블로그 섹션으로)
- 강제 가입 페이지 이동 ❌

---

## 6️⃣ 콘텐츠 우선 노출 순서 변경

### 공유 유입 시 컴포넌트 순서

```
Hero (완화 버전)
↓
최근 활동 요약
↓
BlogPreviewList (3)
↓
TeamMetaGrid
↓
전환 CTA (가입)
```

**📌 이유:**
- 사람 → 기록 → 팀 → 참여 순서가 가장 자연스러움

---

## 7️⃣ 공유 유입 전용 UI 요소

### 배지 (상단)

```
┌─────────────────────────────────┐
│  📤 이 글을 공유했습니다         │
│  [닫기]                          │
└─────────────────────────────────┘
```

**표시 조건:**
- `utm_source` 파라미터 존재
- 또는 referrer가 카카오톡/밴드

**동작:**
- 클릭 시 배지 닫기
- 닫아도 공유 유입 상태 유지

---

### 공유된 글 하이라이트

**스타일:**
- 배경색 약간 다르게 (연한 Primary)
- 상단 고정 (스크롤 시에도 보임)
- "이 글을 공유했습니다" 라벨

---

### 관련 글 추천

**로직:**
```typescript
function getRelatedPosts(currentPost: BlogPost, allPosts: BlogPost[]): BlogPost[] {
  // 1. 같은 타입 우선
  const sameType = allPosts.filter(p => 
    p.postType === currentPost.postType && p.id !== currentPost.id
  );
  
  // 2. 최근 글 우선
  const recent = allPosts
    .filter(p => p.id !== currentPost.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  
  return sameType.length > 0 ? sameType.slice(0, 2) : recent.slice(0, 3);
}
```

---

## 8️⃣ 블로그 카드 미세 문구 (공유 유입 전용)

### 카드 하단 마이크로 카피 (추가)

```
이 팀의 일상 기록입니다
```

**특징:**
- 클릭 압박 ❌
- 관찰 허용 메시지

---

## 9️⃣ CTA 버튼 미세 조정

### 일반 유입 CTA

```
[함께 운동하기]
[팀에 문의하기]
```

---

### 공유 유입 CTA (미세 조정)

**상단 (공유된 글 아래):**
```
[이 팀 더 알아보기]  ← 블로그 전체로
```

**중간 (관련 글 아래):**
```
[함께 운동하기]  ← 가입 CTA
```

**하단 (스티키):**
```
[이 팀에 가입하기]  ← 모바일 스크롤 시
```

---

## 🔟 전환 CTA 재등장 타이밍 (중요)

### 조건

**블로그 1개 이상 클릭 OR 스크롤 65% 이상**

---

### CTA 카피

```
👣 직접 와서 한 번 같이 해볼 수 있어요
부담 없어요.
```

**CTA:**
- 함께 운동하기
- 문의하기

---

## 1️⃣1️⃣ 신뢰 보강 마이크로 요소 (소형)

### MetaGrid 하단 (공유 유입만)

```
⚽ 60대 분들이
무리하지 않고 주 1회 모입니다
```

**→ 기존 데이터 재서술 (새 정보 ❌)**

---

## 1️⃣2️⃣ 스크롤 기반 동작

### 스크롤 40% 도달 시

**일반 유입:**
- 스티키 CTA 표시

**공유 유입 (미세 조정):**
- ✅ **"이 글을 공유했습니다" 배지 자동 닫기**
- ✅ **스티키 CTA 표시** ("이 팀에 가입하기")
- ✅ **관련 글 섹션 강조**

---

### 스크롤 80% 도달 시

**공유 유입 전용:**
- ✅ **"더 많은 팀 이야기 보기" 섹션 노출**
- ✅ **블로그 전체 링크** (탭으로 이동)

---

## 1️⃣3️⃣ 이탈 직전 방어 (모바일 전용)

### Back / 이탈 시

**Bottom Sheet (1회):**

```
잠깐만요
이 팀의 최근 기록 하나만 보고 가셔도 괜찮아요.

[ 기록 하나 보기 ] [ 그냥 나가기 ]
```

**📌 강제 ❌ / 선택 ⭕**

---

### 구현 로직

```typescript
const [showExitIntent, setShowExitIntent] = useState(false);
const [hasShownExitIntent, setHasShownExitIntent] = useState(false);

useEffect(() => {
  // 모바일에서만
  if (window.innerWidth < 768 && !hasShownExitIntent) {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasShownExitIntent) {
        e.preventDefault();
        setShowExitIntent(true);
        setHasShownExitIntent(true);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }
}, [hasShownExitIntent]);
```

---

## 1️⃣4️⃣ 모바일 최적화

### 카드 뉴스 클릭 → 모바일 랜딩

**레이아웃:**
- 공유된 글 전체 본문 (가독성 최우선)
- 이미지 최적화 (로딩 속도)
- CTA 버튼 터치 영역 48px 이상

---

### 터치 제스처

**스와이프:**
- 좌우 스와이프 → 관련 글 이동
- 아래 스와이프 → 블로그 전체로

---

## 8️⃣ 리텐션 개선 전략

### 3초 룰

**공유 유입 사용자는 3초 안에 판단:**
1. **0~1초:** "이게 뭐지?" → 공유된 글 본문 즉시 노출
2. **1~2초:** "팀이구나" → 팀 정보 간단히 (1줄)
3. **2~3초:** "더 볼까?" → 관련 글/CTA 노출

---

### 신뢰 확립

**공유 유입 전용 요소:**
- ✅ **"이 글을 공유했습니다" 배지** (신뢰)
- ✅ **날짜 표시** (최신성)
- ✅ **활동 증거** (사진/기록)

---

### 다음 행동 유도

**단계별 CTA:**
1. **상단:** "이 팀 더 알아보기" (블로그 전체)
2. **중간:** "함께 운동하기" (가입)
3. **하단:** "이 팀에 가입하기" (스티키)

---

## 1️⃣5️⃣ 공유 유입 전용 이벤트 태깅

### 이벤트 스키마

```typescript
// 공유 유입 감지
{
  "event": "share_entry_view",
  "source": "kakao" | "band" | "link",
  "teamId": string,
  "postId": string
}

// 공유 유입 전환
{
  "event": "share_entry_convert",
  "action": "scroll_65" | "blog_click" | "cta_click",
  "teamId": string,
  "postId": string,
  "source": "kakao" | "band" | "link"
}
```

---

### 구현 코드

```typescript
// 공유 유입 감지 시
if (isShareEntry()) {
  track('share_entry_view', {
    source: getShareSource(),
    teamId,
    postId: sharedPostId
  });
}

// 전환 액션 추적
function trackShareEntryConvert(action: string) {
  track('share_entry_convert', {
    action,
    teamId,
    postId: sharedPostId,
    source: getShareSource()
  });
}
```

---

## 1️⃣6️⃣ Analytics 추적

### 공유 유입 전용 이벤트

```typescript
// 공유 유입 감지
track('shared_landing_view', {
  teamId,
  postId,
  source: 'kakao' | 'band' | 'link',
  referrer: document.referrer
});

// 공유된 글 조회
track('shared_post_view', {
  teamId,
  postId,
  source: 'kakao' | 'band' | 'link'
});

// 관련 글 클릭
track('shared_related_click', {
  teamId,
  postId,
  relatedPostId
});

// 공유 유입 → 가입 전환
track('shared_landing_join_click', {
  teamId,
  postId,
  source: 'kakao' | 'band' | 'link',
  cta_position: 'top' | 'middle' | 'sticky'
});
```

---

### 리텐션 지표

**핵심 KPI:**
- 공유 유입 → 페이지 체류 시간
- 공유 유입 → 관련 글 클릭률
- 공유 유입 → 가입 전환율
- 공유 유입 → 블로그 전체 이동률

---

## 1️⃣7️⃣ 효과 기대치 (보수적)

### 핵심 지표

- 즉시 이탈률 ↓ 15~25%
- 블로그 클릭률 ↑ 30%+
- CTA 도달률 ↑ 10~15%

---

### 측정 방법

**Before (일반 유입 기준):**
- 즉시 이탈률: 60%
- 블로그 클릭률: 20%
- CTA 도달률: 30%

**After (공유 유입 최적화):**
- 즉시 이탈률: 45~51% (↓ 15~25%)
- 블로그 클릭률: 26%+ (↑ 30%+)
- CTA 도달률: 33~34.5% (↑ 10~15%)

---

## 1️⃣8️⃣ 구현 체크리스트

### 프론트엔드

- [ ] UTM 파라미터 감지 로직
- [ ] 공유 유입 배지 컴포넌트
- [ ] 공유된 글 하이라이트 스타일
- [ ] 관련 글 추천 로직
- [ ] 스크롤 기반 동작
- [ ] 모바일 최적화
- [ ] Analytics 이벤트 추적

---

### 백엔드

- [ ] 공유 URL 생성 (UTM 파라미터 포함)
- [ ] 관련 글 추천 알고리즘
- [ ] 공유 유입 통계 수집

---

## 1️⃣1️⃣ 실제 사용 예시

### 시나리오: 카카오톡 공유 클릭

**1. 사용자 행동:**
- 카카오톡에서 카드 뉴스 클릭
- URL: `/teams/abc123/blog?utm_source=kakao&utm_content=post123`

**2. 랜딩 페이지:**
- 상단: "📤 이 글을 공유했습니다" 배지
- 공유된 글 전체 본문 (하이라이트)
- 팀 정보 1줄
- "이 팀 더 알아보기" 버튼

**3. 스크롤 40%:**
- 배지 자동 닫기
- 스티키 CTA 표시 ("이 팀에 가입하기")
- 관련 글 섹션 노출

**4. 스크롤 80%:**
- "더 많은 팀 이야기 보기" 섹션
- 블로그 전체 링크

---

## ✅ 완료 체크리스트

- [x] 공유 유입 감지 로직 (개발 고정)
- [x] Above the Fold 미세 조정 (Hero 완화)
- [x] 첫 CTA 문구 변경 (강요 제거)
- [x] 콘텐츠 우선 노출 순서 변경
- [x] 블로그 카드 미세 문구
- [x] 전환 CTA 재등장 타이밍
- [x] 신뢰 보강 마이크로 요소
- [x] 이탈 직전 방어 (모바일)
- [x] 공유 유입 전용 이벤트 태깅
- [x] 효과 기대치 (보수적)

---

## ✅ 천재 기준 최종 체크

- [x] 공유 유입 강요 ❌
- [x] 맥락 없는 CTA ❌
- [x] 관찰 → 신뢰 → 참여 ⭕
- [x] 기존 구조 재사용 ⭕

---

## 🚀 다음 단계

1. 공유 URL 생성 로직 구현
2. 공유 유입 배지 컴포넌트 구현
3. 관련 글 추천 알고리즘 구현
4. 스크롤 기반 동작 구현
5. Analytics 이벤트 추적 구현

