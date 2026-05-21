import TopGameCard from "@/components/home/TopGameCard";

function Header() {
  return (
    <header className="mb-3">
      <h1 className="text-2xl font-black tracking-tight text-gray-900">YAGO HOME</h1>
      <p className="mt-1 text-sm text-gray-600">오늘도 게임처럼 성장해요.</p>
    </header>
  );
}

function LocationBar() {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
      서울 · 강남구
    </div>
  );
}

function QuickStartGrid() {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-sm font-bold text-gray-700">빠른 시작</h3>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="rounded-xl border bg-white p-3 text-left text-sm font-semibold">
          미니슛 시작
        </button>
        <button type="button" className="rounded-xl border bg-white p-3 text-left text-sm font-semibold">
          주간 랭킹 보기
        </button>
      </div>
    </section>
  );
}

function SportsCategoryGrid() {
  return (
    <section className="mb-16">
      <h3 className="mb-2 text-sm font-bold text-gray-700">스포츠 카테고리</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-white p-3 text-center text-sm font-semibold">축구</div>
        <div className="rounded-xl border bg-white p-3 text-center text-sm font-semibold">농구</div>
        <div className="rounded-xl border bg-white p-3 text-center text-sm font-semibold">야구</div>
      </div>
    </section>
  );
}

function FloatingActionButton() {
  return (
    <button
      type="button"
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-blue-600 text-2xl text-white shadow-lg"
      aria-label="빠른 액션"
    >
      +
    </button>
  );
}

export default function HomePage() {
  // TODO: 실제 gameProgression/weekly cap 데이터로 교체
  const user = {
    gameProgression: { totalXp: 240 },
    weeklyXp: 240,
    weeklyXpCap: 300,
  };

  const stage = user.gameProgression.totalXp > 0 ? "ACTIVE" : "NEW";

  return (
    <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl md:p-4">
      <Header />
      <LocationBar />
      <TopGameCard stage={stage} xp={user.weeklyXp} xpCap={user.weeklyXpCap} />
      <QuickStartGrid />
      <SportsCategoryGrid />
      <FloatingActionButton />
    </div>
  );
}
