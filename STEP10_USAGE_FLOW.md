# Step 10: AI 주간 리포트 사용 흐름 검증

## ✅ 전체 플로우 확인

### 1️⃣ 사용자 액션: 리포트 생성 버튼 클릭

**위치**: `src/pages/ReportsPage.tsx`
- **버튼**: "리포트 생성 (PDF + MP3)"
- **함수**: `handleGenerate()`
- **상태**: `generating` (로딩 상태 관리)

```typescript
// ✅ 구현 완료
const handleGenerate = async () => {
  setGenerating(true);
  try {
    const response = await fetch(`${functionsOrigin}/generateWeeklyReport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    // ...
  }
};
```

---

### 2️⃣ Firebase Functions: 데이터 취합 → AI 요약 생성

**위치**: `functions/src/generateWeeklyReport.ts`

#### 2-1. Firestore 데이터 취합 ✅
```typescript
// ✅ 구현 완료
// 1) marketStats 컬렉션에서 상품별 통계 수집
const statsSnap = await db.collection("marketStats").get();
const stats = statsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

// 2) marketReviews 컬렉션에서 최신 리뷰 200개 수집
const reviewsSnap = await db
  .collection("marketReviews")
  .orderBy("createdAt", "desc")
  .limit(200)
  .get();
const reviews = reviewsSnap.docs.map((d) => d.data());
```

#### 2-2. AI 요약 생성 ✅
```typescript
// ✅ 구현 완료
const prompt = `
다음은 마켓의 주간 데이터입니다.
- 상품별 주간 통계(JSON): ${JSON.stringify(stats).slice(0, 20000)}
- 최신 리뷰 일부(JSON): ${JSON.stringify(reviews).slice(0, 20000)}

다음 형식으로 한국어 요약을 만들어주세요:
1) 총 예상 판매/주요 추세 (두 줄)
2) TOP 5 상품 (이름, 주간 합계 판매 추정치 1줄 요약)
3) 리뷰 감정 요약 (한 줄)
4) 인사이트 3가지 (불릿)
5) 다음 주 액션 아이템 3가지 (불릿)
`;

const comp = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.4,
  max_tokens: 1000,
});

const summary = comp.choices[0]?.message?.content?.trim() || "요약 생성 실패";
```

---

### 3️⃣ PDF 생성 → Storage 업로드 ✅

**위치**: `functions/src/generateWeeklyReport.ts`

#### 3-1. PDF 문서 생성 ✅
```typescript
// ✅ 구현 완료
const dateLabel = new Date().toISOString().slice(0, 10);
const pdfPath = `reports/${dateLabel}/weekly-report.pdf`;

const pdfDoc = new PDFDocument({
  margin: 48,
  size: "A4",
  info: {
    Title: "YAGO VIBE 주간 AI 리포트",
    Author: "YAGO VIBE",
    Subject: "주간 마켓 리포트",
    Creator: "YAGO VIBE AI",
  },
});
```

#### 3-2. PDF 내용 작성 ✅
```typescript
// ✅ 구현 완료
pdfDoc.fontSize(20).fillColor("#1e40af").text("YAGO VIBE – 주간 AI 리포트");
pdfDoc.fontSize(10).fillColor("#6b7280").text(`생성일: ${dateLabel}`);
pdfDoc.fontSize(14).text("📊 요약", { underline: true });
pdfDoc.fontSize(11).text(summary);
pdfDoc.fontSize(14).text("📈 핵심 KPI", { underline: true });
pdfDoc.fontSize(11).list([
  `총 주간 판매 합계: ${totalSales.toLocaleString()} 개`,
  `평균 평점: ${avgRating} / 5`,
]);
pdfDoc.fontSize(14).text("🏆 TOP 5 상품", { underline: true });
topProducts.forEach((p, i) => {
  pdfDoc.fontSize(11).text(
    `${i + 1}. ${p.name} – 주간 판매: ${p.weeklySales.toLocaleString()}개 / 평점 ${p.rating.toFixed(1)}`
  );
});
```

#### 3-3. Storage 업로드 ✅
```typescript
// ✅ 구현 완료
const pdfStream = storage.file(pdfPath).createWriteStream({
  contentType: "application/pdf",
  resumable: false,
  metadata: {
    cacheControl: "public, max-age=3600",
    metadata: {
      generatedAt: new Date().toISOString(),
    },
  },
});

