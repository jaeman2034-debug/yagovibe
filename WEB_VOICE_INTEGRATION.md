# 🌐 웹 지도 페이지 음성 기능 통합 가이드

## ✅ 완료된 작업

### 1. 서버 API 생성 (`functions/src/api/voice.ts`)
- 웹용 음성 명령 API 엔드포인트
- 텍스트 입력 → 서버 의도 판단 → 지도 액션 결정
- 기존 `voiceStep` 로직 재사용

### 2. 클라이언트 유틸리티 (`src/utils/voiceMapAPI.ts`)
- `callVoiceAPI()` 함수 제공
- 프로덕션/개발 환경 자동 감지

### 3. Functions Export (`functions/src/index.ts`)
- `apiVoice` 함수 export 추가

---

## 🔧 웹 페이지 통합 방법

### 방법 1: 기존 검색창 활용 (추천)

`src/pages/market/MarketPage.tsx`의 `handleAISearch` 함수를 수정:

```typescript
import { callVoiceAPI } from "@/utils/voiceMapAPI";

const handleVoiceCommand = async (text: string) => {
  try {
    setAiSearchLoading(true);
    
    // 서버 API 호출
    const response = await callVoiceAPI(
      text,
      userLoc?.lat,
      userLoc?.lng
    );
    
    // 서버 응답에 따라 지도 업데이트
    if (response.intent === 'OPEN_NAVIGATE' && response.destination) {
      // 네비게이션: 지도 중심 이동
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({
          lat: response.destination.lat,
          lng: response.destination.lng,
        });
        mapInstanceRef.current.setZoom(15);
      }
      
      // 사용자에게 메시지 표시
      alert(response.message);
    } else if (response.intent === 'OPEN_MAP' && response.query) {
      // 검색: 검색어로 필터링
      setSearchQuery(response.query);
      await handleAISearch(response.query);
      
      // 사용자에게 메시지 표시
      alert(response.message);
    } else {
      // NOOP: 메시지만 표시
      alert(response.message);
    }
  } catch (error) {
    console.error('음성 명령 처리 실패:', error);
    alert('명령 처리에 실패했습니다.');
  } finally {
    setAiSearchLoading(false);
  }
};
```

### 방법 2: 마이크 버튼을 텍스트 입력 버튼으로 변경

기존 마이크 버튼(`🎙️ 말로 장소 찾기`)을 클릭하면 텍스트 입력 모달 표시:

```typescript
const [showVoiceInput, setShowVoiceInput] = useState(false);
const [voiceInputText, setVoiceInputText] = useState("");

// 마이크 버튼 클릭 핸들러
<button
  onClick={() => setShowVoiceInput(true)}
  className="..."
>
  🎙️ 말로 장소 찾기
</button>

// 텍스트 입력 모달
{showVoiceInput && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 w-96">
      <h3 className="text-lg font-bold mb-4">장소를 말로 찾기</h3>
      <input
        type="text"
        value={voiceInputText}
        onChange={(e) => setVoiceInputText(e.target.value)}
        placeholder="예: 활기찬 운동장"
        className="w-full px-4 py-2 border rounded-lg mb-4"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={async () => {
            if (voiceInputText.trim()) {
              await handleVoiceCommand(voiceInputText);
              setShowVoiceInput(false);
              setVoiceInputText("");
            }
          }}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          찾기
        </button>
        <button
          onClick={() => {
            setShowVoiceInput(false);
            setVoiceInputText("");
          }}
          className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
        >
          취소
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 🗺️ 지도 업데이트 방법

### OptimizedProductMap 컴포넌트에 지도 인스턴스 접근

`src/components/market/OptimizedProductMap.tsx`에서 지도 인스턴스를 ref로 노출:

```typescript
// OptimizedProductMap.tsx
export default function OptimizedProductMap({
  // ... props
  onMapReady?: (map: google.maps.Map) => void; // 추가
}) {
  // ...
  
  useEffect(() => {
    if (mapInstanceRef.current && onMapReady) {
      onMapReady(mapInstanceRef.current);
    }
  }, [mapInstanceRef.current]);
  
  // ...
}
```

### MarketPage에서 지도 인스턴스 저장

```typescript
const mapInstanceRef = useRef<google.maps.Map | null>(null);

<OptimizedProductMap
  // ... props
  onMapReady={(map) => {
    mapInstanceRef.current = map;
  }}
/>
```

---

## 🚀 배포 방법

### 1. Firebase Functions 배포

```bash
cd functions
npm run build
firebase deploy --only functions:apiVoice
```

### 2. 환경 변수 확인

- `OPENAI_API_KEY`: OpenAI API 키
- `GMAPS_API_KEY`: Google Maps API 키

---

## 📝 사용 예시

### 사용자 입력: "활기찬 운동장"

1. **웹**: 텍스트 입력 → `callVoiceAPI("활기찬 운동장", lat, lng)` 호출
2. **서버**: Agent 실행 → 의도 분석 → 검색 실행
3. **응답**:
   ```json
   {
     "intent": "OPEN_MAP",
     "query": "활기찬 운동장",
     "message": "활기찬 운동장을 찾았습니다.",
     "places": [
       {
         "id": "place_1",
         "lat": 37.5665,
         "lng": 126.9780,
         "name": "올림픽공원",
         "address": "서울시 송파구"
       }
     ]
   }
   ```
4. **웹**: 검색어로 필터링 + 지도 중심 이동

---

## ✅ 장점

1. **STT 엔진 문제 회피**: 웹에서는 텍스트 입력만 사용
2. **서버 중심 로직**: 의도 판단은 서버에서 처리
3. **웹은 결과만 표시**: 지도 업데이트만 담당
4. **디버깅 용이**: 서버 로그로 모든 판단 과정 확인 가능
5. **확장성**: 나중에 STT 추가 가능 (서버 API는 그대로)

---

## 🔑 핵심 원칙

> **웹은 절대 판단 안 함. 서버만 판단. 웹은 결과만 표시.**

이 구조로 가면:
- STT 엔진 무한 루프 문제 ❌
- 엔진 잔여 이벤트 문제 ❌
- stop/start 지옥 ❌
- 상태 꼬임 문제 ❌

**모두 해결됨.**
