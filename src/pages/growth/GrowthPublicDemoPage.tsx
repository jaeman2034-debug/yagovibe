/**
 * 공개 `/growth` — AI Sports Intelligence 데모 랜딩 (정부과제·투자·심사용)
 * 로그인 없이: 소개 · FII · 시연 영상 · 샘플 PDF · 파이프라인 이해
 */
import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Download,
  FileText,
  PlayCircle,
  Shield,
  Sparkles,
  TrendingUp,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlossaryQuickBar } from "@/components/glossary/GlossaryQuickBar";
import { GlossaryTooltip } from "@/components/glossary/GlossaryTooltip";
import {
  FII_DIMENSIONS,
  FII_OVERALL_SCORE,
  FII_TREND_SAMPLE,
  GROWTH_PATENT_APPLICATION_NO,
  GROWTH_SAMPLE_PDF_FILENAME,
  GROWTH_SAMPLE_PDF_PATH,
  GROWTH_VALIDATION_PIPELINE_STEPS,
  PLATFORM_FEATURES,
  growthDemoYoutubeEmbedUrl,
  growthDemoYoutubeVideoId,
  growthLiteDemoLoginPath,
  growthLiteDemoPath,
  growthValidationDemoLoginPath,
  growthValidationDemoPath,
} from "@/lib/growth/growthPublicDemoConfig";

