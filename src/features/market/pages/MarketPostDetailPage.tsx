/**
 * 🔥 축구 마켓 게시글 상세 페이지
 * 카테고리별 다른 UI 렌더링
 */

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import EquipmentDetail from "../components/details/EquipmentDetail";
import RecruitDetail from "../components/details/RecruitDetail";
import MatchDetail from "../components/details/MatchDetail";
import OwnerActions from "../components/OwnerActions";
import StatusBadge from "../components/StatusBadge";
import PostDetailSkeleton from "../components/PostDetailSkeleton";
import BottomActionBar from "../components/BottomActionBar";
import type { MarketPost } from "../types";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

export default function MarketPostDetailPage() {
  // 🔥 디버깅: 중복 렌더링 확인
  console.log("🔥 [MarketPostDetailPage] RENDER", {
    timestamp: new Date().toISOString(),
    pathname: window.location.pathname,
  });
  
  // 🔥 라우터 경로: /sports/:sport/market/:postId
  const { sport: sportParam, postId } = useParams<{ sport: string; postId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<MarketPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sport, setSport] = useState<string | null>(null); // 🔥 문서에서 읽은 sport 저장
  
  // 🔥 채팅하기/찜하기 상태 (모든 hook은 early return 전에 선언)
  const [chatting, setChatting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  // 🔥 이미지 슬라이더 상태 (반드시 모든 early return 이전에 선언)
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const handleScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth } = el;
    const idx = Math.round(scrollLeft / Math.max(clientWidth, 1));
    setActiveIndex(idx);
  };
  
  // 🔥 경로 기반 sport 복구 (fallback 포함)
  const resolvedSport = (sportParam as string | undefined) ?? (post?.sport as string | undefined) ?? "all";

  // 🔥 권한 게이트 (작성자 판별) - 프로덕션급 강화
  const isOwner = useMemo(() => {
    if (!post || !user?.uid || !post.authorId) return false;
    
    // 🔥 정확한 UID 비교 (문자열 비교)
    const isAuthor = user.uid === post.authorId;
    
    // 🔥 디버깅 로그 (권한 체크 실패 시)
    if (!isAuthor && post) {
      console.log("🔍 [MarketPostDetailPage] 권한 체크:", {
        userUid: user.uid,
        authorId: post.authorId,
        일치여부: isAuthor,
        postId: post.id,
      });
    }
    
    return isAuthor;
  }, [post, user?.uid]);

  useEffect(() => {
    console.log("🔍 [MarketPostDetailPage] owner check:", {
      userUid: user?.uid ?? null,
      postUid: post?.authorId ?? null,
      isOwner,
    });
  }, [user?.uid, post?.authorId, isOwner]);

  // 🔥 데이터 파싱 함수 (공통 로직)
  const processPostData = (snap: any) => {
    try {
      const data = snap.data();
      const firestoreDocId = snap.id;
      
      // 🔥 삭제된 상품 체크
      if (data?.isDeleted || data?.status === "hidden") {
        setError("이 상품은 삭제되었습니다.");
        setPost(null);
        setLoading(false);
        return;
      }
      
      // 🔥 게시글 상세 진입 트래킹 (optional)
      import("@/lib/analytics")
        .then(({ trackMarket }) => {
          try {
            trackMarket.viewPost({
              postId: firestoreDocId,
              sport: data?.sport,
              category: data?.category,
              price: data?.price,
            });
          } catch (err) {
            // 트래킹 실패는 무시
          }
        })
        .catch(() => {});
      
      // 🔥 authorId 검증
      const authorId = data.authorId || data.userId || data.ownerId || data.sellerId;
      if (!authorId) {
        console.error("❌ [MarketPostDetailPage] authorId가 없습니다:", {
          docId: firestoreDocId,
          urlPostId: postId,
          dataKeys: Object.keys(data),
        });
        setError("게시글 작성자 정보가 없습니다.");
        setLoading(false);
        return;
      }

      // 🚨 이미지 필드 호환 처리
      let images: string[] = [];
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        images = data.images;
      } else if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
        images = data.imageUrls;
      } else if (data.imageUrl) {
        images = [data.imageUrl];
      }
      
      // 🚨 제목 필드 호환 처리
      const title = data.title || data.name || "";
      
      // 🔥 sport 저장 (fallback: "all")
      const postSport = data.sport || sportParam || "all";
      setSport(postSport);

      const postData: MarketPost = {
        id: firestoreDocId,
        sport: postSport,
        category: data.category,
        title: title,
        description: data.description || data.desc || "",
        price: data.price,
        location: data.location || data.locationText || data.address || "",
        images: images,
        status: data.status || "active" || "open",
        reservedBy: data.reservedBy ?? null,
        reservedAt: data.reservedAt ?? null,
        createdAt: data.createdAt,
        authorId: authorId,
        authorName: data.authorName,
        viewCount: data.viewCount || 0,
        likeCount: data.likeCount || 0,
        condition: data.condition,
        brand: data.brand,
        people: data.people,
        currentPeople: data.currentPeople,
        position: data.position,
        level: data.level,
        ageRange: data.ageRange,
        practiceDay: data.practiceDay,
        practiceLocation: data.practiceLocation,
        matchDate: data.matchDate,
        matchType: data.matchType,
        fee: data.fee,
        teamId: data.teamId || data.team_id || data.clubId || undefined,
        teamName: data.teamName || data.team_name || data.clubName || undefined,
      };

      console.log("✅ [MarketPostDetailPage] 게시글 로드 완료:", {
        urlPostId: postId,
        postId: postData.id,
        firestoreDocId: firestoreDocId,
        category: postData.category,
        collection: snap.ref.parent.id,
      });

      setPost(postData);
      setLoading(false);
      setError(null);

      // 🔥 조회수 증가 (비동기, 에러 무시)
      if (firestoreDocId) {
        import("@/services/marketRankingService").then(({ incrementPostViews }) => {
          incrementPostViews(firestoreDocId).catch(() => {});
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error("❌ [MarketPostDetailPage] 게시글 처리 실패:", err);
      setError("게시글을 불러오는 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🔥 필수 파라미터 검증
    if (!postId) {
      setError("게시글을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    console.log("🔍 [MarketPostDetailPage] 실시간 구독 시작:", {
      urlPostId: postId,
      urlSport: sportParam,
      collection: "market",
    });

    // 🔥 market 컬렉션 단일 기준
    const ref = doc(db, "market", postId);
    
    // 🔥 실시간 구독
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          console.error("❌ [MarketPostDetailPage] market 컬렉션에 문서 없음:", {
            urlPostId: postId,
          });
          setError("게시글이 존재하지 않습니다.");
          setPost(null);
          setLoading(false);
          return;
        }

        console.log("✅ [MarketPostDetailPage] market에서 문서 발견");
        processPostData(snap);
      },
      (err: any) => {
        console.error("❌ [MarketPostDetailPage] 실시간 구독 실패:", err);
        console.error("❌ [MarketPostDetailPage] 권한/네트워크 에러 상세:", {
          code: err?.code,
          message: err?.message,
          name: err?.name,
        });
        setError("게시글을 불러오는 중 오류가 발생했습니다.");
        setPost(null);
        setLoading(false);
      }
    );

    // 🔥 구독 해제
    return () => unsub();
  }, [postId, sportParam]);

  // 🔒 상품 sport 단일 기준: DB(post.sport)로 URL 쿼리 정규화
  useEffect(() => {
    if (!post?.id || !post?.sport) return;
    const querySport = searchParams.get("sport");
    const realSport = String(post.sport).toLowerCase();
    if (querySport !== realSport) {
      navigate(sportMarketDetailUrl(realSport, post.id), { replace: true });
    }
  }, [post?.id, post?.sport, searchParams, navigate]);

  // 🔥 찜 상태 로드 (모든 hook은 early return 전에 선언)
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!user?.uid || !post?.id) {
        setLiked(false);
        return;
      }
      try {
        const favoriteRef = doc(db, "users", user.uid, "favorites", post.id);
        const favoriteSnap = await getDoc(favoriteRef);
        setLiked(favoriteSnap.exists());
      } catch (error: any) {
        if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
          console.warn("⚠️ [MarketPostDetailPage] 찜 상태 조회 권한 없음 (무시):", error?.code, error?.message);
        } else {
          console.warn("⚠️ 찜 상태 로드 실패:", error);
        }
        setLiked(false);
      }
    };
    void loadFavoriteStatus();
  }, [user?.uid, post?.id]);

  // 30분 지난 예약은 상세 진입 시 best-effort 자동 해제
  useEffect(() => {
    const EXPIRE_MS = 30 * 60 * 1000;
    const releaseExpiredReservation = async () => {
      if (!post?.id || post.status !== "reserved" || !post.reservedAt || !user?.uid) return;
      const millis =
        typeof (post.reservedAt as any)?.toMillis === "function"
          ? (post.reservedAt as any).toMillis()
          : post.reservedAt instanceof Date
            ? post.reservedAt.getTime()
            : typeof post.reservedAt === "number"
              ? post.reservedAt
              : null;
      if (!millis) return;
      const expired = Date.now() - millis > EXPIRE_MS;
      if (!expired) return;
      const canRelease = user.uid === post.authorId || user.uid === post.reservedBy;
      if (!canRelease) return;

      const payload = {
        status: "active",
        reservedBy: null,
        reservedAt: null,
        updatedAt: serverTimestamp(),
      };
      try {
        await updateDoc(doc(db, "market", post.id), payload);
        setPost((prev) =>
          prev
            ? { ...prev, status: "active", reservedBy: null, reservedAt: null }
            : prev
        );
      } catch (e) {
        console.warn("⚠️ 예약 자동 해제 실패(무시):", e);
      }
    };
    void releaseExpiredReservation();
  }, [post?.id, post?.status, post?.reservedAt, post?.reservedBy, post?.authorId, user?.uid]);

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-4 w-full">
        <PostDetailSkeleton />
      </div>
    );
  }

  // 🔥 NotFound/삭제 처리: 로딩 끝났는데 문서 없음
  if (!loading && !post && !error) {
    return (
      <div className="max-w-[720px] mx-auto px-4 w-full">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-600 mb-2">삭제되었거나 숨김 처리된 게시글입니다.</p>
          <button
            onClick={() => {
              if (sportParam) {
                navigate(`/sports/${sportParam}/market`);
              } else {
                navigate(`/market`);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            목록으로
          </button>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-[720px] mx-auto px-4 w-full">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-600 mb-2">{error || "게시글을 찾을 수 없습니다."}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  // 🔥 게시글 업데이트 핸들러 (상태 변경 후 로컬 상태 동기화)
  const handlePostUpdate = (updatedPost: MarketPost) => {
    setPost(updatedPost);
  };

  // 카테고리별 상세 컴포넌트 렌더링
  const renderDetail = () => {
    // 🔥 디버깅: 중복 렌더링 확인
    console.log("🔥 [MarketPostDetailPage] renderDetail 호출", {
      category: post.category,
      postId: post.id,
      timestamp: new Date().toISOString(),
    });
    
    try {
      // 🔥 뒤로가기 핸들러 (sport 기반으로 종목 마켓으로 이동)
      const handleBack = () => {
        // 1) 경로에 sport가 있으면 해당 종목으로
        if (sportParam) {
          navigate(`/sports/${sportParam}/market`);
          return;
        }
        // 2) 문서 sport가 유효하면 해당 종목으로
        if (post?.sport) {
          navigate(`/sports/${String(post.sport)}/market`);
          return;
        }
        // 3) 마지막 안전망: 전종목 마켓
        navigate(`/market`);
      };

      switch (post.category) {
        case "equipment":
          return <EquipmentDetail post={post} onBack={handleBack} sport={sport} onPostUpdate={handlePostUpdate} hideMedia />;
        case "recruit":
          return <RecruitDetail post={post} user={user} onBack={handleBack} sport={sport} hideMedia />;
        case "match":
          return <MatchDetail post={post} user={user} onBack={handleBack} sport={sport} hideMedia />;
        default:
          return <EquipmentDetail post={post} onBack={handleBack} sport={sport} onPostUpdate={handlePostUpdate} hideMedia />;
      }
    } catch (error: any) {
      console.error("❌ [MarketPostDetailPage] renderDetail 에러:", error);
      return (
        <div className="p-4">
          <p className="text-red-600">컴포넌트 렌더링 중 오류가 발생했습니다.</p>
          <p className="text-sm text-gray-600 mt-2">{error?.message || String(error)}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            뒤로가기
          </button>
        </div>
      );
    }
  };

  // 🔥 상태 변경 핸들러
  const handleStatusChange = async (status: string) => {
    if (!post?.id) return;
    
    try {
      const currentUid = user?.uid || null;
      const isOwnerUser = !!currentUid && currentUid === post.authorId;
      const isReservedByMe = !!currentUid && post.reservedBy === currentUid;

      // reserved -> active는 작성자 또는 예약자만 해제 가능
      if (
        status === "active" &&
        post.status === "reserved" &&
        !isOwnerUser &&
        !isReservedByMe
      ) {
        alert("예약 해제 권한이 없습니다.");
        return;
      }

      const updatePayload: Record<string, any> = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === "reserved") {
        // 구매자 예약 시 reservedBy를 구매자 uid로 설정
        updatePayload.reservedBy = currentUid;
        updatePayload.reservedAt = serverTimestamp();
      } else if (status === "active" || status === "open" || status === "sold" || status === "done" || status === "completed") {
        // 해제 시 예약 정보 초기화
        updatePayload.reservedBy = null;
        updatePayload.reservedAt = null;
      }

      const marketRef = doc(db, "market", post.id);
      await updateDoc(marketRef, updatePayload);
      
      // 로컬 상태 업데이트
      const localUpdated: MarketPost = {
        ...post,
        status: status as any,
        reservedBy:
          status === "reserved"
            ? currentUid
            : status === "active" || status === "open"
              ? null
              : post.reservedBy ?? null,
        reservedAt:
          status === "reserved"
            ? new Date()
            : status === "active" || status === "open"
              ? null
              : post.reservedAt ?? null,
      };
      setPost(localUpdated);
      handlePostUpdate(localUpdated);
    } catch (error: any) {
      console.error("❌ [MarketPostDetailPage] 상태 변경 오류:", error);
      alert("상태 변경 중 오류가 발생했습니다.\n" + (error.message || "알 수 없는 오류"));
    }
  };

  // 🔥 채팅하기 핸들러
  const handleChat = async () => {
    if (!user?.uid) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (!post?.id) return;

    if (post.status === "completed" || post.status === "done" || post.status === "hidden" || post.status === ("sold" as any) || post.status === ("closed" as any)) {
      alert("거래가 완료되었거나 삭제된 상품입니다.");
      return;
    }

    if (chatting) return;

    setChatting(true);
    try {
      if (post.status === "reserved" && post.reservedBy && post.reservedBy !== user.uid) {
        alert("이미 예약된 상품입니다.");
        return;
      }

      const {
        getOrCreateChat,
        resolveListingOwnerUid,
        getStableChatId,
        normalizeTradeChatDocumentIdForRoute,
      } = await import(
        "@/features/chat/services/chatService"
      );
      const listingOwner = await resolveListingOwnerUid(post.id);
      const sellerId =
        listingOwner ||
        post.authorId ||
        (post as { sellerId?: string }).sellerId ||
        (post as { userId?: string }).userId ||
        "";

      if (!sellerId) {
        alert("판매자 정보가 없습니다.");
        return;
      }
      if (user.uid === sellerId) {
        alert("본인의 상품에는 채팅할 수 없습니다.");
        return;
      }

      if (import.meta.env.DEV) {
        console.log("[CHAT DEBUG]", {
          postId: post.id,
          listingOwner: listingOwner || null,
          sellerId,
          buyerId: user.uid,
          stableChatId: getStableChatId(post.id, sellerId, user.uid),
        });
      }

      const { chatId } = await getOrCreateChat({
        postId: post.id,
        postTitle: post.title,
        postImage: post.images?.[0],
        sport: post.sport,
        sellerId,
        buyerId: user.uid,
      });

      if (import.meta.env.DEV) {
        console.log("[CHAT DEBUG] resolved", { chatId, stableChatId: getStableChatId(post.id, sellerId, user.uid) });
      }

      navigate(`/app/chat/${normalizeTradeChatDocumentIdForRoute(chatId)}`);

      /** 예약 반영은 채팅 진입 후 비차단 — 규칙 거부 시에도 대화는 가능 */
      if ((post.status === "active" || post.status === "open") && post.reservedBy !== user.uid) {
        const reservePayload = {
          status: "reserved",
          reservedBy: user.uid,
          reservedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        try {
          await updateDoc(doc(db, "market", post.id), reservePayload);
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  status: "reserved",
                  reservedBy: user.uid,
                  reservedAt: new Date(),
                }
              : prev
          );
        } catch (reserveErr) {
          console.warn("[MarketPostDetailPage] 예약 상태 반영 실패(채팅은 정상):", reserveErr);
        }
      }
    } catch (error: any) {
      console.error("❌ 채팅방 생성 실패:", error);
      alert(
        "채팅방 생성 중 오류가 발생했습니다.\n" + (error?.message || error?.code || "알 수 없는 오류")
      );
    } finally {
      setChatting(false);
    }
  };

  // 🔥 찜하기 핸들러
  const handleLike = async () => {
    if (!user?.uid) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (liking || !post?.id) return;

    setLiking(true);
    try {
      const newLiked = !liked;
      const favoriteRef = doc(db, "users", user.uid, "favorites", post.id);
      
      if (newLiked) {
        await setDoc(favoriteRef, {
          postId: post.id,
          createdAt: serverTimestamp(),
          postSnapshot: {
            title: post.title,
            price: post.price || 0,
            imageUrl: post.images?.[0] || "",
            sport: post.sport,
            category: post.category,
          },
        });
      } else {
        await deleteDoc(favoriteRef);
      }
      
      setLiked(newLiked);
      
      const { incrementPostLikes, decrementPostLikes } = await import("@/services/marketRankingService");
      if (newLiked) {
        await incrementPostLikes(post.id);
      } else {
        await decrementPostLikes(post.id);
      }
    } catch (error: any) {
      console.error("❌ 찜하기 오류:", error);
      alert("찜하기 처리 중 오류가 발생했습니다.");
    } finally {
      setLiking(false);
    }
  };

  // 🔥 거래 완료 상태 확인 (조건부 렌더링 전에 계산)
  const shouldShowActionBar = 
    post &&
    post.status !== "completed" &&
    post.status !== "done" &&
    post.status !== "hidden" &&
    post.status !== ("sold" as any) &&
    post.status !== ("closed" as any);

  const formatPrice = (price?: number) => {
    if (typeof price !== "number") return null;
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };
  
  const getStatusLabel = (s?: string) => {
    const val = String(s || "open").toLowerCase();
    if (["sold", "done", "completed", "closed", "hidden"].includes(val)) return "판매 완료";
    if (["reserved", "holding"].includes(val)) return "예약중";
    return "거래 가능";
  };

  const isEquipmentPost = !post.category || post.category === "equipment";

  return (
    <>
      <div 
        className="w-full max-w-3xl mx-auto px-4 md:px-6 pt-4 md:pt-6"
        style={{ 
          paddingBottom: shouldShowActionBar ? '100px' : '0px',
        }}
      >
        {/* 모바일 고정 헤더 가림 방지: 콘텐츠 시작 전에 강제 오프셋 */}
        <div
          aria-hidden
          className="block md:hidden"
          style={{ height: "calc(var(--header-h, 56px) + env(safe-area-inset-top, 0px) + 52px)" }}
        />

        <div className="w-full bg-gray-100 rounded-xl overflow-hidden relative">
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            className="w-full aspect-[4/3] flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
          >
            {(post.images && post.images.length > 0 ? post.images : [""]).map((img, i) => (
              <div key={i} className="w-full h-full flex-shrink-0 snap-center">
                {img ? (
                  <img
                    src={img}
                    alt={`${post.title || "이미지"}-${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    이미지 없음
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* 상태 배지 (이미지 좌상단) */}
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {getStatusLabel(post.status as any)}
          </div>
          {/* 인디케이터 */}
          {Array.isArray(post.images) && post.images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {post.images.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === activeIndex ? "bg-white" : "bg-white/60"}`}
                />
              ))}
            </div>
          )}
        </div>

        <section className="mt-5 space-y-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {post.title || "제목 없음"}
          </h1>
          <div className="text-2xl md:text-3xl font-extrabold text-blue-600">
            {formatPrice(post.price) || "가격 미정"}
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>{getStatusLabel(post.status as any)}</span>
            {post.condition && (
              <>
                <span>·</span>
                <span>{post.condition}</span>
              </>
            )}
            {post.location && (
              <>
                <span>·</span>
                <span>{post.location}</span>
              </>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 md:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">상품 설명</h2>
          <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
            {post.description?.trim() || "등록된 설명이 없습니다."}
          </p>
        </section>

        {post.teamId && (
          <button
            onClick={() => navigate(`/teams/${encodeURIComponent(post.teamId)}/play`)}
            className="mt-6 w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-4 py-3 transition-colors"
          >
            <p className="text-xs text-blue-700 mb-0.5">팀 정보</p>
            <p className="text-sm font-semibold text-blue-900">
              {post.teamName || "팀 상세 보기"} →
            </p>
          </button>
        )}

        {!isEquipmentPost && <div className="mt-6">{renderDetail()}</div>}
      </div>

      {/* 🔥 하단 고정 액션 바 (단일 컴포넌트로 통일) - viewport 기준 fixed */}
      {shouldShowActionBar && (
        <BottomActionBar
          post={post}
          isSeller={isOwner}
          currentUserId={user?.uid}
          onStatusChange={handleStatusChange}
          onDelete={async () => {
            if (!post?.id) return;
            const confirmed = window.confirm(
              "이 상품을 삭제하시겠습니까?\n\n삭제 후에는 복구할 수 없습니다."
            );
            if (!confirmed) return;
            try {
              await updateDoc(doc(db, "market", post.id), {
                status: "hidden",
                isDeleted: true,
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              if (sportParam) {
                navigate(`/sports/${sportParam}/market`);
              } else {
                navigate("/market");
              }
            } catch (error: any) {
              console.error("❌ [MarketPostDetailPage] 삭제 실패:", error);
              alert("상품 삭제 중 오류가 발생했습니다.");
            }
          }}
          onChat={handleChat}
          onLike={handleLike}
          liked={liked}
          chatting={chatting}
          liking={liking}
        />
      )}
    </>
  );
}
