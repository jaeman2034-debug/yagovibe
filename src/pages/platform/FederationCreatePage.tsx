/**
 * 협회 생성 — 최소 입력 + AI 자동 완성
 * URL: /platform/federations/create
 * 완료: 바로 /federations/{slug}
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronDown, ChevronUp, Loader2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import {
  autoCreateFederation,
  generateSlug,
  uploadFederationHeroImage,
  getDefaultHeroImage,
} from "@/services/federationService";
import { FederationHeroImageSelector, type HeroImageValue } from "@/components/federation/FederationHeroImageSelector";
import { toast } from "sonner";
import { CreateHeader } from "@/components/create/CreateHeader";
import { CreateFormContainer } from "@/components/create/CreateFormContainer";

function getPublicOrigin(): string {
  if (typeof window === "undefined") return "https://yago.io";
  return window.location.origin;
}

const SPORTS = [
  { id: "soccer", label: "축구" },
  { id: "futsal", label: "풋살" },
  { id: "basketball", label: "농구" },
  { id: "volleyball", label: "배구" },
  { id: "baseball", label: "야구" },
  { id: "badminton", label: "배드민턴" },
] as const;

const AUDIENCES = [
  { id: "youth", label: "유소년" },
  { id: "adult", label: "성인" },
  { id: "all", label: "전체" },
] as const;

export default function FederationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [sport, setSport] = useState<string>("soccer");
  const [audience, setAudience] = useState<string>("all");
  const [heroImage, setHeroImage] = useState<HeroImageValue>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualIntro, setManualIntro] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [successOverlay, setSuccessOverlay] = useState<{ slug: string } | null>(null);

  const STEP_LABELS = [
    "협회장 인사말·연혁 생성 중",
    "조직 개요·임원 구성 생성 중",
    "페이지 저장 중",
  ];

  useEffect(() => {
    if (!busy) {
      setGenerationStep(0);
      return;
    }
    const id = setInterval(() => {
      setGenerationStep((s) => (s + 1) % 3);
    }, 600);
    return () => clearInterval(id);
  }, [busy]);

  const urlPreview = useMemo(() => {
    if (!name.trim()) return "";
    const slug = generateSlug(name, sport);
    return `${getPublicOrigin()}/federations/${slug}`;
  }, [name, sport]);

  const runCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("협회 이름을 입력해 주세요.");
      return;
    }
    if (!user?.uid) {
      toast.error("로그인 후 이용해 주세요.");
      navigate("/login", { state: { from: "/platform/federations/create" } });
      return;
    }

    setBusy(true);
    try {
      let heroImageUrl: string | undefined;
      if (heroImage instanceof File) {
        heroImageUrl = await uploadFederationHeroImage(heroImage);
      } else if (typeof heroImage === "string") {
        heroImageUrl = heroImage;
      } else {
        heroImageUrl = getDefaultHeroImage(sport);
      }

      const { slug } = await autoCreateFederation(user.uid, {
        name: trimmed,
        sport,
        audience,
        heroImage: heroImageUrl,
        manual:
          showManual && (manualIntro.trim() || manualDesc.trim())
            ? {
                introMessage: manualIntro.trim() || undefined,
                description: manualDesc.trim() || undefined,
              }
            : undefined,
      });
      setBusy(false);
      setSuccessOverlay({ slug });
      setTimeout(() => {
        setSuccessOverlay(null);
        navigate(`/federations/${slug}/admin`, {
          replace: true,
          state: { openInviteModal: true },
        });
      }, 1200);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "생성에 실패했습니다.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (successOverlay) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <p className="text-gray-700 font-medium mb-6">협회를 생성 중입니다...</p>
          <div className="space-y-3 text-left">
            {["소개 생성 완료", "조직 구성 완료", "페이지 구성 완료"].map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
    >
      <CreateHeader title="협회 만들기" />

      <CreateFormContainer className="max-w-lg py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">협회 만들기</h1>
          <p className="text-gray-600 text-sm">
            이름·종목·대상만 선택하면 AI가 <strong className="text-gray-800">협회장 인사말(introMessage)</strong>부터
            소개·연혁·임원 구조까지 채워 드립니다. 나중에 수정·재생성하면 됩니다.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              협회 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 노원구 축구협회"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {urlPreview && (
              <p className="mt-2 text-xs text-gray-500 break-all">
                주소 미리보기:{" "}
                <span className="font-mono text-blue-600">{urlPreview}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">종목</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {SPORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대상</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {AUDIENCES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FederationHeroImageSelector value={heroImage} onChange={setHeroImage} />

          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50"
          >
            직접 설정하기 (옵션)
            {showManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showManual && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                비워 두면 AI 문구가 들어갑니다. 일부만 쓰면 그 부분만 덮어씁니다.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  협회장 인사말 (introMessage, 직접 넣기)
                </label>
                <textarea
                  value={manualIntro}
                  onChange={(e) => setManualIntro(e.target.value)}
                  rows={5}
                  placeholder="비워 두면 AI가 2~3문단으로 작성합니다."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">한 줄 소개</label>
                <textarea
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  rows={2}
                  placeholder="협회 소개 (한두 문장)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          생성 단계에서는 리그·팀·경기를 만들지 않습니다. 홈에서 안내에 따라 이어가면 됩니다.
        </p>
      </CreateFormContainer>

      <div className="fixed left-0 right-0 bottom-0 z-30 bg-white border-t border-gray-200 p-4">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={runCreate}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3.5 rounded-xl font-semibold shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                <span>{STEP_LABELS[generationStep]}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                AI로 자동 생성
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
