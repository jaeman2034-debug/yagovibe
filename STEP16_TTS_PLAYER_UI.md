# Step 16: TTS 플레이어 UI (React + Tailwind + Shadcn/ui + Firestore 연동)

## ✅ 구현 완료 검토

### 요구사항 체크리스트
- ✅ 리포트 목록 불러오기 (검색/필터 기능)
- ✅ 리포트 선택 기능
- ✅ 하단 고정 오디오 플레이어 (fixed bottom)
- ✅ 재생/일시정지 기능
- ✅ 시크 (탐색) 기능
- ✅ 볼륨 조절
- ✅ 음소거 토글
- ✅ 다운로드 기능
- ✅ 링크 복사 기능
- ✅ PDF 링크 (조건부 표시)
- ✅ Notion 링크 (조건부 표시)
- ✅ shadcn/ui 컴포넌트 사용 (Button, Card, Slider, Input)
- ✅ Tailwind 반응형 디자인
- ✅ 접근성 단축키 힌트 포함

## ✅ 구현 완료 사항

### 1. TTS 오디오 플레이어 컴포넌트
`src/components/TTSAudioPanel.tsx` 생성:
- Firestore `reports` 컬렉션 실시간 구독
- 리포트 목록 표시 및 검색 기능
- 오디오 플레이어 컨트롤 (재생/정지, 탐색, 볼륨)
- 다운로드 및 링크 복사 기능
- 키보드 단축키 지원

### 2. UI 컴포넌트
- `src/components/ui/slider.tsx` - 슬라이더 컴포넌트 (Radix UI)
- `src/components/ui/card.tsx` - CardHeader, CardTitle 추가

### 3. 라우팅
- `/app/market/voice` 경로 추가
- Market 페이지에 "음성 플레이어" 버튼 추가

## 🎨 주요 기능

### 하단 고정 플레이어
- 플레이어가 화면 하단에 고정되어 스크롤해도 항상 표시
- `fixed bottom-0 left-0 right-0 z-50` 클래스로 구현
- 리포트 목록과 겹치지 않도록 `pb-32` 패딩 적용

### Notion 링크 지원
- 리포트에 `notionUrl` 필드가 있으면 "Notion 보기" 버튼 자동 표시
- n8n 워크플로우에서 생성된 Notion 페이지 링크 연결

### 1. 리포트 목록
- Firestore에서 `reports` 컬렉션 실시간 구독
- 제목, 날짜, 요약 표시
- 검색 기능 (제목, 요약 검색)
- 음성 파일 존재 여부 표시 (🎧 / ⏳)

### 2. 오디오 플레이어
- **재생/정지**: Play/Pause 버튼
- **탐색**: 5초 앞/뒤 이동, 슬라이더로 임의 위치 이동
- **볼륨**: 볼륨 슬라이더, 음소거 토글
- **시간 표시**: 현재 재생 시간 / 전체 시간 (MM:SS)
- **다운로드**: MP3 파일 다운로드
- **링크 복사**: TTS URL 클립보드 복사

### 3. 키보드 단축키
- `Space`: 재생/정지
- `←/→`: 5초 앞/뒤 탐색
- `↑/↓`: 볼륨 증가/감소
- `Ctrl/Cmd + C`: 링크 복사 (입력 중이 아닐 때)

## 📊 컴포넌트 구조

```typescript
TTSAudioPanel
├── 리포트 목록 (Card)
│   ├── 검색 입력 (Input)
│   └── 리포트 아이템 목록
│       └── 리포트 선택 시 현재 리포트로 설정
│
└── 오디오 플레이어 (Card)
    ├── 리포트 정보 (제목, 요약)
    ├── 재생 컨트롤
    │   ├── 뒤로 5초 (SkipBack)
    │   ├── 재생/정지 (Play/Pause)
    │   ├── 앞으로 5초 (SkipForward)
    │   └── 탐색 슬라이더
    ├── 액션 버튼
    │   ├── 다운로드
    │   ├── 링크 복사
    │   └── PDF 보기
    ├── 볼륨 컨트롤
    │   ├── 음소거 토글
    │   └── 볼륨 슬라이더
    └── 오디오 엘리먼트 (hidden)
```

## 🔧 사용 방법

### 1. 페이지 접근
```
/app/market/voice
```

또는 Market 페이지에서 "음성 플레이어" 버튼 클릭

### 2. 리포트 선택
- 리포트 목록에서 리포트 클릭
- 자동으로 오디오 플레이어에 로드

### 3. 오디오 재생
- **재생 버튼** 클릭 또는 `Space` 키
- **탐색 슬라이더**로 원하는 위치로 이동
- **볼륨 슬라이더**로 볼륨 조절

### 4. 다운로드 및 공유
- **다운로드 버튼**: MP3 파일 다운로드
- **링크 복사 버튼**: TTS URL 클립보드 복사
- **PDF 보기 버튼**: 리포트 PDF 열기 (있는 경우)

## ⚙️ 기술 스택

### UI 라이브러리
- **React**: 컴포넌트 프레임워크
- **Tailwind CSS**: 스타일링
- **Shadcn/ui**: UI 컴포넌트 (Button, Card, Input, Slider)
- **Radix UI**: 접근성 기반 컴포넌트 (Slider)
- **Lucide React**: 아이콘

### 데이터 연동
- **Firebase Firestore**: 리포트 데이터 실시간 구독
- **Firebase Storage**: TTS MP3 파일 저장 및 Signed URL

## 📦 의존성 설치

```bash
npm install @radix-ui/react-slider
```

## 🎨 UI 특징

### 반응형 디자인
- 모바일: 세로 스택 레이아웃
- 데스크톱: 가로 정렬 최적화

### 다크 모드 지원
- `dark:` 클래스로 다크 모드 스타일 적용
- 시스템 테마 자동 감지

### 접근성
- 키보드 단축키 지원
- ARIA 레이블 및 역할
- 포커스 관리

## ✅ 체크리스트

- ✅ `TTSAudioPanel.tsx` 컴포넌트 생성
- ✅ `slider.tsx` UI 컴포넌트 생성
- ✅ `card.tsx`에 CardHeader, CardTitle 추가
- ✅ `@radix-ui/react-slider` 설치
- ✅ `/app/market/voice` 라우트 추가
- ✅ Market 페이지에 "음성 플레이어" 버튼 추가
- ✅ Firestore 실시간 구독 구현
- ✅ 오디오 플레이어 컨트롤 구현
- ✅ 키보드 단축키 구현
- ✅ 다운로드 및 링크 복사 기능 구현

## 🎉 완성!

**이제 리포트의 TTS 음성 파일을 웹에서 직접 재생할 수 있습니다!** 🚀

## 💡 추가 팁

### 1. 오디오 포맷 지원
현재는 MP3만 지원합니다. 다른 포맷을 지원하려면:
- `audio` 엘리먼트의 `src` 속성에 직접 URL 사용
- 브라우저가 자동으로 포맷 감지

### 2. 재생 목록 기능 (추가 가능)
여러 리포트를 순차적으로 재생하는 기능:
```typescript
const [playlist, setPlaylist] = useState<Report[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
```

### 3. 재생 속도 조절 (추가 가능)
```typescript
const [playbackRate, setPlaybackRate] = useState(1);
audioRef.current.playbackRate = playbackRate;
```

### 4. 자동 재생 (선택 사항)
페이지 로드 시 자동 재생:
```typescript
useEffect(() => {
  if (currentTtsUrl && autoPlay) {
    audioRef.current?.play();
  }
}, [currentTtsUrl, autoPlay]);
```

