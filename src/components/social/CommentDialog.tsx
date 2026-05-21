/**
 * 🔥 CommentDialog - 댓글 다이얼로그 컴포넌트
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { X, Send, Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createComment,
  getCommentsByEntity,
  getRepliesByComment,
} from "@/services/socialService";
import type { Comment, SocialEntityType } from "@/types/social";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: SocialEntityType;
  entityId: string;
  onCommentChange?: () => void;
}

export function CommentDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  onCommentChange,
}: CommentDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, entityType, entityId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { comments: loadedComments } = await getCommentsByEntity(
        entityType,
        entityId
      );
      setComments(loadedComments);
    } catch (error) {
      console.error("[CommentDialog] 댓글 로드 실패:", error);
      toast.error("댓글을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !text.trim()) return;

    setSubmitting(true);
    try {
      await createComment(entityType, entityId, user.uid, text.trim());
      setText("");
      await loadComments();
      onCommentChange?.();
      toast.success("댓글이 작성되었습니다");
    } catch (error: any) {
      console.error("[CommentDialog] 댓글 작성 실패:", error);
      toast.error(error.message || "댓글 작성에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadReplies = async (commentId: string) => {
    if (expandedReplies.has(commentId)) {
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      return;
    }

    try {
      const replies = await getRepliesByComment(commentId);
      // 댓글 목록에 대댓글 추가 (UI 업데이트)
      setExpandedReplies((prev) => new Set(prev).add(commentId));
    } catch (error) {
      console.error("[CommentDialog] 대댓글 로드 실패:", error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>댓글</DialogTitle>
        </DialogHeader>

        {/* 댓글 목록 */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              첫 번째 댓글을 작성해보세요
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {comment.userName?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.userName || "익명"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{comment.text}</p>
                    <div className="flex items-center gap-4">
                      <button className="text-xs text-gray-500 hover:text-gray-700">
                        좋아요
                      </button>
                      {comment.repliesCount && comment.repliesCount > 0 && (
                        <button
                          onClick={() => handleLoadReplies(comment.id)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          답글 {comment.repliesCount}개
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 댓글 입력 */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="self-end"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
