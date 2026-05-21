/**
 * 🔥 광고 카드 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 광고 표시
 * - 클릭 기록 및 과금
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { ExternalLink } from "lucide-react";

interface AdCardProps {
  ad: {
    id: string;
    type: string;
    title: string;
    description?: string;
    imageUrl?: string;
    linkUrl: string;
  };
}

export default function AdCard({ ad }: AdCardProps) {
  const handleClick = async () => {
    try {
      // 🔥 광고 클릭 기록 (과금)
      const recordClick = httpsCallable(functions, "recordAdClick");
      await recordClick({ adId: ad.id });

      // 🔥 광고 링크로 이동
      window.open(ad.linkUrl, "_blank");
    } catch (err) {
      console.error("❌ [AdCard] 클릭 기록 실패:", err);
      // 실패해도 링크는 열기
      window.open(ad.linkUrl, "_blank");
    }
  };

  return (
    <div
      onClick={handleClick}
      className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-3">
        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
              광고
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{ad.title}</h3>
          {ad.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {ad.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
