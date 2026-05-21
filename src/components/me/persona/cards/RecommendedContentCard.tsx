/**
 * 🔥 RecommendedContentCard - 추천 콘텐츠 카드 (STEP 9: variant="info")
 * 
 * STEP 9 디자인 시스템:
 * - variant: info (기본 정보, 중립적, CTA 없음)
 * - PersonaSection 전용
 */
import { Sparkles, ArrowRight } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";

interface RecommendedContent {
  id: string;
  title: string;
  description?: string;
  type?: "article" | "video" | "training";
}

interface RecommendedContentCardProps {
  contents?: RecommendedContent[];
  onContentClick?: (contentId: string) => void;
}

/**
 * 🔥 추천 콘텐츠 카드
 * 
 * PR 4 설계 원칙:
 * - 기본 콘텐츠 3개 제공 (정적)
 * - API 없어도 콘텐츠가 있음
 * - 마이페이지 체온 담당
 * - props 없이도 렌더링 가능 (기본값 사용)
 */
export function RecommendedContentCard({
  contents = [],
  onContentClick,
}: RecommendedContentCardProps = {}) {
  // PR 4: 기본 콘텐츠 (정적) - 데이터 없을 때 사용
  const defaultContents: RecommendedContent[] = [
    {
      id: "default-1",
      title: "체육인을 위한 훈련 가이드",
      description: "효과적인 훈련 방법을 알아보세요",
      type: "article",
    },
    {
      id: "default-2",
      title: "운동 전후 스트레칭",
      description: "부상 예방을 위한 기본 스트레칭",
      type: "video",
    },
    {
      id: "default-3",
      title: "개인 기록 관리 팁",
      description: "자신의 성장을 추적하는 방법",
      type: "article",
    },
  ];

  const displayContents = contents.length > 0 ? contents : defaultContents;

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "video":
        return "🎥";
      case "training":
        return "💪";
      case "article":
      default:
        return "📄";
    }
  };

  return (
    <MeCard
      variant="info"
      icon={<Sparkles className="w-5 h-5" />}
      title="추천 콘텐츠"
    >
      {/* 콘텐츠 목록 */}
      <div className="space-y-2">
        {displayContents.map((content) => (
          <button
            key={content.id}
            onClick={() => onContentClick?.(content.id)}
            className="w-full p-3 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{getTypeIcon(content.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {content.title}
                </div>
                {content.description && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {content.description}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </MeCard>
  );
}
