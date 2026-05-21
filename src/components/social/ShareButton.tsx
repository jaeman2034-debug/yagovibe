/**
 * 🔥 ShareButton - 공유 버튼 컴포넌트
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createShare } from "@/services/socialService";
import type { SocialEntityType } from "@/types/social";
import { toast } from "sonner";

interface ShareButtonProps {
  entityType: SocialEntityType;
  entityId: string;
  onShareChange?: () => void;
}

export function ShareButton({
  entityType,
  entityId,
  onShareChange,
}: ShareButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleShare = async (platform: "link" | "twitter" | "facebook" | "kakao") => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }

    setLoading(true);
    try {
      const url = `${window.location.origin}/${entityType}/${entityId}`;

      if (platform === "link") {
        // 링크 복사
        await navigator.clipboard.writeText(url);
        toast.success("링크가 복사되었습니다");
      } else {
        // 외부 공유
        await createShare(user.uid, entityType, entityId, "external", platform);
        
        let shareUrl = "";
        const text = encodeURIComponent("야고 스포츠 플랫폼에서 공유");
        
        switch (platform) {
          case "twitter":
            shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`;
            break;
          case "facebook":
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            break;
          case "kakao":
            // Kakao SDK 필요
            toast.info("카카오 공유는 준비 중입니다");
            return;
        }

        if (shareUrl) {
          window.open(shareUrl, "_blank", "width=600,height=400");
          toast.success("공유되었습니다");
        }
      }

      onShareChange?.();
    } catch (error: any) {
      console.error("[ShareButton] 공유 실패:", error);
      toast.error(error.message || "공유에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Share2 className="w-5 h-5 text-gray-400" />
          <span className="text-gray-600">공유</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleShare("link")}>
          링크 복사
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("twitter")}>
          트위터
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("facebook")}>
          페이스북
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("kakao")}>
          카카오톡
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
