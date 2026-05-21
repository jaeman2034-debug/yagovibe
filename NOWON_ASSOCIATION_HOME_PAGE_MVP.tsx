/**
 * 노원구 축구협회 홈 페이지 MVP
 * 
 * 파일 위치: app/a/[associationSlug]/page.tsx (Next.js)
 * 또는: src/pages/association/AssociationHomePageMVP.tsx (React Router)
 * 
 * 핵심 섹션:
 * - Hero
 * - Quick Actions
 * - Today Matches
 * - Notices
 * - Standings
 * - Recent Results
 * - Footer
 */

import Link from "next/link";
// React Router 사용 시:
// import { Link } from "react-router-dom";

export default function AssociationHomePage() {
  // 임시 데이터 (실제로는 서버에서 가져옴)
  const matches = [
    {
      id: "m1",
      home: "노원FC",
      away: "중계FC",
      time: "15:00",
      venue: "마들스타디움",
      status: "예정",
    },
    {
      id: "m2",
      home: "상계FC",
      away: "하계FC",
      time: "17:00",
      venue: "노원구민운동장",
      status: "예정",
    },
  ];

  const notices = [
    { id: "n1", title: "2025 시즌 참가팀 등록 안내", date: "2026-03-01" },
    { id: "n2", title: "마들구장 사용 일정 변경 공지", date: "2026-02-25" },
    { id: "n3", title: "선수 등록 서류 제출 안내", date: "2026-02-20" },
  ];

  const standings = [
    { rank: 1, team: "노원FC", played: 5, points: 13 },
    { rank: 2, team: "상계FC", played: 5, points: 11 },
    { rank: 3, team: "중계FC", played: 5, points: 9 },
    { rank: 4, team: "하계FC", played: 5, points: 7 },
    { rank: 5, team: "월계FC", played: 5, points: 6 },
  ];

  const results = [
    { id: "r1", home: "노원FC", away: "상계FC", score: "2 : 1" },
    { id: "r2", home: "중계FC", away: "하계FC", score: "1 : 1" },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HERO SECTION */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h1 className="text-4xl font-bold md:text-5xl">
            노원구 축구협회
          </h1>

          <p className="mt-4 text-lg text-slate-300">
            노원구 축구 리그, 팀, 선수 기록을 한 곳에서 확인하세요.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/a/nowon-football/matches"
              className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold transition hover:bg-emerald-600"
            >
              경기 일정 보기
            </Link>

            <Link
              href="/a/nowon-football/teams"
              className="rounded-lg border border-white/20 bg-white/10 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/20"
            >
              팀 목록 보기
            </Link>
          </div>

          {/* 통계 카드 */}
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-bold md:text-3xl">45</div>
              <div className="mt-1 text-xs text-slate-300 md:text-sm">가맹 클럽</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-bold md:text-3xl">3</div>
              <div className="mt-1 text-xs text-slate-300 md:text-sm">운영 대회</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-bold md:text-3xl">120</div>
              <div className="mt-1 text-xs text-slate-300 md:text-sm">활성 팀</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="text-2xl font-bold md:text-3xl">28</div>
              <div className="mt-1 text-xs text-slate-300 md:text-sm">이번 달 경기</div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ActionCard title="경기 일정" href="/a/nowon-football/matches" />
          <ActionCard title="순위표" href="/a/nowon-football/stats" />
          <ActionCard title="팀 목록" href="/a/nowon-football/teams" />
          <ActionCard title="선수 목록" href="/a/nowon-football/players" />
        </div>
      </section>

      {/* MATCHES + NOTICES */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* 오늘 경기 */}
          <div>
            <SectionTitle title="오늘 경기" link="/a/nowon-football/matches" />

            <div className="space-y-4">
              {matches.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  오늘 예정된 경기가 없습니다.
                </div>
              ) : (
                matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))
              )}
            </div>
          </div>

          {/* 공지사항 */}
          <div>
            <SectionTitle title="공지사항" link="/a/nowon-football/notices" />

            <div className="space-y-3">
              {notices.map((n) => (
                <NoticeItem key={n.id} notice={n} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STANDINGS */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionTitle title="리그 순위" link="/a/nowon-football/stats" />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-100 text-sm">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">순위</th>
                <th className="p-3 text-left font-semibold text-slate-700">팀</th>
                <th className="p-3 text-center font-semibold text-slate-700">경기</th>
                <th className="p-3 text-center font-semibold text-slate-700">승점</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((row) => (
                <tr key={row.rank} className="border-t border-slate-100 transition hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{row.rank}</td>
                  <td className="p-3 font-medium text-slate-900">{row.team}</td>
                  <td className="p-3 text-center text-slate-600">{row.played}</td>
                  <td className="p-3 text-center font-bold text-slate-900">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECENT RESULTS */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionTitle title="최근 경기 결과" link="/a/nowon-football/matches" />

        <div className="grid gap-4 md:grid-cols-2">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-20 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="font-bold">노원구 축구협회</p>

          <p className="mt-2 text-sm text-slate-400">
            서울특별시 노원구
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
            <Link href="/a/nowon-football/about" className="hover:text-white">
              협회소개
            </Link>
            <Link href="/a/nowon-football/contact" className="hover:text-white">
              연락처
            </Link>
            <Link href="/privacy" className="hover:text-white">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="hover:text-white">
              이용약관
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Quick Action Card
function ActionCard({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <p className="font-semibold text-slate-900 group-hover:text-emerald-600">
        {title}
      </p>
    </Link>
  );
}

// Section Title with Link
function SectionTitle({ title, link }: { title: string; link: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>

      <Link
        href={link}
        className="text-sm font-medium text-slate-500 transition hover:text-emerald-600"
      >
        전체보기 →
      </Link>
    </div>
  );
}

// Match Card
function MatchCard({ match }: { match: any }) {
  return (
    <Link
      href={`/a/nowon-football/matches/${match.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="mb-2 text-xs font-medium text-slate-500">
        {match.venue}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="text-right text-sm font-semibold text-slate-900">
          {match.home}
        </span>

        <span className="text-lg font-bold text-slate-400">VS</span>

        <span className="text-left text-sm font-semibold text-slate-900">
          {match.away}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">{match.time}</div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {match.status}
        </span>
      </div>
    </Link>
  );
}

// Notice Item
function NoticeItem({ notice }: { notice: any }) {
  return (
    <Link
      href={`/a/nowon-football/notices/${notice.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <p className="font-medium text-slate-900">{notice.title}</p>

      <p className="mt-1 text-xs text-slate-500">{notice.date}</p>
    </Link>
  );
}

// Result Card
function ResultCard({ result }: { result: any }) {
  return (
    <Link
      href={`/a/nowon-football/matches/${result.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{result.home}</span>

        <span className="text-lg font-bold text-slate-900">{result.score}</span>

        <span className="text-sm font-semibold text-slate-900">{result.away}</span>
      </div>
    </Link>
  );
}