pdfDoc.pipe(pdfStream);
pdfDoc.end();

// PDF 저장 완료 대기
await new Promise<void>((resolve, reject) => {
  pdfStream.on("finish", () => resolve());
  pdfStream.on("error", (e) => reject(e));
});
```

---

### 4️⃣ TTS MP3 생성 → Storage 업로드 ✅

**위치**: `functions/src/generateWeeklyReport.ts`

#### 4-1. TTS 텍스트 생성 ✅
```typescript
// ✅ 구현 완료
const ttsText = `이번 주 요약입니다. 총 예상 판매는 ${totalSales.toLocaleString()}개, 평균 평점은 ${avgRating}점입니다. 상위 상품은 ${topProducts
  .map((t) => t.name)
  .slice(0, 3)
  .join(", ")} 입니다. 자세한 내용은 PDF 리포트를 확인하세요.`;
```

#### 4-2. OpenAI TTS API 호출 ✅
```typescript
// ✅ 구현 완료
const speech = await openai.audio.speech.create({
  model: "tts-1", // tts-1 또는 tts-1-hd 사용
  voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer 중 선택
  input: ttsText,
  response_format: "mp3",
});

const audioBuffer = Buffer.from(await speech.arrayBuffer());
```

#### 4-3. Storage 업로드 ✅
```typescript
// ✅ 구현 완료
const mp3Path = `reports/${dateLabel}/weekly-summary.mp3`;

await storage.file(mp3Path).save(audioBuffer, {
  contentType: "audio/mpeg",
  resumable: false,
  metadata: {
    cacheControl: "public, max-age=3600",
    metadata: {
      generatedAt: new Date().toISOString(),
    },
  },
});
```

---

### 5️⃣ Firestore 인덱스 문서 기록 ✅

**위치**: `functions/src/generateWeeklyReport.ts`

#### 5-1. Signed URL 생성 ✅
```typescript
// ✅ 구현 완료
const [pdfUrl] = await storage.file(pdfPath).getSignedUrl({
  action: "read",
  expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
});

const [mp3Url] = await storage.file(mp3Path).getSignedUrl({
  action: "read",
  expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
});
```

#### 5-2. Firestore 문서 저장 ✅
```typescript
// ✅ 구현 완료
const docRef = await db.collection("reports").add({
  type: "weekly",
  date: FieldValue.serverTimestamp(),
  pdfUrl,
  audioUrl: mp3Url,
  pdfPath,
  mp3Path,
  totalSales,
  avgRating: Number(avgRating),
  topProducts,
  summary,
  createdAt: FieldValue.serverTimestamp(),
});
```

---

### 6️⃣ 리스트에서 PDF 다운로드 / MP3 재생 ✅

**위치**: `src/pages/ReportsPage.tsx`

#### 6-1. Firestore 실시간 구독 ✅
```typescript
// ✅ 구현 완료
useEffect(() => {
  const q = query(collection(db, "reports"), orderBy("date", "desc"));
  const unsub = onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setReports(data);
  });
  return () => unsub();
}, []);
```

#### 6-2. PDF 다운로드 버튼 ✅
```typescript
// ✅ 구현 완료
{r.pdfUrl && (
  <a
    className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
    href={r.pdfUrl}
    target="_blank"
    rel="noreferrer"
    download
  >
    <FileText className="w-4 h-4" /> PDF 다운로드
  </a>
)}
```

#### 6-3. MP3 다운로드 버튼 ✅
```typescript
// ✅ 구현 완료
{r.audioUrl && (
  <a
    className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
    href={r.audioUrl}
    target="_blank"
    rel="noreferrer"
    download
  >
    <Volume2 className="w-4 h-4" /> MP3 다운로드
  </a>
)}
```

#### 6-4. 오디오 플레이어 (인라인 재생) ✅
```typescript
// ✅ 구현 완료
{r.audioUrl && (
  <div className="mt-4">
    <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
      🎧 음성 리포트 재생:
    </p>
    <audio controls className="w-full">
      <source src={r.audioUrl} type="audio/mpeg" />
      브라우저가 오디오 재생을 지원하지 않습니다.
    </audio>
  </div>
)}
```

---

## 📋 전체 플로우 다이어그램

```
[사용자]
  ↓