const FEATURE_ICONS = [Brain, Shield, FileText, UserCircle2, Sparkles] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function GrowthPublicDemoPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const validationPath = useMemo(() => growthValidationDemoPath(), []);
  const litePath = useMemo(() => growthLiteDemoPath(), []);
  const demoEmbedUrl = useMemo(() => growthDemoYoutubeEmbedUrl(), []);
  const hasDemoVideo = useMemo(() => growthDemoYoutubeVideoId() !== null, []);
  const isLoggedIn = !!user && !user.isAnonymous;

  const goLiveExperience = () => {
    if (loading) return;
    if (isLoggedIn) {
      navigate(validationPath);
      return;
    }
    navigate(growthValidationDemoLoginPath());
  };

  useEffect(() => {
    const title = "AI Sports Intelligence — YAGO SPORTS";
    const description =
      "로그인 없이 FII 분석 구조, 샘플 리포트 및 시연 영상을 확인할 수 있는 AI 축구 인텔리전스 데모.";
    document.title = title;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", `${window.location.origin}/growth`, true);
    setMeta("og:type", "website", true);
  }, []);

  const radarData = FII_DIMENSIONS.map((d) => ({
    axis: d.label,
    score: d.score,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-sm font-semibold tracking-wide text-indigo-200">
            YAGO SPORTS
          </Link>
          <Badge variant="outline" className="border-emerald-400/40 text-[10px] text-emerald-200">
            로그인 없이 열람 가능
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24" data-testid="growth-demo-hero">
        <Badge className="mb-4 border-indigo-400/40 bg-indigo-500/20 text-indigo-100">
          AI Sports Intelligence Demo
        </Badge>
        <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          AI Sports Intelligence Platform
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-indigo-100/90 sm:text-lg">
          AI가 경기 영상을 분석하여 선수의 성장과 축구 인텔리전스를 정량적으로 평가합니다.
        </p>
        <div className="mt-5 rounded-xl border border-violet-400/25 bg-violet-950/40 px-4 py-3 sm:inline-block">
          <p className="text-[11px] font-medium uppercase tracking-wider text-violet-300">
            특허 출원번호
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-white sm:text-base">
            {GROWTH_PATENT_APPLICATION_NO}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            size="lg"
            className="gap-2 bg-violet-600 hover:bg-violet-500"
            onClick={() => scrollToId("demo-video")}
            data-testid="growth-demo-cta-video"
          >
            <PlayCircle className="h-4 w-4" />
            3분 시연 영상 보기
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-white/25 bg-white/5 text-white hover:bg-white/10"
            onClick={() => scrollToId("sample-report")}
            data-testid="growth-demo-cta-sample"
          >
            <FileText className="h-4 w-4" />
            샘플 성장 리포트 보기
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-white/25 bg-white/5 text-white hover:bg-white/10"
            onClick={goLiveExperience}
            disabled={loading}
            data-testid="growth-demo-cta-live"
          >
            실제 AI 분석 체험
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          ※ 시연 영상·샘플 리포트는 로그인 없이 확인 가능 · 실제 체험은 회원 로그인 후 제공
        </p>
      </section>

      {/* Demo video */}
      <section
        id="demo-video"
        className="border-t border-white/10 bg-slate-900/50 py-16 sm:py-20"
        data-testid="growth-demo-video"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">3분 데모 영상</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            영상 업로드 → Whisper → AI 태깅 → 코치 검증 → FII 리포트까지의 YAGO Growth 파이프라인
          </p>

          {hasDemoVideo && demoEmbedUrl ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <div className="relative aspect-video w-full">
                <iframe
                  title="YAGO AI Sports Intelligence 3분 데모"
                  src={demoEmbedUrl}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-violet-400/40 bg-violet-950/20 p-6 sm:p-8">
              <p className="text-sm font-medium text-violet-100">
                시연 영상 URL이 설정되면 여기에 YouTube 플레이어가 표시됩니다.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                배포 시{" "}
                <code className="rounded bg-white/10 px-1 py-0.5">VITE_GROWTH_DEMO_YOUTUBE_URL</code>
                환경 변수에 3분 데모 영상 링크를 넣으세요.
              </p>
            </div>
          )}

          <ol className="mt-8 grid gap-3 sm:grid-cols-5">
            {GROWTH_VALIDATION_PIPELINE_STEPS.map((item) => (
              <li
                key={item.step}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  Step {item.step}
                </p>
                <p className="mt-1 text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-[10px] leading-snug text-slate-400">{item.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FII */}
      <section
        id="fii"
        className="py-16 sm:py-20"
        data-testid="growth-demo-fii"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
                Football Intelligence Index
              </p>
              <h2 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
                <GlossaryTooltip termId="FII" size="md" className="text-white" />
                <span>— 5축 인텔리전스</span>
              </h2>
            </div>
            <div className="rounded-2xl border border-violet-400/30 bg-violet-600/20 px-6 py-4 text-center">
              <p className="flex items-center justify-center gap-1 text-xs text-violet-200">
                종합 <GlossaryTooltip termId="FII" className="text-violet-100" />
              </p>
              <p className="text-4xl font-black text-white">{FII_OVERALL_SCORE}</p>
              <p className="text-[10px] text-violet-200">/ 100</p>
            </div>
          </div>

          <GlossaryQuickBar variant="dark" className="mt-6" />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FII_DIMENSIONS.map((dim) => (
              <Card
                key={dim.key}
                className="border-white/10 bg-white/5 text-white backdrop-blur-sm"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{dim.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-violet-200">{dim.score}</p>
                  <p className="mt-1 text-[11px] text-slate-300">{dim.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-200">
              FII 프로파일 (샘플)
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#6366f180" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "#e0e7ff", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="FII"
                    dataKey="score"
                    stroke="#a78bfa"
                    fill="#8b5cf6"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Sample report + PDF */}
      <section
        id="sample-report"
        className="border-t border-white/10 bg-slate-900/50 py-16 sm:py-20"
        data-testid="growth-demo-sample-report"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <h2 className="text-2xl font-bold sm:text-3xl">샘플 성장 리포트</h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                AI 영상 분석 → FII 산출 → 월간 성장 추세 · PDF 리포트 (데모 데이터)
              </p>
            </div>
            <Button
              asChild
              className="gap-2 bg-emerald-600 hover:bg-emerald-500"
              data-testid="growth-demo-pdf-download"
            >
              <a href={GROWTH_SAMPLE_PDF_PATH} download={GROWTH_SAMPLE_PDF_FILENAME}>
                <Download className="h-4 w-4" />
                PDF 다운로드
              </a>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  성장 추세 (6개월)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={FII_TREND_SAMPLE}>
                      <defs>
                        <linearGradient id="fiiTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ffffff15" />
                      <XAxis dataKey="month" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                      <YAxis domain={[50, 100]} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#1e1b4b",
                          border: "1px solid #6366f1",
                          borderRadius: 8,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#34d399"
                        fill="url(#fiiTrend)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card
              className="border-white/10 bg-white text-slate-900 shadow-xl"
              data-testid="growth-demo-pdf-preview"
            >
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  YAGO 선수 성장 분석 리포트 — PDF 미리보기
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">선수: 김○○ (U-14)</span>
                  <Badge variant="secondary">분석기간 2026년 6월</Badge>
                </div>
                <p className="text-slate-600">
                  종합 FII 점수{" "}
                  <strong className="text-indigo-700">{FII_OVERALL_SCORE}점</strong>
                  — 지난달 대비 <span className="text-emerald-600">+2점 상승</span>
                </p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {FII_DIMENSIONS.map((d) => {
                    const grade = d.score >= 78 ? "우수" : d.score >= 70 ? "보통" : "개선 필요";
                    return (
                      <li key={d.key} className="flex justify-between gap-2">
                        <span>{d.label}</span>
                        <span>
                          {d.score}점{" "}
                          <span className={d.score >= 78 ? "text-emerald-600" : "text-blue-600"}>
                            {grade}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <ul className="space-y-1.5 border-t pt-2 text-xs text-slate-600">
                  <li>· 주요 강점: 공간 인식, 전술 이해도</li>
                  <li>· 개선 권장: 압박 대응 시 볼 전환 속도</li>
                  <li>· 코치 의견: 패스 선택 정확도가 향상되었습니다.</li>
                </ul>
                <p className="text-[10px] leading-relaxed text-slate-500">
                  특허 출원번호 {GROWTH_PATENT_APPLICATION_NO}
                  <br />
                  서버 비저장형 영상 AI 분석 및 선택적 실시간 익명화를 결합한 유소년 스포츠 성장
                  관리 시스템 및 방법
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform features */}
      <section
        id="platform"
        className="py-16 sm:py-20"
        data-testid="growth-demo-platform"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">플랫폼 특징</h2>
          <p className="mt-2 text-sm text-slate-300">
            YAGO는 팀 운영 SaaS 위에 AI Football Intelligence OS를 얹습니다.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_FEATURES.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] ?? Sparkles;
              return (
                <li
                  key={feature.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <Icon className="mb-3 h-5 w-5 text-violet-300" />
                  <p className="font-semibold">{feature.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {feature.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Live experience (login required) */}
      <section
        id="try"
        className="border-t border-white/10 bg-slate-900/50 py-16 sm:py-20"
        data-testid="growth-demo-try"
      >
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">실제 AI 분석 체험</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
            YAGO Growth Validation(Step 1~5) 또는 생활체육 AI Lite를 직접 조작해 볼 수 있습니다.
            로그인 후 이용 가능합니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="gap-2 bg-violet-600 hover:bg-violet-500"
              onClick={goLiveExperience}
              disabled={loading}
              data-testid="growth-demo-try-validation"
            >
              {loading ? "확인 중…" : isLoggedIn ? "YAGO Growth 열기" : "로그인 · Growth 데모"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/25 bg-white/5 text-white hover:bg-white/10"
              onClick={() => {
                if (loading) return;
                if (isLoggedIn) navigate(litePath);
                else navigate(growthLiteDemoLoginPath());
              }}
              disabled={loading}
              data-testid="growth-demo-try-lite"
            >
              생활체육 AI Lite
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400">
        <p>© YAGO SPORTS · AI Football Intelligence Operating System</p>
        <p className="mt-1 text-slate-500">특허 출원번호 {GROWTH_PATENT_APPLICATION_NO}</p>
        <p className="mt-1">
          <Link to="/" className="text-indigo-300 hover:underline">
            홈으로
          </Link>
        </p>
      </footer>
    </div>
  );
}
