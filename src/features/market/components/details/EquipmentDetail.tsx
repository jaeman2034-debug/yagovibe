/**
 * 🔥 중고 거래 상세 페이지
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Tag, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import { doc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatusBadge from "../StatusBadge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import SellerInfoCard from "../SellerInfoCard";
import RelatedPostsSection from "../RelatedPostsSection";
import CompleteTransactionButton from "../CompleteTransactionButton";
import WriteReviewButton from "../WriteReviewButton";
import RiskWarningBanner from "@/components/market/RiskWarningBanner";
import MarketDetailHeader from "../MarketDetailHeader";
import type { MarketPost } from "../../types";

interface EquipmentDetailProps {
  post: MarketPost;
  onBack?: () => void;
  sport?: string | null;
  onPostUpdate?: (updatedPost: MarketPost) => void; // 🔥 상태 업데이트 콜백
  hideMedia?: boolean; // 🔥 상단에서 이미지를 렌더했을 때 내부 이미지 영역 숨김
}

const CONDITION_LABELS: Record<string, string> = {
  new: "새상품",
  like_new: "거의 새것",
  used: "중고",
  poor: "하자있음",
};

const CONDITION_COLORS: Record<string, string> = {
  new: "bg-green-100 text-green-700",
  like_new: "bg-blue-100 text-blue-700",
  used: "bg-gray-100 text-gray-700",
  poor: "bg-orange-100 text-orange-700",
};

export default function EquipmentDetail({ post, onBack, sport, onPostUpdate, hideMedia = false }: EquipmentDetailProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // 🔥 sellerRiskTier 변수 선언 (RiskWarningBanner용) - 반드시 선언 필요
  const sellerRiskTier = (post as any)?.sellerRiskTier ?? (post as any)?.riskTier ?? undefined;
  
  // 🔥 sellerRiskTier 상태 관리 (SellerInfoCard의 onRiskTierLoad 콜백으로 업데이트됨)
  const [sellerRiskTierState, setSellerRiskTier] = useState<"low" | "medium" | "high" | undefined>(
    sellerRiskTier as "low" | "medium" | "high" | undefined
  );
  
  // 🔥 게시글 상세 진입 트래킹 + 조회수 증가
  useEffect(() => {
    // 🔥 조회수 증가 (비동기, 에러 무시)
    if (post.id) {
      import("@/services/marketRankingService").then(({ incrementPostViews }) => {
        incrementPostViews(post.id).catch((err) => {
          console.warn("⚠️ [EquipmentDetail] 조회수 증가 실패 (무시):", err);
        });
      }).catch(() => {});
    }

    // 🔥 게시글 상세 진입 트래킹
    import("@/lib/analytics").then(({ trackMarket }) => {
      trackMarket.viewPost({
        postId: post.id,
        sport: post.sport,
        category: post.category,
        price: post.price,
      });
    }).catch((err) => {
      console.warn("⚠️ 트래킹 실패 (무시):", err);
    });
  }, [post.id]);

  // 🔥 찜 상태는 MarketPostDetailPage의 BottomActionBar에서 관리 (제거됨)

  // 🔥 권한 체크 (작성자 판별) - 호환성 강화 버전
  const isOwner = useMemo(() => {
    // 🔥 값 정규화 (문자열 변환 + 공백 제거)
    const userUid = user?.uid ? String(user.uid).trim() : null;
    
    if (!userUid) {
      console.log("🔍 [EquipmentDetail] 권한 체크 실패 (user 없음):", {
        hasUser: !!user,
        userUid,
        postId: post.id,
      });
      return false;
    }

    // 🔥 호환성 체크: authorId, sellerId, userId 모두 확인
    const authorId = post.authorId ? String(post.authorId).trim() : null;
    const sellerId = (post as any).sellerId ? String((post as any).sellerId).trim() : null;
    const userId = (post as any).userId ? String((post as any).userId).trim() : null;
    
    // 🔥 3가지 필드 중 하나라도 일치하면 작성자로 인정
    const isAuthor = 
      (authorId && userUid === authorId) ||
      (sellerId && userUid === sellerId) ||
      (userId && userUid === userId);
    
    // 🔥 상세 디버깅 로그
    console.log("🔍 [EquipmentDetail] 권한 체크 (호환성 강화):", {
      userUid,
      authorId: authorId || "없음",
      sellerId: sellerId || "없음",
      userId: userId || "없음",
      일치여부: isAuthor,
      postId: post.id,
      postKeys: Object.keys(post),
      원본userUid: user?.uid,
      원본authorId: post.authorId,
      원본sellerId: (post as any).sellerId,
      원본userId: (post as any).userId,
    });
    
    return isAuthor;
  }, [user?.uid, post.authorId, (post as any).sellerId, (post as any).userId, post.id]);

  // 🔥 작성자 전용 상태 변경 핸들러
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: MarketPost["status"]) => {
    if (!post.id || updating) {
      console.warn("⚠️ 상태 변경 불가:", { postId: post.id, updating });
      return;
    }
    
    // 🔥 상태 전환 검증 (안전 예외 처리)
    const allowedTransitions: Record<string, string[]> = {
      active: ["reserved", "completed", "hidden"],
      open: ["reserved", "completed", "hidden"],
      reserved: ["active", "open", "completed", "hidden"],
      completed: ["hidden"], // 거래완료는 삭제만 가능
      done: ["hidden"], // 레거시 호환
      hidden: [],
    };
    const currentStatus = post.status || "active";
    const allowed = allowedTransitions[currentStatus] || [];
    
    if (!allowed.includes(newStatus)) {
      alert(`이 상태로 변경할 수 없습니다.\n\n현재 상태: ${currentStatus}\n변경하려는 상태: ${newStatus}`);
      return;
    }

    setUpdating(true);
    try {
      const postRef = doc(db, "market", post.id);
      
      // 🔥 거래 완료 처리 시 추가 필드 저장
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      
      // 거래 완료 시 completedAt, sellerId 저장
      if (newStatus === "completed") {
        updateData.completedAt = serverTimestamp();
        updateData.sellerId = post.authorId; // 판매자 ID 저장
        // buyerId는 채팅방에서 가져올 수 있음 (옵션)
      }
      
      await updateDoc(postRef, updateData);
      
      // 🔥 Optimistic UI 업데이트 (상태 뱃지 실시간 반영)
      const updatedPost = { 
        ...post, 
        status: newStatus,
        ...(newStatus === "completed" && {
          completedAt: new Date(),
          sellerId: post.authorId,
        }),
      };
      onPostUpdate?.(updatedPost);
      
      console.log("✅ 상태 변경 완료:", { 
        from: post.status, 
        to: newStatus,
        postId: post.id 
      });
      
      // 🔥 상태 변경 성공 후 업데이트 완료
      setUpdating(false);
    } catch (error: any) {
      console.error("❌ 상태 변경 오류:", error);
      
      // 🔥 상세 에러 메시지
      let errorMessage = "상태 변경 중 오류가 발생했습니다.";
      if (error.code === "permission-denied") {
        errorMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (error.code === "not-found") {
        errorMessage = "게시글을 찾을 수 없습니다.";
      } else if (error.message) {
        errorMessage += `\n${error.message}`;
      }
      
      alert(errorMessage);
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!post.id) {
      console.warn("⚠️ 삭제 불가: post.id가 없습니다.");
      return;
    }
    
    const confirmed = window.confirm(
      "이 상품을 삭제하시겠습니까?\n\n" +
      "• 삭제 후에는 복구할 수 없습니다.\n" +
      "• 관련 활동 피드도 함께 삭제됩니다."
    );
    
    if (!confirmed) return;
    
    setUpdating(true);
    try {
      // 🔥 1. Firestore market 문서 삭제
      const marketRef = doc(db, "market", post.id);
      await deleteDoc(marketRef);
      console.log("✅ Market 문서 삭제 완료:", { postId: post.id, sport: post.sport });
      
      // 🔥 2. marketPosts 문서 삭제 (랭킹 시스템용 동기화 컬렉션)
      try {
        const marketPostsRef = doc(db, "marketPosts", post.id);
        await deleteDoc(marketPostsRef);
        console.log("✅ MarketPosts 문서 삭제 완료:", { postId: post.id });
      } catch (marketPostsError: any) {
        // 🔥 marketPosts 삭제 실패해도 메인 삭제는 계속 진행
        console.warn("⚠️ MarketPosts 삭제 실패 (무시):", marketPostsError);
      }
      
      // 🔥 3. activities 동기 삭제 (refCollection + 레거시 refId-only)
      try {
        const { deleteActivitiesForRef, deleteActivitiesByRefIdLegacy } =
          await import("@/services/activity/activityCleanup");
        const n1 = await deleteActivitiesForRef(post.id, "market");
        const n2 = await deleteActivitiesByRefIdLegacy(post.id);
        console.log("✅ Activities 문서 삭제 완료:", { refCollection: n1, legacy: n2 });
      } catch (activityError: any) {
        console.warn("⚠️ Activities 삭제 실패 (무시):", activityError);
      }
      
      // 🔥 4. 삭제 후 해당 종목 마켓으로 리다이렉트
      const targetSport = post.sport || sport || "soccer";
      navigate(`/sports/${targetSport}/market`);
    } catch (error: any) {
      console.error("❌ 삭제 오류:", error);
      
      // 🔥 상세 에러 메시지
      let errorMessage = "삭제 중 오류가 발생했습니다.";
      if (error.code === "permission-denied") {
        errorMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (error.code === "not-found") {
        errorMessage = "게시글을 찾을 수 없습니다.";
      } else if (error.message) {
        errorMessage += `\n${error.message}`;
      }
      
      alert(errorMessage);
      setUpdating(false);
    }
  };

  // 🔥 뒤로가기 핸들러 (sport 기반으로 종목 마켓으로 이동)
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (sport) {
      navigate(`/sports/${sport}/market`);
    } else {
      navigate(-1);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  // 🔥 채팅하기/찜하기 기능은 MarketPostDetailPage의 BottomActionBar로 이동 (제거됨)
  // 모든 액션 버튼은 BottomActionBar에서만 렌더링

  // 🔥 종목 라벨
  const SPORT_LABELS: Record<string, string> = {
    soccer: "축구",
    basketball: "농구",
    baseball: "야구",
    volleyball: "배구",
    golf: "골프",
    tennis: "테니스",
    running: "러닝",
    badminton: "배드민턴",
    fitness: "헬스/피트니스",
    yoga: "요가/필라테스",
    climbing: "클라이밍",
    etc: "기타",
  };

  return (
    <div className="w-full space-y-6">
      {/* 🔥 뒤로가기 버튼 (상단) - sticky 제거 (BottomActionBar와 레이어 충돌 방지) */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span className="text-xl">←</span>
          <span className="font-medium">
            {sport ? `${SPORT_LABELS[sport] || sport} 마켓` : "뒤로가기"}
          </span>
        </button>
      </div>

      {/* 이미지 슬라이더 (부모에서 이미 렌더하면 숨김) */}
      {!hideMedia && post.images && post.images.length > 0 ? (
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
          {/* 🔥 작성자 전용: 점 3개 메뉴 (이미지 우측 상단) */}
          {isOwner && (
            <div className="absolute top-2 right-2 z-[100]" style={{ pointerEvents: 'auto' }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all active:scale-95"
                    aria-label="작성자 메뉴"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-700" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => navigate(`/sports/${post.sport || "soccer"}/market/edit/${post.id}`)}
                    disabled={post.status === "completed" || post.status === "done" || updating}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">✏️</span>
                    수정
                  </DropdownMenuItem>
                  {(post.status === "active" || post.status === "open") && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (window.confirm("이 상품을 예약중으로 변경하시겠습니까?\n\n예약중으로 변경하면 다른 사용자가 구매할 수 없습니다.")) {
                          handleStatusChange("reserved");
                        }
                      }}
                      disabled={updating}
                      className="cursor-pointer"
                    >
                      <span className="mr-2">🔒</span>
                      예약중으로 변경
                    </DropdownMenuItem>
                  )}
                  {(post.status === "reserved" || post.status === "active" || post.status === "open") && (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          if (window.confirm("이 상품을 거래완료로 변경하시겠습니까?\n\n거래완료로 변경하면 더 이상 수정할 수 없습니다.")) {
                            handleStatusChange("completed");
                          }
                        }}
                        disabled={updating}
                        className="cursor-pointer"
                      >
                        <span className="mr-2">✅</span>
                        거래 완료 처리
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (window.confirm("이 상품을 다시 판매중으로 변경하시겠습니까?")) {
                            handleStatusChange("open");
                          }
                        }}
                        disabled={updating}
                        className="cursor-pointer"
                      >
                        <span className="mr-2">🔓</span>
                        다시 판매중으로 변경
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={updating}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <span className="mr-2">🗑️</span>
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {/* 🔥 이미지: 상세는 contain으로 세로 사진 전체 표시 */}
          <img
            src={post.images[activeImageIndex]}
            alt={post.title}
            className="product-image w-full max-h-[500px] object-contain"
          />
          {post.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {post.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    activeImageIndex === index ? "bg-white" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      ) : !hideMedia ? (
        <div className="aspect-square bg-gray-200 flex items-center justify-center">
          <p className="text-gray-400">이미지 없음</p>
        </div>
      ) : null}

      {/* 상품 정보 */}
      {/* ⚠️ 중요: pb-28 제거 (MarketPostDetailPage에서 paddingBottom 관리) */}
      <div className="p-4 space-y-4">
        <MarketDetailHeader post={post} authorFallback="판매자" />

        {post.price && (
          <div className="text-2xl font-bold text-blue-600">{formatPrice(post.price)}</div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={post.status} />
          {post.condition && (
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded",
                CONDITION_COLORS[post.condition] || CONDITION_COLORS.used
              )}
            >
              {CONDITION_LABELS[post.condition] || post.condition}
            </span>
          )}
          {post.brand && (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Tag className="w-4 h-4" />
              {post.brand}
            </span>
          )}
        </div>

        {(post.authorId || (post as any).sellerId || (post as any).userId) && (
          <div className="hidden">
            <SellerInfoCard
              authorId={post.authorId}
              authorName={post.authorName}
              postSport={post.sport}
              onRiskTierLoad={(riskTier) => {
                setSellerRiskTier(riskTier);
              }}
            />
          </div>
        )}

        {/* 🔥 위험 경고 배너 (고위험 판매자/게시글) */}
        <RiskWarningBanner
          post={post}
          sellerRiskTier={sellerRiskTierState || sellerRiskTier}
          className="mt-4 -mx-4"
        />

        {/* 🔥 판매자 전용: 거래 완료 처리 버튼은 하단 고정으로 이동 (아래 참조) */}

        {/* 🔥 거래 완료 후: 리뷰 작성 버튼 */}
        {(post.status === "completed" || post.status === "done") && (
          <div className="mt-4">
            <WriteReviewButton
              post={post}
              onReviewSubmitted={() => {
                // 리뷰 작성 후 판매자 정보 새로고침 (리뷰 통계 업데이트)
                window.location.reload();
              }}
            />
          </div>
        )}

        {/* 🔥 거래 완료 안내 */}
        {(post.status === "completed" || post.status === "done") && (
          <div className="bg-gray-50 border-y border-gray-200 px-4 py-4 -mx-4">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold">거래 완료된 상품</p>
                <p className="text-sm text-gray-600">
                  이 상품은 거래가 완료되어 더 이상 구매할 수 없습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 방문자 전용 CTA는 MarketPostDetailPage의 VisitorActions로 통일 (중복 제거) */}

        {/* 🔥 설명 영역 (카드 스타일) */}
        {post.description && (
          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
            <h2 className="font-semibold mb-2 text-gray-900">상품 설명</h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.description}</p>
          </div>
        )}

        {/* 위치 */}
        {post.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{post.location}</span>
          </div>
        )}

      </div>

      {/* 🔥 관련 글 추천 섹션 */}
      <RelatedPostsSection currentPost={post} className="mt-6" />
    </div>
  );
}
