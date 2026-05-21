import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import {
  getAssociationPostById,
  isCommentLikedByUser,
  isPostLikedByUser,
  toggleCommentLike,
  togglePostLike,
  type AssociationPost,
} from "@/services/associationPostService";
import { createAssociationNotification } from "@/services/associationNotificationService";

interface PostComment {
  id: string;
  uid: string;
  content: string;
  createdAt?: any;
  likesCount?: number;
}

export default function AssociationPostDetailPage() {
  const { associationId, postId } = useParams<{ associationId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<AssociationPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postLiked, setPostLiked] = useState(false);
  const [commentLikedMap, setCommentLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const run = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const data = await getAssociationPostById(postId);
        setPost(data);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const unsub = onSnapshot(doc(db, "posts", postId), (snap) => {
      if (!snap.exists()) return;
      setPost({
        id: snap.id,
        ...(snap.data() as Omit<AssociationPost, "id">),
      });
    });
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PostComment, "id">),
        }))
      );
    });
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    const run = async () => {
      if (!postId || !user?.uid) {
        setPostLiked(false);
        setCommentLikedMap({});
        return;
      }
      try {
        const liked = await isPostLikedByUser(postId, user.uid);
        setPostLiked(liked);

        const entries = await Promise.all(
          comments.map(async (c) => [c.id, await isCommentLikedByUser(postId, c.id, user.uid)] as const)
        );
        setCommentLikedMap(Object.fromEntries(entries));
      } catch (error) {
        console.error("[AssociationPostDetailPage] 좋아요 상태 조회 실패:", error);
      }
    };
    void run();
  }, [postId, user?.uid, comments]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!postId || !user?.uid || !content.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        uid: user.uid,
        content: content.trim(),
        likesCount: 0,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(1),
        score: increment(2),
      });

      if (post?.uid && post.uid !== user.uid) {
        await createAssociationNotification({
          userId: post.uid,
          type: "COMMENT_RECEIVED",
          title: "새 댓글",
          body: "회원님 게시글에 댓글이 달렸습니다.",
          associationId,
          postId,
        });
      }
      setContent("");
    } catch (error) {
      console.error("[AssociationPostDetailPage] 댓글 등록 실패:", error);
      alert("댓글 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!postId) return;
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(-1),
        score: increment(-2),
      });
    } catch (error) {
      console.error("[AssociationPostDetailPage] 댓글 삭제 실패:", error);
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  const handleTogglePostLike = async () => {
    if (!postId || !user?.uid) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const next = await togglePostLike(postId, user.uid);
      setPostLiked(next);
      if (next && post?.uid && post.uid !== user.uid) {
        await createAssociationNotification({
          userId: post.uid,
          type: "LIKE_RECEIVED",
          title: "게시글 좋아요",
          body: "회원님 게시글에 좋아요가 추가되었습니다.",
          associationId,
          postId,
        });
      }
    } catch (error) {
      console.error("[AssociationPostDetailPage] 게시글 좋아요 실패:", error);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!postId || !user?.uid) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const next = await toggleCommentLike(postId, commentId, user.uid);
      setCommentLikedMap((prev) => ({ ...prev, [commentId]: next }));
      if (next) {
        const ownerUid = comments.find((comment) => comment.id === commentId)?.uid;
        if (ownerUid && ownerUid !== user.uid) {
          await createAssociationNotification({
            userId: ownerUid,
            type: "LIKE_RECEIVED",
            title: "댓글 좋아요",
            body: "회원님 댓글에 좋아요가 추가되었습니다.",
            associationId,
            postId,
          });
        }
      }
    } catch (error) {
      console.error("[AssociationPostDetailPage] 댓글 좋아요 실패:", error);
    }
  };

  if (!associationId || !postId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">잘못된 접근입니다.</div>;
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">불러오는 중...</div>;
  }

  if (!post) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">게시글을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          type="button"
          className="text-sm text-gray-500 mb-3"
          onClick={() => navigate(`/association/${associationId}`)}
        >
          ← 뒤로가기
        </button>

        <article className="bg-white border rounded-xl p-4 mb-4">
          <div className="text-xs text-gray-500 mb-2">
            {post.type} · 작성자 {post.uid}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h1>
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleTogglePostLike}
              className={`text-sm ${postLiked ? "text-red-600" : "text-gray-500"}`}
            >
              ❤️ {post.likesCount ?? 0}
            </button>
            <span className="ml-3 text-sm text-gray-500">💬 {post.commentsCount ?? comments.length}</span>
          </div>
        </article>

        <section className="bg-white border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">댓글</h2>
          <div className="space-y-2 mb-4">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500">아직 댓글이 없습니다.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500">작성자: {comment.uid}</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCommentLike(comment.id)}
                        className={`text-xs ${commentLikedMap[comment.id] ? "text-red-600" : "text-gray-500"}`}
                      >
                        ❤️ {comment.likesCount ?? 0}
                      </button>
                      {comment.uid === user?.uid && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-red-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{comment.content}</p>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString("ko-KR") : "-"}
                  </div>
                </div>
              ))
            )}
          </div>

          {user?.uid ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="댓글을 입력하세요"
                className="flex-1 border rounded-md px-3 py-2"
              />
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
              >
                등록
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">로그인 후 댓글을 작성할 수 있습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}

