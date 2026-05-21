/**
 * 🔥 Share Button - 공유 버튼 컴포넌트
 * 
 * 스토리/팀/경기 공유
 */

import { useState } from "react";
import type { ShareTarget, Region } from "../domain/superapp.types";
import { share } from "../utils/share.integration";
import { logEvent } from "../utils/analytics.logger";

interface ShareButtonProps {
  target: ShareTarget;
  id: string;
  region: Region;
  metadata: {
    title: string;
    description: string;
    imageUrl?: string;
  };
  className?: string;
}

export function ShareButton({
  target,
  id,
  region,
  metadata,
  className,
}: ShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    
    try {
      const success = await share(target, id, region, metadata, "native");
      
      if (success) {
        logEvent(
          {
            eventName: "share_click",
            metadata: { target, id },
          },
          { region }
        );
      }
    } catch (error) {
      console.warn("[Share] 공유 실패:", error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 ${className || ""}`}
    >
      {sharing ? "공유 중..." : "공유하기"}
    </button>
  );
}