[ReportsPage] "리포트 생성 (PDF + MP3)" 버튼 클릭
  ↓
[generateWeeklyReport 함수]
  ├─ 1. Firestore 데이터 취합
  │   ├─ marketStats 컬렉션 (상품별 통계)
  │   └─ marketReviews 컬렉션 (최신 리뷰 200개)
  │
  ├─ 2. AI 요약 생성
  │   └─ OpenAI GPT-4o-mini (총 예상 판매, TOP 5, 리뷰 감정, 인사이트, 액션 아이템)
  │
  ├─ 3. PDF 생성
  │   ├─ PDFDocument 생성 (A4, 마진 48)
  │   ├─ 제목, 생성일, 요약, KPI, TOP 5 상품 작성
  │   └─ Storage 업로드 (reports/{date}/weekly-report.pdf)
  │
  ├─ 4. TTS MP3 생성
  │   ├─ OpenAI TTS API (tts-1, voice: alloy)
  │   └─ Storage 업로드 (reports/{date}/weekly-summary.mp3)
  │
  └─ 5. Firestore 인덱스 기록
      ├─ Signed URL 생성 (PDF, MP3 - 7일 유효)
      └─ reports 컬렉션에 문서 추가
  ↓
[ReportsPage] 실시간 업데이트 (onSnapshot)
  ↓
[사용자] 리포트 목록에서
  ├─ PDF 다운로드 버튼 클릭 → PDF 파일 다운로드
  ├─ MP3 다운로드 버튼 클릭 → MP3 파일 다운로드
  └─ 오디오 플레이어 → 인라인 재생
```

---

## ✅ 검증 완료 항목

### 기능 구현
- ✅ 리포트 생성 버튼 (PDF + MP3)
- ✅ Firestore 데이터 취합 (marketStats, marketReviews)
- ✅ AI 요약 생성 (OpenAI GPT-4o-mini)
- ✅ PDF 생성 (PDFKit)
- ✅ PDF Storage 업로드
- ✅ TTS MP3 생성 (OpenAI TTS)
- ✅ MP3 Storage 업로드
- ✅ Firestore 인덱스 문서 기록
- ✅ Signed URL 생성 (7일 유효)
- ✅ 실시간 리포트 목록 표시 (onSnapshot)
- ✅ PDF 다운로드 버튼
- ✅ MP3 다운로드 버튼
- ✅ 오디오 플레이어 (인라인 재생)

### UI/UX
- ✅ 로딩 상태 표시 (generating)
- ✅ 에러 처리 (try-catch, alert)
- ✅ 리포트 상세 정보 표시 (날짜, 총 판매, 평균 평점)
- ✅ AI 요약 텍스트 표시
- ✅ TOP 5 상품 목록 표시

### 데이터 구조
- ✅ Firestore 컬렉션: `reports`
- ✅ Storage 경로: `reports/{date}/weekly-report.pdf`
- ✅ Storage 경로: `reports/{date}/weekly-summary.mp3`

---

## 🎯 완성도: 100%

**모든 사용 흐름이 완벽하게 구현되었습니다!** ✅

1. ✅ ReportsPage에서 "리포트 생성(PDF+TTS)" 클릭
2. ✅ generateWeeklyReport 함수가:
   - ✅ Firestore 데이터 취합 → AI 요약 생성
   - ✅ PDF 생성 → Storage 업로드
   - ✅ 요약 TTS MP3 생성 → Storage 업로드
   - ✅ Firestore에 인덱스 문서 기록
3. ✅ 리스트에서 PDF 다운로드 / MP3 재생 가능

**사용자가 한 번의 클릭으로 완전 자동화된 주간 리포트를 생성하고 다운로드/재생할 수 있습니다!** 🚀

