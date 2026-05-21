/**
 * 🔥 CommentButton - 댓글 버튼 컴포넌트
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentDialog } from "./CommentDialog";
import type { SocialEntityType } from "@/types/social";

interface CommentButtonProps {
  entityType: SocialEntityType;
  entityId: string;
  onCommentChange?: () => void;
}

export function CommentButton({
  entityType,
  entityId,
  onCommentChange,
}: CommentButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <MessageCircle className="w-5 h-5 text-gray-400" />
        <span className="text-gray-600">댓글</span>
      </Button>
      <CommentDialog
        open={open}
        onOpenChange={setOpen}
        entityType={entityType}
        entityId={entityId}
        onCommentChange={onCommentChange}
      />
    </>
  );
}
