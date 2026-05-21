/**
 * ?뵦 異뺢뎄 留덉폆 湲?곌린 ?섏씠吏
 * 
 * 移댄뀒怨좊━蹂??쒗뵆由?遺꾧린:
 * - equipment (以묎퀬)
 * - recruit (紐⑥쭛)
 * - match (留ㅼ묶)
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import EquipmentForm from "../components/forms/EquipmentForm";
import RecruitForm from "../components/forms/RecruitForm";
import MatchForm from "../components/forms/MatchForm";
import type { MarketCategory, Sport } from "../types";
import DraftRestoreModal from "@/components/market/DraftRestoreModal";
import {
  getMarketDraft,
  deleteMarketDraft,
  hasMarketDraft,
  type MarketDraft,
} from "@/services/marketDraftService";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

// 종목 목록
const SPORTS: { value: Sport; label: string; icon: string }[] = [
  { value: "baseball", label: "야구", icon: "⚾" },
  { value: "soccer", label: "축구", icon: "⚽" },
  { value: "basketball", label: "농구", icon: "🏀" },
  { value: "volleyball", label: "배구", icon: "🏐" },
  { value: "golf", label: "골프", icon: "⛳" },
  { value: "tennis", label: "테니스", icon: "🎾" },
  { value: "running", label: "러닝", icon: "🏃" },
  { value: "hiking", label: "아웃도어", icon: "🥾" },
  { value: "badminton", label: "배드민턴", icon: "🏸" },
  { value: "table-tennis", label: "탁구", icon: "🏓" },
  { value: "swimming", label: "수영", icon: "🏊" },
  { value: "fitness", label: "헬스/피트니스", icon: "🏋️" },
  { value: "yoga", label: "요가/필라테스", icon: "🧘" },
  { value: "climbing", label: "클라이밍", icon: "🧗" },
  { value: "billiards", label: "당구", icon: "🎱" },
  { value: "misc", label: "잡화", icon: "🧰" },
  { value: "other", label: "기타", icon: "📦" },
];

export default function MarketWritePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sport: sportParam } = useParams<{ sport: Sport }>();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<MarketCategory>(
    (searchParams.get("category") as MarketCategory) || "equipment"
  );
  
  // useParams에서 sport 추출 (유효하지 않으면 기본값)
  const sport: Sport = (sportParam && SPORTS.some(s => s.value === sportParam))
    ? sportParam 
    : "soccer";
  
  // 초기값을 함수형으로 고정해 불필요한 루프 방지
  const [sportState, setSportState] = useState<Sport>(() => {
    return (sportParam && SPORTS.some(s => s.value === sportParam)) 
      ? sportParam 
      : "soccer";
  });
  const [formKey, setFormKey] = useState(0); // 카테고리 변경 시 폼 리셋
  const [draft, setDraft] = useState<MarketDraft | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [shouldRestoreDraft, setShouldRestoreDraft] = useState(false);

  // 濡쒓렇??泥댄겕
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // ?뵦 sport ?뚮씪誘명꽣 蹂寃????곹깭 ?낅뜲?댄듃 (媛믪씠 ?ㅻ? ?뚮쭔 ?낅뜲?댄듃)
  useEffect(() => {
    if (sportParam && SPORTS.some(s => s.value === sportParam) && sportParam !== sportState) {
      setSportState(sportParam);
    }
  }, [sportParam, sportState]);

  // ?뵦 Draft ?뺤씤 諛?紐⑤떖 ?쒖떆 (user.uid留??섏〈?깆쑝濡??ъ슜?섏뿬 臾댄븳 猷⑦봽 諛⑹?)
  useEffect(() => {
    if (!user?.uid || !sportState || !category) return;

    const checkDraft = () => {
      if (hasMarketDraft(user.uid, sportState, category)) {
        const savedDraft = getMarketDraft(user.uid, sportState, category);
        if (savedDraft) {
          setDraft(savedDraft);
          setShowDraftModal(true);
        }
      }
    };

    // 移댄뀒怨좊━ 蹂寃???draft ?뺤씤
    checkDraft();
  }, [user?.uid, sportState, category]);

  // ?뵦 Draft 蹂듭썝 泥섎━
  const handleRestoreDraft = () => {
    setShouldRestoreDraft(true);
    setShowDraftModal(false);
  };

  // ?뵦 ?덈줈 ?묒꽦 泥섎━
  const handleNewPost = () => {
    if (user?.uid) {
      deleteMarketDraft(user.uid, sportState, category);
    }
    setDraft(null);
    setShouldRestoreDraft(false);
    setShowDraftModal(false);
  };

  // 카테고리 변경 시 폼 리셋
  const handleCategoryChange = (newCategory: MarketCategory) => {
    setCategory(newCategory);
    setFormKey((prev) => prev + 1);
  };

  // 카테고리별 폼 렌더
  const renderForm = () => {
    // ?뵦 ?깅줉 ?깃났 ???곸꽭 ?섏씠吏濡??대룞?섎뒗 肄쒕갚 (移댄뀒怨좊━蹂??쇱슦??遺꾧린)
    const onSuccess = (postId?: string) => {
      // ???깅줉 吏곹썑 紐⑸줉 理쒖떊?붾? ?꾪빐 ?몄뀡 ?뚮옒洹??ㅼ젙
      try {
        sessionStorage.setItem("market:refresh", JSON.stringify({
          sport: sportState,
          category,
          ts: Date.now(),
        }));
      } catch {}
      if (postId) {
        // ?뵦 移댄뀒怨좊━蹂꾨줈 ?ㅻⅨ ?쇱슦?몃줈 ?대룞
        if (category === "equipment" || category === "market") {
          navigate(sportMarketDetailUrl(sportState, postId));
        } else if (category === "recruit") {
          navigate(`/sports/${sportState}/recruit/${postId}`);
        } else if (category === "match") {
          navigate(`/sports/${sportState}/match/${postId}`);
        } else {
          // ?뵦 湲곕낯媛? market?쇰줈 ?대룞
          navigate(sportMarketDetailUrl(sportState, postId));
        }
      } else {
        // ?뵦 postId媛 ?놁쑝硫?紐⑸줉?쇰줈 ?대룞 (fallback)
        if (category === "equipment" || category === "market") {
          navigate(`/sports/${sportState}/market`, {
            state: { refresh: true }
          });
        } else if (category === "recruit") {
          navigate(`/sports/${sportState}/recruit`, {
            state: { refresh: true }
          });
        } else if (category === "match") {
          navigate(`/sports/${sportState}/match`, {
            state: { refresh: true }
          });
        } else {
          navigate(`/sports/${sportState}/market`, {
            state: { refresh: true }
          });
        }
      }
    };
    
    // ?뵦 Draft 蹂듭썝 ?щ????곕씪 initialDraft ?꾨떖
    const initialDraft = shouldRestoreDraft ? draft : null;
    
    switch (category) {
      case "equipment":
        return (
          <EquipmentForm
            key={formKey}
            sport={sportState}
            onSuccess={onSuccess}
            initialDraft={initialDraft}
          />
        );
      case "recruit":
        return <RecruitForm key={formKey} sport={sportState} onSuccess={onSuccess} />;
      case "match":
        return <MatchForm key={formKey} sport={sportState} onSuccess={onSuccess} />;
      default:
        return (
          <EquipmentForm
            key={formKey}
            sport={sportState}
            onSuccess={onSuccess}
            initialDraft={initialDraft}
          />
        );
    }
  };

  // ?뵦 移댄뀒怨좊━蹂???댄?/?쒕툕??댄?
  const getPageTitle = (cat: MarketCategory) => {
    switch (cat) {
      case "equipment":
        return "중고 거래 글쓰기";
      case "recruit":
        return "팀원 모집 글쓰기";
      case "match":
        return "경기 매칭 글쓰기";
      default:
        return "마켓 글쓰기";
    }
  };

  const getPageSubtitle = (cat: MarketCategory) => {
    switch (cat) {
      case "equipment":
        return "장비 거래를 등록해보세요";
      case "recruit":
        return "팀원을 모집해보세요";
      case "match":
        return "경기 상대를 찾아보세요";
      default:
        return "장비 거래, 팀원 모집, 경기 매칭을 한 곳에서";
    }
  };

  const categoryLabels: Record<MarketCategory, string> = {
    all: "전체",
    equipment: "중고",
    recruit: "모집",
    match: "매칭",
    lesson: "레슨",
    ground: "구장양도",
    ticket: "티켓",
  };

  if (!user) return null;

  return (
    <div
      className="min-h-screen overflow-y-auto bg-gray-50 pt-52 md:pt-24"
      style={{ height: "100dvh", paddingBottom: "120px" }}
    >
      <div
        aria-hidden
        className="block md:hidden"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 36px)" }}
      />

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold">{getPageTitle(category)}</h1>
          <p className="text-sm text-gray-600">{getPageSubtitle(category)}</p>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">종목 선택 *</label>
          <select
            value={sportState}
            onChange={(e) => {
              const nextSport = e.target.value as Sport;
              setSportState(nextSport);
              setFormKey((prev) => prev + 1);
              navigate(`/sports/${nextSport}/market/write?category=${category}`);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            {SPORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.icon} {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-gray-700">어떤 글을 작성하시나요? *</label>
          <div className="grid grid-cols-3 gap-3">
            {(["equipment", "recruit", "match"] as MarketCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all ${
                  category === cat
                    ? "scale-105 border-blue-600 bg-blue-600 text-white shadow-lg"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <div className="mb-1 font-bold">{categoryLabels[cat]}</div>
                <div className="text-xs opacity-80">
                  {cat === "equipment" && "장비 거래"}
                  {cat === "recruit" && "팀원 모집"}
                  {cat === "match" && "경기 매칭"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-800">
            {category === "equipment" && (
              <>
                <strong>중고 거래 팁</strong> 상품 상태와 거래 조건을 자세히 적으면 거래 성사율이 높아집니다.
              </>
            )}
            {category === "recruit" && (
              <>
                <strong>모집 팁</strong> 모집 인원과 포지션, 활동 시간을 명확히 적으면 적합한 지원자를 빠르게 찾을 수 있습니다.
              </>
            )}
            {category === "match" && (
              <>
                <strong>매칭 팁</strong> 경기 날짜, 시간, 장소, 비용을 구체적으로 입력하면 상대 팀이 빠르게 문의합니다.
              </>
            )}
          </div>
        </div>

        {renderForm()}
      </div>
    </div>
  );
}

