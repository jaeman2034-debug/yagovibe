/**
 * 🔥 팀 모집 상세 페이지
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MapPin, Clock, Target, Calendar, MessageCircle, Check, X, MoreVertical } from "lucide-react";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { cn } from "@/lib/utils";
import { devLog, devWarn, devError } from "@/lib/utils/dev";
import {
  joinMarketPost,
  cancelMarketJoin,
  getMarketJoinStatus,
  updateJoinStatus,
  getMarketJoinList,
  resolveMarketPostDoc,
  type MarketJoin,
} from "../../services/marketJoinService";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import RecruitStatusBadge from "../RecruitStatusBadge";
import { RecruitChatPanel } from "@/components/recruit/RecruitChatPanel";
import MarketDetailHeader from "../MarketDetailHeader";
import type { MarketPost } from "../../types";

interface RecruitDetailProps {
  post: MarketPost;
  user?: any; // 🔥 선택적 props (기존 useAuth와 호환)
  onBack?: () => void;
  sport?: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  입문: "입문",
  아마: "아마추어",
  프로지향: "프로지향",
};

const LEVEL_COLORS: Record<string, string> = {
  입문: "bg-green-100 text-green-700",
  아마: "bg-blue-100 text-blue-700",
  프로지향: "bg-purple-100 text-purple-700",
};

interface RecruitDetailProps {
  post: any;
  user?: any;
  onBack?: () => void;
  sport?: string | null;
  hideMedia?: boolean;
}

export default function RecruitDetail({ post, user: propUser, onBack, sport, hideMedia = false }: RecruitDetailProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  // 🔥 props로 전달된 user 우선, 없으면 useAuth 사용

  // 🔥 뒤로가기 핸들러 (sport 기반으로 종목 마켓으로 이동)
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (sport) {
      navigate(`/${sport}/market`);
    } else {
      navigate(-1);
    }
  };

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
  const user = propUser || authUser;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [joinStatus, setJoinStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joinList, setJoinList] = useState<MarketJoin[]>([]);
  const [processingJoinId, setProcessingJoinId] = useState<string | null>(null);

  // 🔥 Firestore에서 직접 조회한 최신 post 데이터 (캐시 무시)
  const [realPost, setRealPost] = useState<MarketPost | null>(null);

  // 🔥 Firestore 실시간 구독 — 문서가 `market` 또는 `marketPosts` 중 어디에 있든 동일 ID로 구독
  useEffect(() => {
    if (!post?.id) {
      setRealPost(null);
      return;
    }

    devLog("🔥 [RecruitDetail] Firestore 실시간 구독 시작:", { postId: post.id });

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { ref: postRef } = await resolveMarketPostDoc(post.id);
        if (cancelled) return;
        unsubscribe = onSnapshot(
          postRef,
          (snapshot) => {
        if (!snapshot.exists()) {
          devWarn("⚠️ [RecruitDetail] Firestore 문서 없음:", { postId: post.id });
          setRealPost(null);
          return;
        }

        const data = snapshot.data();
        
        // 🔥 authorId 호환 처리 (MarketPostDetailPage와 동일)
        const authorId = data.authorId || data.userId || data.ownerId || data.sellerId;
        
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
        
        const firestorePost: MarketPost = {
          id: snapshot.id,
          sport: data.sport || "etc",
          category: data.category,
          title: title,
          description: data.description || data.desc || "",
          price: data.price,
          location: data.location || data.locationText || data.address || "",
          images: images,
          status: data.status || "active" || "open",
          createdAt: data.createdAt,
          authorId: authorId, // 🔥 호환 처리된 authorId
          authorName: data.authorName,
          viewCount: data.viewCount || 0,
          likeCount: data.likeCount || 0,
          
          // 카테고리별 특화 필드
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
        } as MarketPost;

        devLog("✅ [RecruitDetail] Firestore 실시간 업데이트:", {
          postId: snapshot.id,
          authorId: firestorePost.authorId,
          rawAuthorId: data.authorId,
          rawUserId: data.userId,
          title: firestorePost.title,
          propsAuthorId: post.authorId,
          일치여부: firestorePost.authorId === post.authorId,
          호환처리사용: !data.authorId && (data.userId || data.ownerId || data.sellerId),
        });

        setRealPost(firestorePost);
      },
      (error) => {
        devError("❌ [RecruitDetail] Firestore 구독 실패:", error);
        setRealPost(null);
      }
        );
      } catch {
        if (!cancelled) {
          devWarn("⚠️ [RecruitDetail] market/marketPosts에서 글을 찾지 못함:", { postId: post.id });
          setRealPost(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [post?.id]);

  // 🔥 최신 데이터 우선 사용 (realPost가 있으면 realPost, 없으면 props post)
  // 🔥 초기 로딩 중에는 realPost가 null일 수 있으므로, 로딩 완료 후에만 realPost 사용
  const data = realPost || post;
  
  // 🔥 디버깅: 데이터 소스 확인
  useEffect(() => {
    if (data?.id) {
      devLog("🔥 [RecruitDetail] 사용 중인 데이터 소스:", {
        postId: data.id,
        authorId: data.authorId,
        사용소스: realPost ? "Firestore 실시간 구독" : "props (MarketPostDetailPage)",
        hasRealPost: !!realPost,
        propsAuthorId: post?.authorId,
        realPostAuthorId: realPost?.authorId,
      });
    }
  }, [data?.id, data?.authorId, realPost, post?.authorId]);

  // 🔥 POST 객체 전체 확인 (캐시/옛날 데이터 체크용)
  useEffect(() => {
    // 🔥 핵심 디버깅 로그 (개발 모드에서만)
    devLog("===== AUTHOR DEBUG =====");
    devLog("user.uid:", user?.uid);
    devLog("post.authorId:", post?.authorId);
    devLog("post 전체:", post);
    devLog("authUser?.uid:", authUser?.uid);
    devLog("propUser?.uid:", propUser?.uid);
    devLog("========================");
    
    devLog("🔍 [RecruitDetail] POST FULL:", post);
    devLog("🔍 [RecruitDetail] POST ID:", post?.id);
    devLog("🔍 [RecruitDetail] POST AUTHOR:", post?.authorId);
    devLog("🔍 [RecruitDetail] POST AUTHOR 타입:", typeof post?.authorId);
    devLog("🔍 [RecruitDetail] POST AUTHOR JSON:", JSON.stringify(post?.authorId));
    
    // 🔥 authorId 값 확인
    if (post?.authorId === "dummy-user-4" || post?.authorId === "dummy-user-3") {
      devError("❌ [RecruitDetail] ⚠️ 경고: post 객체가 옛날 데이터(dummy-user)를 들고 있습니다!", {
        postId: post?.id,
        authorId: post?.authorId,
        해결방법: "MarketPostDetailPage에서 최신 데이터를 다시 불러와야 합니다.",
      });
    }

    // 🔥 유니코드/숨은 문자 체크
    if (post?.authorId) {
      const authorIdBytes = Array.from(post.authorId).map(c => c.charCodeAt(0));
      const authorIdHex = Array.from(post.authorId).map(c => c.charCodeAt(0).toString(16));
      devLog("🔍 [RecruitDetail] POST AUTHOR 바이트 분석:", {
        원본: post.authorId,
        길이: post.authorId.length,
        바이트배열: authorIdBytes,
        hex배열: authorIdHex,
        각문자: Array.from(post.authorId).map((c, i) => ({
          문자: c,
          코드: c.charCodeAt(0),
          hex: c.charCodeAt(0).toString(16),
        })),
      });
    }

    // 🔥 Firestore에서 직접 조회 (최종 판독기)
    if (post?.id) {
      const postId = post.id;
      console.log("🔍 [RecruitDetail] Firestore 직접 조회 시작:", { postId });
      
      resolveMarketPostDoc(postId)
        .then(({ snap: snapshot }) => {
          if (!snapshot.exists()) {
            console.error("❌ [RecruitDetail] DIRECT FIRESTORE: 문서가 존재하지 않음", { postId });
            return;
          }

          const firestoreData = snapshot.data();
          const firestoreAuthorId = firestoreData?.authorId;
          
          console.log("✅ [RecruitDetail] DIRECT FIRESTORE (최종 판독기):", {
            postId: snapshot.id,
            authorId: firestoreAuthorId,
            authorIdType: typeof firestoreAuthorId,
            authorIdJSON: JSON.stringify(firestoreAuthorId),
            전체데이터: firestoreData,
          });

          // 🔥 props로 받은 값과 Firestore 직접 조회 값 비교
          const propsAuthorId = post?.authorId;
          const isMatch = propsAuthorId === firestoreAuthorId;
          
          console.log("🔍 [RecruitDetail] 값 비교 (Props vs Firestore 직접 조회):", {
            propsAuthorId: propsAuthorId,
            firestoreAuthorId: firestoreAuthorId,
            일치여부: isMatch,
            propsAuthorIdType: typeof propsAuthorId,
            firestoreAuthorIdType: typeof firestoreAuthorId,
            propsAuthorIdJSON: JSON.stringify(propsAuthorId),
            firestoreAuthorIdJSON: JSON.stringify(firestoreAuthorId),
          });

          if (!isMatch) {
            console.error("❌ [RecruitDetail] ⚠️ 경고: Props 값과 Firestore 직접 조회 값이 다릅니다!", {
              propsAuthorId: propsAuthorId,
              firestoreAuthorId: firestoreAuthorId,
              원인: "부모 컴포넌트에서 옛날 state를 전달하고 있거나, Firestore 데이터가 업데이트되지 않았습니다.",
            });
          } else {
            console.log("✅ [RecruitDetail] Props 값과 Firestore 직접 조회 값이 일치합니다.");
          }
        })
        .catch((error) => {
          console.error("❌ [RecruitDetail] DIRECT FIRESTORE 조회 실패:", error);
        });
    }
  }, [post]);

  // 🔥 강제 테스트 (사용자 요청)
  useEffect(() => {
    if (post?.authorId && user?.uid) {
      const directCompare = post.authorId === user.uid;
      const trimmedCompare = String(post.authorId).trim() === String(user.uid).trim();
      
      console.log("🎯 [RecruitDetail] 강제 작성자 인식 테스트:", {
        postAuthorId: post.authorId,
        userUid: user.uid,
        직접비교: directCompare,
        trim비교: trimmedCompare,
        결과: directCompare || trimmedCompare,
      });
      
      if (directCompare || trimmedCompare) {
        console.log("🎯 [RecruitDetail] 강제 작성자 인식 성공!");
      }
    }

    // 🔥 최종 비교 직전 진단 (사용자 요청)
    if (post?.id) {
      (async () => {
        try {
          const { snap: firestoreSnap } = await resolveMarketPostDoc(post.id);
          const firestoreAuthorId = firestoreSnap.data()?.authorId;
          
          console.log("🔥 [RecruitDetail] 최종 비교 직전:", {
            fromPost: post?.authorId,
            fromUser: user?.uid,
            postSource: JSON.stringify(post),
            direct: firestoreAuthorId,
          });
        } catch (error) {
          console.error("❌ [RecruitDetail] 최종 비교 직전 조회 실패:", error);
        }
      })();
    }
  }, [post, user]);

  // 🔥 useMemo로 감싸서 user나 post.authorId 변경 시 재계산 (수정 버전)
  const isAuthor = useMemo(() => {
    // 🔥 명확한 변수 추출
    const uid = user?.uid || authUser?.uid || propUser?.uid;
    
    // 🔥 실제 authorId (realPost 우선, 없으면 props post, 호환 처리)
    const authorId = data?.authorId || (data as any)?.userId || (data as any)?.ownerId || (data as any)?.sellerId;
    
    // 🔥 최종 비교 로그 (사용자 요청)
    console.log("🎯 AUTHOR CHECK", { 
      uid, 
      authorId,
      dataAuthorId: data?.authorId,
      postAuthorId: post?.authorId,
      사용값: realPost ? "Firestore 실시간 구독" : "props 값",
      hasRealPost: !!realPost,
    });
    
    // null/undefined 체크
    if (!uid || !authorId) {
      return false;
    }
    
    // 🔥 문자열 정규화 (공백 제거 + 대소문자 통일)
    const normalizedUid = String(uid).trim().toLowerCase();
    const normalizedAuthorId = String(authorId).trim().toLowerCase();
    
    // 🔥 최종 비교 (대소문자 무시)
    const result = normalizedUid === normalizedAuthorId;
    
    console.log("🔥 [RecruitDetail] isAuthor 최종 결과:", {
      uid,
      authorId,
      normalizedUid,
      normalizedAuthorId,
      비교결과: result,
      사용값출처: realPost ? "Firestore 실시간 구독" : "props",
    });
    
    return result;
  }, [user?.uid, authUser?.uid, propUser?.uid, data?.authorId, realPost]);

  // 🔥 안전가드: 일반 유저인지 명확히 확인
  const isDefinitelyUser = useMemo(() => {
    const uid = user?.uid || authUser?.uid || propUser?.uid;
    const authorId = data?.authorId || (data as any)?.userId || (data as any)?.ownerId || (data as any)?.sellerId;
    
    if (!uid || !authorId) {
      console.log("🔍 [RecruitDetail] isDefinitelyUser: 값 없음 → 일반 유저로 간주", { uid, authorId });
      return true; // 값이 없으면 일반 유저로 간주
    }
    
    const normalizedUid = String(uid).trim().toLowerCase();
    const normalizedAuthorId = String(authorId).trim().toLowerCase();
    const result = normalizedUid !== normalizedAuthorId;
    
    console.log("🔍 [RecruitDetail] isDefinitelyUser 계산:", {
      uid,
      authorId,
      normalizedUid,
      normalizedAuthorId,
      결과: result ? "일반 유저" : "작성자",
    });
    
    return result;
  }, [user?.uid, authUser?.uid, propUser?.uid, data?.authorId, realPost]);

  // 🔥 디버깅: 상태 확인 (상세 버전)
  useEffect(() => {
    // 🔥 타입 및 실제 값 상세 확인
    const uidType = typeof user?.uid;
    const authorIdType = typeof post.authorId;
    const uidValue = user?.uid;
    const authorIdValue = post.authorId;
    const uidLength = user?.uid?.length;
    const authorIdLength = post.authorId?.length;
    const strictEqual = user?.uid === post.authorId;
    const looseEqual = user?.uid == post.authorId;
    
    console.log("🔥 [RecruitDetail] 상태 확인:", {
      postId: post.id,
      category: post.category,
      authorId: post.authorId,
      currentUserId: user?.uid,
      isAuthor,
      joinStatus,
      loading,
      hasUser: !!user,
      userDisplayName: user?.displayName,
    });
    
    // 🔥 상세 타입 및 값 비교
    console.log("🔍 [RecruitDetail] 작성자 비교 상세:", {
      uidType,
      authorIdType,
      uidValue,
      authorIdValue,
      uidLength,
      authorIdLength,
      strictEqual,
      looseEqual,
      uidJSON: JSON.stringify(user?.uid),
      authorIdJSON: JSON.stringify(post.authorId),
    });
    
    // 🔥 UID 불일치 경고 (정규화된 값으로 비교 - 대소문자 무시)
    const normalizedUid = user?.uid ? String(user.uid).trim().toLowerCase() : null;
    const normalizedAuthorId = post.authorId ? String(post.authorId).trim().toLowerCase() : null;
    
    if (normalizedUid && normalizedAuthorId) {
      if (normalizedUid !== normalizedAuthorId) {
        // 🔥 문자 단위 비교 (대소문자 차이 확인)
        const uidChars = Array.from(normalizedUid);
        const authorIdChars = Array.from(normalizedAuthorId);
        const diffIndex = uidChars.findIndex((char, i) => char !== authorIdChars[i]);
        
        console.error("❌ [RecruitDetail] ⚠️ 작성자 불일치 (대소문자 차이 발견!):", {
          현재로그인UID: user.uid,
          게시글작성자ID: post.authorId,
          정규화UID: normalizedUid,
          정규화작성자ID: normalizedAuthorId,
          일치여부: false,
          isAuthor,
          차이위치: diffIndex >= 0 ? `인덱스 ${diffIndex}에서 다름` : "길이 다름",
          차이나는문자: diffIndex >= 0 ? {
            uid문자: normalizedUid[diffIndex],
            authorId문자: normalizedAuthorId[diffIndex],
            uid코드: normalizedUid.charCodeAt(diffIndex),
            authorId코드: normalizedAuthorId.charCodeAt(diffIndex),
          } : null,
          해결방법: "Firestore Console에서 게시글의 authorId를 정확히 복사해서 현재 로그인 UID와 일치시켜주세요.",
        });
      } else {
        console.log("✅ [RecruitDetail] 작성자 일치 확인:", {
          현재로그인UID: user.uid,
          게시글작성자ID: post.authorId,
          정규화UID: normalizedUid,
          정규화작성자ID: normalizedAuthorId,
          일치여부: true,
          isAuthor,
        });
      }
    }
    
    // 🔥 버튼 표시 여부 계산 (isDefinitelyUser 사용)
    console.log("🔥 [RecruitDetail] 버튼 표시 여부:", {
      isDefinitelyUser,
      isAuthor,
      loading,
      shouldShowButton: isDefinitelyUser && !loading,
      reason: isDefinitelyUser ? "일반 유저" : "작성자",
      loadingState: loading ? "로딩 중" : "로딩 완료",
      joinStatus,
    });
  }, [post.id, post.category, post.authorId, user?.uid, isAuthor, joinStatus, loading, user]);

  const formatRelativeTime = (timestamp: number | any) => {
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

  // 🔥 실제 참여자 수 기반 진행률 계산 (데이터 정합성 보장)
  const actualCurrentPeople = isAuthor 
    ? joinList.filter(j => j.status === "approved" || j.status === "pending").length
    : (data.currentPeople || 0);
  
  const progress = data.people && actualCurrentPeople && data.people > 0
    ? Math.min(100, Math.round((actualCurrentPeople / data.people) * 100))
    : 0;

  // 참여 상태 실시간 구독 (일반 유저용, docId 고정 방식)
  useEffect(() => {
    // 🔥 디버깅: 조건 체크
    console.log("🔥 [RecruitDetail] 참여 상태 구독 조건 체크:", {
      hasUser: !!user,
      hasDataId: !!data.id,
      isAuthor,
      willSubscribe: !!(user && data.id && !isAuthor),
    });

    if (!user || !data.id || isAuthor) {
      console.log("⚠️ [RecruitDetail] 구독 스킵:", {
        reason: !user ? "user 없음" : !data.id ? "data.id 없음" : "작성자",
      });
      setLoading(false);
      return;
    }

    // 🔥 data.id 검증
    if (!data.id) {
      console.error("❌ [RecruitDetail] data.id가 없습니다:", data);
      setLoading(false);
      return;
    }

    // 🔥 docId 고정 방식으로 실시간 구독
    const joinDocId = `${data.id}_${user.uid}`;
    const joinRef = doc(db, "marketJoins", joinDocId);

    console.log("✅ [RecruitDetail] 참여 상태 구독 시작:", { joinDocId });

    const unsubscribe = onSnapshot(
      joinRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setJoinStatus("none");
          console.log("✅ [RecruitDetail] 참여 상태: none (문서 없음)");
        } else {
          const joinData = snapshot.data();
          // 🔥 안전 가드: joinData가 없으면 early return
          if (!joinData) {
            console.warn("⚠️ [RecruitDetail] joinData가 없습니다:", { snapshotId: snapshot.id });
            setJoinStatus("none");
            setLoading(false);
            return;
          }
          // 🔥 상태 정규화: cancelled 상태도 처리
          const rawStatus = joinData.status as string;
          let normalizedStatus: "none" | "pending" | "approved" | "rejected" = "none";
          
          if (rawStatus === "approved") {
            normalizedStatus = "approved";
          } else if (rawStatus === "pending") {
            normalizedStatus = "pending";
          } else if (rawStatus === "rejected") {
            normalizedStatus = "rejected";
          } else if (rawStatus === "cancelled_by_user" || rawStatus === "cancelled_by_author") {
            // 🔥 취소된 상태는 "none"으로 처리 (재신청 가능)
            normalizedStatus = "none";
          }
          
          setJoinStatus(normalizedStatus);
          console.log("✅ [RecruitDetail] 참여 상태 업데이트:", {
            rawStatus,
            normalizedStatus,
            joinId: snapshot.id,
            userId: joinData.userId,
            postId: joinData.postId,
            isApproved: normalizedStatus === "approved",
          });
        }
        setLoading(false);
      },
      (error: any) => {
        // 권한 오류는 정상 (로그인 안 한 경우 등)
        if (error.code === "permission-denied") {
          console.warn("⚠️ [RecruitDetail] 참여 상태 확인 권한 없음 (정상):", error);
          setJoinStatus("none");
        } else {
          console.error("❌ [RecruitDetail] 참여 상태 확인 실패:", error);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, data.id, isAuthor]);

  // 참여자 리스트 실시간 구독 (작성자용)
  useEffect(() => {
    // 🔥 디버깅: isAuthor와 data.id 확인
    console.log("🔥 [RecruitDetail] 참여자 리스트 구독 조건 체크:", {
      isAuthor,
      postId: data.id,
      willSubscribe: !!(isAuthor && data.id),
      userUid: user?.uid,
      dataAuthorId: data?.authorId,
      hasRealPost: !!realPost,
    });

    if (!isAuthor || !data.id) {
      console.log("⚠️ [RecruitDetail] 참여자 리스트 구독 스킵:", {
        reason: !isAuthor ? "작성자 아님" : "data.id 없음",
        isAuthor,
        postId: data.id,
      });
      setJoinList([]);
      // 🔥 작성자 전용 구독에서는 loading을 건드리지 않음 (일반 유저 구독에서만 관리)
      return;
    }

    const joinQuery = query(
      collection(db, "marketJoins"),
      where("postId", "==", data.id),
      where("status", "in", ["pending", "approved"])
    );

    console.log("✅ [RecruitDetail] 참여자 리스트 구독 시작:", { postId: data.id });

    const unsubscribe = onSnapshot(
      joinQuery,
      (snapshot) => {
        const joins = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MarketJoin[];
        
        console.log("✅ [RecruitDetail] 참여자 리스트 업데이트:", {
          count: joins.length,
          joins: joins.map(j => ({ id: j.id, status: j.status, userId: j.userId })),
        });
        
        setJoinList(joins);
        // 🔥 작성자 전용 구독에서는 loading을 건드리지 않음 (일반 유저 구독에서만 관리)
      },
      (error) => {
        console.error("❌ [RecruitDetail] 참여자 리스트 구독 실패:", error);
        setJoinList([]);
        // 🔥 작성자 전용 구독에서는 loading을 건드리지 않음 (일반 유저 구독에서만 관리)
      }
    );

    return () => unsubscribe();
  }, [isAuthor, data.id, realPost]);

  const handleJoin = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    // 🔥 재신청 가능: rejected 상태에서는 재신청 허용
    if (joinStatus === "pending" || joinStatus === "approved") {
      return; // 이미 참여함
    }

    // 인원수 체크 (사전 방어)
    if (isFull) {
      alert("모집 인원이 마감되었습니다.");
      return;
    }

    // 🔥 중복 클릭 방지
    if (joining) {
      return;
    }

    setJoining(true);

    try {
      await joinMarketPost({
        postId: data.id,
        userId: user.uid,
        userName: user.displayName || undefined,
        position: data.position?.[0], // 첫 번째 포지션
      });

      // 🔥 Optimistic UI: 상태는 실시간 구독으로 자동 업데이트되지만, 즉시 피드백 제공
      // alert 대신 토스트 메시지로 변경 가능하지만, 일단 alert 유지
      alert("참여 신청이 완료되었습니다!\n작성자의 승인을 기다려주세요.");
    } catch (err: any) {
      console.error("❌ [RecruitDetail] 참여 실패:", err);
      
      // 🔥 사용자 친화적인 에러 메시지 (개선)
      let errorMessage = "참여 신청에 실패했습니다.";
      if (err.message) {
        if (err.message.includes("이미 참여") || err.message.includes("참여 신청하셨습니다")) {
          errorMessage = "이미 참여 신청하셨습니다.\n승인 대기 중이거나 이미 승인된 상태입니다.";
        } else if (err.message.includes("마감") || err.message.includes("인원")) {
          errorMessage = "모집 인원이 마감되었습니다.\n다른 모집글을 확인해보세요.";
        } else if (err.message.includes("본인") || err.message.includes("작성한")) {
          errorMessage = "본인이 작성한 게시글에는 참여할 수 없습니다.";
        } else if (err.message.includes("참여할 수 없는")) {
          errorMessage = "이 게시글은 참여 신청이 불가능합니다.";
        } else {
          errorMessage = err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !data.id) return;

    // 🔥 상태별 취소 메시지 개선
    const cancelMessage = joinStatus === "approved" 
      ? "참여를 취소하시겠습니까?\n이미 승인된 상태이므로, 취소 시 작성자에게 알림이 전송됩니다."
      : "참여 신청을 취소하시겠습니까?";

    if (!confirm(cancelMessage)) return;

    // 🔥 중복 클릭 방지
    if (joining) {
      return;
    }

    setJoining(true);

    try {
      await cancelMarketJoin({
        postId: data.id,
        userId: user.uid,
      });

      // 🔥 Optimistic UI: 상태는 실시간 구독으로 자동 업데이트됨
      alert(joinStatus === "approved" 
        ? "참여가 취소되었습니다.\n다시 신청하시려면 '다시 참여하기' 버튼을 눌러주세요."
        : "참여 신청이 취소되었습니다.\n다시 신청하시려면 '참여하기' 버튼을 눌러주세요."
      );
    } catch (err: any) {
      console.error("❌ [RecruitDetail] 취소 실패:", err);
      
      // 🔥 사용자 친화적인 에러 메시지
      let errorMessage = "취소에 실패했습니다.";
      if (err.message) {
        if (err.message.includes("참여 신청을 찾을 수 없습니다")) {
          errorMessage = "참여 신청을 찾을 수 없습니다.\n이미 취소되었거나 존재하지 않는 신청입니다.";
        } else if (err.message.includes("취소할 수 없는")) {
          errorMessage = "이 상태에서는 취소할 수 없습니다.";
        } else {
          errorMessage = err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setJoining(false);
    }
  };

  const handleChat = async () => {
    // ============================================================
    // 🔥 1단계: 기본 검증 (로그인, 데이터 유효성)
    // ============================================================
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!data.id || !data.authorId) {
      alert("채팅 정보가 올바르지 않습니다.");
      return;
    }

    // 🔥 작성자 본인은 채팅 불가
    if (isAuthor) {
      alert("본인 게시글에는 문의할 수 없습니다.");
      return;
    }

    // ============================================================
    // 🔥 2단계: 모집 마감 상태 확인
    // ============================================================
    const isClosed = normalizedStatus === "closed" || normalizedStatus === "done" || normalizedStatus === "hidden";
    const isFull = !!(data.people && actualCurrentPeople && actualCurrentPeople >= data.people);
    
    // 🔥 마감된 모집은 채팅 불가 (신규 참여 차단)
    if (isClosed && !isAuthor) {
      alert("마감된 모집글에는 채팅할 수 없습니다.");
      return;
    }

    // ============================================================
    // 🔥 3단계: 참여 상태 기반 권한 검증 (핵심)
    // ============================================================
    const isApproved = joinStatus === "approved";
    
    // 🔥 승인 전 사용자는 채팅 불가 (스팸 방지)
    if (!isApproved) {
      alert("승인된 사용자만 채팅할 수 있습니다.\n참여 신청 후 작성자의 승인을 기다려주세요.");
      return;
    }
    
    // 🔥 추가 검증: 실제 DB 상태 확인 (이중 검증)
    try {
      const joinDocId = `${data.id}_${user.uid}`;
      const joinRef = doc(db, "marketJoins", joinDocId);
      const joinSnap = await getDoc(joinRef);
      
      if (joinSnap.exists()) {
        const joinData = joinSnap.data();
        const actualStatus = joinData?.status;
        
        if (actualStatus !== "approved") {
          console.warn("⚠️ [RecruitDetail] 상태 불일치 (DB 검증 실패):", {
            joinStatus,
            actualStatus,
            joinId: joinDocId,
          });
          alert(`참여 상태가 올바르지 않습니다.\n현재 상태: ${actualStatus}\n다시 시도해주세요.`);
          return;
        }
      } else {
        console.warn("⚠️ [RecruitDetail] 참여 문서가 없음:", { joinDocId });
        alert("참여 신청 정보를 찾을 수 없습니다.\n다시 신청해주세요.");
        return;
      }
    } catch (verifyError) {
      console.error("❌ [RecruitDetail] 상태 검증 실패:", verifyError);
      // 🔥 검증 실패 시에도 진행 (네트워크 문제일 수 있음)
      // 하지만 사용자에게 경고 표시
      if (!window.confirm("참여 상태 확인에 실패했습니다.\n계속 진행하시겠습니까?")) {
        return;
      }
    }

    try {
      devLog("💬 [RecruitDetail] 채팅 버튼 클릭:", {
        postId: data.id,
        userId: user.uid,
        authorId: data.authorId,
        joinStatus,
        isAuthor,
        isApproved,
      });

      // 🔥 모집 단체방 생성/확인 (없으면 생성, 있으면 재사용)
      const { ensureRecruitChatRoom } = await import("@/services/chat/ensureRecruitChatRoom");

      const chatRoomId = await ensureRecruitChatRoom({
        postId: data.id,
        userId: user.uid,
        authorId: data.authorId,
        postTitle: data.title,
        postSnapshot: {
          title: data.title,
          images: data.images,
          imageUrl: data.images?.[0],
        },
      });

      devLog("✅ [RecruitDetail] 모집 단체방 생성/확인 완료:", {
        chatRoomId,
        postId: data.id,
        userId: user.uid,
        isApproved,
      });

      // 🔥 채팅 페이지로 이동 (새 도메인 기반 라우팅)
      navigate(`/chat/${chatRoomId}`);
    } catch (err: any) {
      devError("❌ [RecruitDetail] 채팅방 생성 실패:", err);
      
      // 🔥 사용자 친화적인 에러 메시지
      let errorMessage = "채팅방 생성 중 오류가 발생했습니다.";
      if (err.code === "permission-denied") {
        errorMessage = "채팅방 생성 권한이 없습니다. 잠시 후 다시 시도해주세요.";
      } else if (err.code === "unavailable") {
        errorMessage = "네트워크 연결을 확인해주세요.";
      } else if (err.message) {
        errorMessage += `\n${err.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // 🔥 마감 여부 계산
  // 🔥 실제 참여자 수 기반 마감 여부 계산
  const isFull = !!(data.people && actualCurrentPeople && actualCurrentPeople >= data.people);
  
  // 🔥 상태 정규화 (open/closed/done/hidden 통일)
  const statusValue = (data.status as string) || "open";
  const normalizedStatus = 
    statusValue === "done" ? "closed" :
    statusValue === "hidden" ? "hidden" :
    statusValue === "closed" ? "closed" :
    statusValue === "open" ? "open" :
    statusValue === "active" ? "open" : // active도 open으로 처리
    "open"; // 기본값은 open
  
  const isClosed = normalizedStatus === "closed" || normalizedStatus === "hidden";
  
  // 🔥 채팅 권한: 작성자 또는 승인된 사용자만 가능
  const canEnterChat = isAuthor || joinStatus === "approved";
  // 🔥 문의하기 버튼용 (승인 전 사용자도 표시하되, 실제 진입은 차단)
  const canChat = !!user && !isAuthor;

  // 승인/거절 처리 (작성자용)
  const handleApprove = async (joinId: string) => {
    if (!confirm("이 참여 신청을 승인하시겠습니까?")) return;

    // 🔥 중복 클릭 방지
    if (processingJoinId) {
      return;
    }

    // 🔥 승인 전 현재 상태 확인
    const join = joinList.find(j => j.id === joinId);
    const beforeStatus = join?.status;
    
    console.log("🔥 [RecruitDetail] 승인 버튼 클릭:", {
      joinId,
      postId: data.id,
      isAuthor,
      userUid: user?.uid,
      beforeStatus,
      joinData: join,
    });

    setProcessingJoinId(joinId);
    try {
      console.log("🔥 [RecruitDetail] updateJoinStatus 호출 전:", {
        joinId,
        status: "approved",
        postId: data.id,
      });
      
      await updateJoinStatus({
        joinId,
        status: "approved",
        postId: data.id, // 🔥 data.id 사용
      });
      
      console.log("✅ [RecruitDetail] updateJoinStatus 완료, 승인 성공:", { 
        joinId,
        beforeStatus,
        afterStatus: "approved",
      });
      
      // 🔥 승인 후 채팅방 생성 확인 (약간의 지연 후)
      setTimeout(async () => {
        try {
          const roomId = `recruit_${data.id}`;
          const roomRef = doc(db, "chatRooms", roomId);
          const roomSnap = await getDoc(roomRef);
          
          if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            const members = roomData?.members || roomData?.participants || [];
            const approvedUser = join?.userId;
            
            console.log("✅ [RecruitDetail] 승인 후 채팅방 확인:", {
              roomId,
              members,
              approvedUser,
              isInRoom: approvedUser && members.includes(approvedUser),
            });
          } else {
            console.warn("⚠️ [RecruitDetail] 승인 후 채팅방이 아직 생성되지 않음:", {
              roomId,
              note: "서버 트리거가 처리할 예정",
            });
          }
        } catch (checkError) {
          console.warn("⚠️ [RecruitDetail] 채팅방 확인 실패 (무시):", checkError);
        }
      }, 1000);
      
      alert("참여 신청을 승인했습니다.");
    } catch (err: any) {
      console.error("❌ [RecruitDetail] 승인 실패:", {
        joinId,
        error: err,
        message: err.message,
        code: err.code,
      });
      
      // 🔥 사용자 친화적인 에러 메시지
      let errorMessage = "승인에 실패했습니다.";
      if (err.message) {
        if (err.message.includes("이미 처리")) {
          errorMessage = "이미 처리된 참여 신청입니다.";
        } else {
          errorMessage = err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setProcessingJoinId(null);
    }
  };

  const handleReject = async (joinId: string) => {
    if (!confirm("이 참여 신청을 거절하시겠습니까?")) return;

    // 🔥 중복 클릭 방지
    if (processingJoinId) {
      return;
    }

    console.log("🔥 [RecruitDetail] 거절 버튼 클릭:", {
      joinId,
      postId: data.id,
      isAuthor,
      userUid: user?.uid,
    });

    setProcessingJoinId(joinId);
    try {
      await updateJoinStatus({
        joinId,
        status: "rejected",
        postId: data.id, // 🔥 data.id 사용
      });
      console.log("✅ [RecruitDetail] 거절 성공:", { joinId });
      alert("참여 신청을 거절했습니다.");
    } catch (err: any) {
      console.error("❌ [RecruitDetail] 거절 실패:", {
        joinId,
        error: err,
        message: err.message,
        code: err.code,
      });
      
      // 🔥 사용자 친화적인 에러 메시지
      let errorMessage = "거절에 실패했습니다.";
      if (err.message) {
        if (err.message.includes("이미 처리")) {
          errorMessage = "이미 처리된 참여 신청입니다.";
        } else {
          errorMessage = err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setProcessingJoinId(null);
    }
  };

  return (
    <div className="w-full bg-white min-h-screen">
      {/* 🔥 최상단 컨테이너 (폭 제한 + 패딩) */}
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 16px",
          boxSizing: "border-box",
        }}
      >
        {/* 🔥 뒤로가기 버튼 (이미지 위) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 0",
            fontSize: 14,
            color: "#666",
            cursor: "pointer",
          }}
          onClick={handleBack}
        >
          <span style={{ fontSize: 18 }}>←</span>
          <span style={{ fontWeight: 500 }}>
            {sport ? `${SPORT_LABELS[sport] || sport} 마켓` : "뒤로가기"}
          </span>
        </div>

        {/* 이미지 */}
        {data.images && data.images.length > 0 ? (
          <div
            style={{
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 16,
              position: "relative",
            }}
          >
          {/* 🔥 작성자 전용: 점 3개 메뉴 (이미지 우측 상단) */}
          {isAuthor && (
            <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all active:scale-95"
                    aria-label="작성자 메뉴"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-700" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 right-0 sm:right-2 max-w-[calc(100vw-32px)]">
                  <DropdownMenuItem
                    onClick={() => {
                      if (data.status === "done" || data.status === "hidden") {
                        alert("마감된 게시글은 수정할 수 없습니다.");
                        return;
                      }
                      navigate(`/app/market/edit/${data.id}`);
                    }}
                    className={cn(
                      "cursor-pointer",
                      (data.status === "done" || data.status === "hidden") && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="mr-2">✏️</span>
                    수정
                  </DropdownMenuItem>
                  {(data.status === "active" || data.status === "open") && (
                    <DropdownMenuItem
                      onClick={async () => {
                        if (window.confirm("이 모집을 마감하시겠습니까?")) {
                          try {
                            const { ref } = await resolveMarketPostDoc(data.id);
                            await updateDoc(ref, {
                              status: "done",
                              updatedAt: serverTimestamp(),
                            });
                            alert("모집이 마감되었습니다.");
                          } catch (error: any) {
                            console.error("❌ 모집 마감 실패:", error);
                            alert("마감 처리 중 오류가 발생했습니다.");
                          }
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <span className="mr-2">🔒</span>
                      모집 마감
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={async () => {
                      if (window.confirm("이 모집글을 삭제하시겠습니까?\n\n삭제 후에는 복구할 수 없습니다.")) {
                        try {
                          const { ref } = await resolveMarketPostDoc(data.id);
                          await updateDoc(ref, {
                            status: "hidden",
                            isDeleted: true,
                            deletedAt: serverTimestamp(),
                          });
                          alert("모집글이 삭제되었습니다.");
                          navigate(-1);
                        } catch (error: any) {
                          console.error("❌ 삭제 실패:", error);
                          alert("삭제 중 오류가 발생했습니다.");
                        }
                      }
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <span className="mr-2">🗑️</span>
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
            {!hideMedia && (
            <div
              style={{
                width: "100%",
                aspectRatio: "4/3",
                backgroundColor: "#f3f4f6",
              }}
            >
              <img
                src={data.images[activeImageIndex]}
                alt={data.title}
                className="w-full max-h-[320px] object-cover rounded-lg"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            </div>
            )}
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "4/3",
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <p style={{ color: "#9ca3af" }}>이미지 없음</p>
          </div>
        )}

        {/* 모집 정보 */}
        <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        <MarketDetailHeader
          post={data}
          titleAddon={<RecruitStatusBadge post={data} myApplicationStatus={joinStatus} />}
        />

        {/* 🔥 내 상태 표시 (참여자용) - 개선된 UI */}
        {!isAuthor && user && (
          <div className={cn(
            "p-4 rounded-xl border-2 transition-all",
            joinStatus === "none" && "bg-gray-50 border-gray-200",
            joinStatus === "pending" && "bg-yellow-50 border-yellow-200",
            joinStatus === "approved" && "bg-blue-50 border-blue-200",
            joinStatus === "rejected" && "bg-red-50 border-red-200"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full flex-shrink-0",
                joinStatus === "none" && "bg-gray-400",
                joinStatus === "pending" && "bg-yellow-500 animate-pulse",
                joinStatus === "approved" && "bg-blue-500",
                joinStatus === "rejected" && "bg-red-500"
              )}></div>
              <div className="flex-1">
                <div className={cn(
                  "font-semibold text-sm",
                  joinStatus === "none" && "text-gray-700",
                  joinStatus === "pending" && "text-yellow-700",
                  joinStatus === "approved" && "text-blue-700",
                  joinStatus === "rejected" && "text-red-700"
                )}>
                  {joinStatus === "none" && "아직 신청하지 않았습니다"}
                  {joinStatus === "pending" && "승인 대기 중입니다"}
                  {joinStatus === "approved" && "참여 확정되었습니다"}
                  {joinStatus === "rejected" && "참여 신청이 거절되었습니다"}
                </div>
                {joinStatus === "pending" && (
                  <div className="text-xs text-yellow-600 mt-1">
                    작성자의 승인을 기다리고 있습니다
                  </div>
                )}
                {joinStatus === "approved" && (
                  <div className="text-xs text-blue-600 mt-1">
                    이제 채팅으로 작성자와 소통할 수 있습니다
                  </div>
                )}
                {joinStatus === "rejected" && (
                  <div className="text-xs text-red-600 mt-1">
                    다시 신청하시려면 "다시 참여하기" 버튼을 눌러주세요
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 인원수 & 진행률 */}
        {data.people && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-lg text-gray-900">
                    {/* 🔥 실제 참여자 수 표시 (데이터 정합성 보장) */}
                    {(() => {
                      // 🔥 실제 marketJoins 개수 사용 (joinList는 작성자만 구독)
                      const actualCount = isAuthor 
                        ? joinList.filter(j => j.status === "approved" || j.status === "pending").length
                        : (data.currentPeople || 0);
                      return `${actualCount} / ${data.people}명`;
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {isFull ? "모집 마감" : `${data.people - (data.currentPeople || 0)}명 남음`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{progress}%</div>
                <div className="text-xs text-gray-500">진행률</div>
              </div>
            </div>
            {/* 🔥 Progress Bar 컨테이너 (overflow 방지 + 균형잡힌 디자인) */}
            <div className="w-full overflow-hidden rounded-full bg-gray-200 h-2.5 shadow-inner">
              <div
                className="h-2.5 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"
                style={{ 
                  width: `${progress}%`,
                  maxWidth: "100%" // 🔥 100% 초과 방지
                }}
              />
            </div>
          </div>
        )}

        {/* 포지션 */}
        {data.position && data.position.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="w-5 h-5" />
              모집 포지션
            </h2>
            <div className="flex gap-2 flex-wrap">
              {data.position.map((pos) => (
                <span
                  key={pos}
                  className="px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg"
                >
                  {pos}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 실력 레벨 */}
        {data.level && (
          <div>
            <h2 className="font-semibold mb-2">실력 레벨</h2>
            <span
              className={cn(
                "inline-block px-3 py-1 text-sm font-medium rounded",
                data.level ? (LEVEL_COLORS[data.level] || LEVEL_COLORS.아마) : LEVEL_COLORS.아마
              )}
            >
              {LEVEL_LABELS[data.level] || data.level}
            </span>
          </div>
        )}

        {/* 연령대 */}
        {data.ageRange && (
          <div>
            <h2 className="font-semibold mb-1">연령대</h2>
            <p className="text-gray-700">{data.ageRange}세</p>
          </div>
        )}

        {/* 연습 정보 */}
        {(data.practiceDay || data.practiceLocation) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              연습 정보
            </h2>
            {data.practiceDay && (
              <p className="text-gray-700 mb-1">요일: {data.practiceDay.join(", ")}</p>
            )}
            {data.practiceLocation && (
              <p className="text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {data.practiceLocation}
              </p>
            )}
          </div>
        )}

        {/* 설명 */}
        {data.description && (
          <div className="pt-4 border-t">
            <h2 className="font-semibold mb-2">모집 설명</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{data.description}</p>
          </div>
        )}

        {user && canEnterChat && data.id && data.authorId && (
          <div className="pt-4 border-t">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              모집 단체방
            </h2>
            <p className="mb-3 text-xs text-gray-500">
              승인된 참여자와 작성자가 같은 방에서 소통합니다. 전체 채팅 화면은 아래 채팅하기로 이동할 수 있어요.
            </p>
            <RecruitChatPanel
              postId={data.id}
              authorId={data.authorId}
              title={data.title}
              snapshot={{
                title: data.title,
                images: data.images,
                imageUrl: data.images?.[0],
              }}
            />
          </div>
        )}

        {/* 🔥 작성자 전용: 참여자 리스트 (개선된 UX) */}
        {(() => {
          console.log("🎯 [RecruitDetail] 작성자 전용 섹션 렌더링 체크:", {
            isAuthor,
            joinListLength: joinList.length,
            pendingCount: joinList.filter(j => j.status === "pending").length,
            approvedCount: joinList.filter(j => j.status === "approved").length,
            willShowSection: isAuthor,
            willShowButtons: isAuthor && joinList.filter(j => j.status === "pending").length > 0,
          });
          return null;
        })()}
        {isAuthor && (
          <div id="join-list-section" className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                참여 신청 목록
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  총 {joinList.length}명
                </span>
                <span className="text-sm text-yellow-600 font-medium">
                  대기 {joinList.filter(j => j.status === "pending").length}명
                </span>
                <span className="text-sm text-green-600 font-medium">
                  승인 {joinList.filter(j => j.status === "approved").length}명
                </span>
              </div>
            </div>
            {joinList.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">아직 참여 신청이 없습니다.</p>
                <p className="text-gray-400 text-xs mt-1">참여 신청이 들어오면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {joinList.map((join) => {
                  // 🔥 안전 가드: join 객체 검증
                  if (!join || !join.id) {
                    console.warn("⚠️ [RecruitDetail] 유효하지 않은 join 객체:", join);
                    return null;
                  }
                  
                  // 🔥 안전한 상태 정규화
                  const joinStatusSafe = join.status || "pending";
                  
                  return (
                    <div
                      key={join.id}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all",
                        joinStatusSafe === "pending" && "bg-yellow-50 border-yellow-200",
                        joinStatusSafe === "approved" && "bg-green-50 border-green-200"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-gray-900">
                              {join.userName || "익명"}
                            </div>
                            {joinStatusSafe === "pending" && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full animate-pulse">
                                대기중
                              </span>
                            )}
                            {joinStatusSafe === "approved" && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                승인됨
                              </span>
                            )}
                          </div>
                          {join.position && (
                            <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              포지션: {join.position}
                            </div>
                          )}
                          {join.message && (
                            <div className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border border-gray-200">
                              {join.message}
                            </div>
                          )}
                          {join.createdAt && (
                            <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(join.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* 🔥 작성자 전용: pending 상태일 때 승인/거절/보류 버튼 표시 */}
                      {joinStatusSafe === "pending" && isAuthor && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            console.log("🔥 [RecruitDetail] 승인 버튼 클릭:", { joinId: join.id, isAuthor, postId: data.id });
                            handleApprove(join.id);
                          }}
                          disabled={processingJoinId === join.id || isFull}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all hover:bg-green-700 active:scale-95",
                            processingJoinId === join.id && "disabled:bg-gray-300",
                            isFull && "disabled:bg-gray-300 disabled:cursor-not-allowed"
                          )}
                        >
                          {processingJoinId === join.id ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              처리 중...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              승인
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            console.log("🔥 [RecruitDetail] 거절 버튼 클릭:", { joinId: join.id, isAuthor });
                            handleReject(join.id);
                          }}
                          disabled={processingJoinId === join.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:bg-gray-300 transition-all hover:bg-red-700 active:scale-95"
                        >
                          {processingJoinId === join.id ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              처리 중...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              거절
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            console.log("🔥 [RecruitDetail] 보류 버튼 클릭:", { joinId: join.id, isAuthor });
                            alert("보류 처리되었습니다.\n나중에 다시 확인하여 승인 또는 거절할 수 있습니다.");
                          }}
                          disabled={processingJoinId === join.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:bg-gray-300 transition-all hover:bg-yellow-600 active:scale-95"
                        >
                          {processingJoinId === join.id ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              처리 중...
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4" />
                              보류
                            </>
                          )}
                        </button>
                      </div>
                      )}
                      {joinStatusSafe === "approved" && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <Check className="w-4 h-4" />
                            <span>승인된 참여자입니다. 채팅으로 소통할 수 있습니다.</span>
                          </div>
                          {/* 🔥 작성자 전용: 승인 취소 버튼 */}
                          {isAuthor && (
                            <button
                              onClick={async () => {
                                if (!confirm("이 참여자의 승인을 취소하시겠습니까?\n인원수가 감소합니다.")) return;
                                
                                if (processingJoinId) return;
                                setProcessingJoinId(join.id);
                                
                                try {
                                  const { cancelApprovedJoin } = await import("../../services/marketJoinAutoCancel");
                                  // 🔥 작성자가 취소할 때는 작성자의 userId 전달
                                  await cancelApprovedJoin(join.id, data.id, user?.uid || "");
                                  alert("승인이 취소되었습니다.");
                                } catch (err: any) {
                                  console.error("❌ [RecruitDetail] 승인 취소 실패:", err);
                                  alert(err.message || "승인 취소에 실패했습니다.");
                                } finally {
                                  setProcessingJoinId(null);
                                }
                              }}
                              disabled={processingJoinId === join.id}
                              className="text-xs text-red-600 hover:text-red-800 underline disabled:text-gray-400"
                            >
                              {processingJoinId === join.id ? "처리 중..." : "승인 취소"}
                            </button>
                          )}
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>


      {/* 🔥 하단 고정 CTA (안전 버전 - joinData 직접 참조 금지) */}
      {(() => {
        // 🔥 CTA 표시 조건 통합 계산
        const canShowCTA = !!user && isDefinitelyUser && !loading;
        
        // 🔥 안전한 상태 정규화 (joinData 직접 참조 금지, joinStatus state만 사용)
        const normalizedStatus = joinStatus || "none";
        
        // 🔥 디버깅 로그 (개발 모드에서만)
        devLog("🔥 [RecruitDetail] CTA CHECK", {
          user: !!user,
          userUid: user?.uid,
          isDefinitelyUser,
          isAuthor,
          loading,
          joinStatus: normalizedStatus,
          status: data.status,
          normalizedStatus,
          isClosed,
          isFull,
          currentPeople: data.currentPeople,
          people: data.people,
          actualCurrentPeople,
          canShowCTA,
          조건분해: {
            "!!user": !!user,
            "isDefinitelyUser": isDefinitelyUser,
            "!loading": !loading,
            "최종": canShowCTA,
          },
        });
        
        if (!canShowCTA) return null;
        
        // 🔥 안전한 CTA 렌더링 함수 (joinData 참조 완전 차단)
        const renderCTA = () => {
          // 케이스 1: 모집 마감/종료 (신규 참여 차단, 채팅은 유지)
          if (isClosed || isFull) {
            // 🔥 마감된 경우: 승인된 사용자는 채팅 가능, 신규 참여만 차단
            if (normalizedStatus === "approved") {
              return (
                <button
                  onClick={handleChat}
                  className="w-full py-3 rounded-xl bg-green-600 text-white font-medium transition-all hover:bg-green-700 active:scale-95 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  채팅하기
                </button>
              );
            }
            
            // 🔥 마감 + 승인 안 됨: 채팅 불가
            return (
              <button disabled className="w-full py-3 rounded-xl bg-gray-200 text-gray-500 font-medium">
                모집 마감
              </button>
            );
          }
          
          // 케이스 2: 미신청 / 거절됨 → 재신청 가능
          if (normalizedStatus === "none" || normalizedStatus === "rejected") {
            return (
              <div className="flex gap-2">
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium disabled:bg-gray-300 transition-all hover:bg-blue-700 active:scale-95"
                >
                  {joining ? "신청 중..." : "참여 신청하기"}
                </button>
                {/* 🔥 승인 전 사용자는 문의하기 버튼 숨김 (정책 변경) */}
              </div>
            );
          }
          
          // 케이스 3: 대기중
          if (normalizedStatus === "pending") {
            return (
              <div className="flex gap-2">
                <button
                  disabled
                  className="flex-1 bg-gray-400 text-white rounded-xl py-3 font-medium cursor-default flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  승인 대기중
                </button>
                {/* 🔥 승인 전 사용자는 문의하기 버튼 숨김 (정책 변경) */}
              </div>
            );
          }
          
          // 케이스 4: 승인됨 → 채팅하기 버튼 표시
          if (normalizedStatus === "approved") {
            return (
              <button
                onClick={handleChat}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-medium transition-all hover:bg-green-700 active:scale-95 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                채팅하기
              </button>
            );
          }
          
          // 케이스 5: 기본값 (안전 fallback)
          return (
            <div className="flex gap-2">
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium disabled:bg-gray-300 transition-all hover:bg-blue-700 active:scale-95"
              >
                {joining ? "신청 중..." : "참여 신청하기"}
              </button>
              <button
                onClick={handleChat}
                disabled={!canChat}
                className="w-24 border border-gray-300 rounded-xl py-3 font-medium disabled:bg-gray-100 disabled:text-gray-400 transition-all hover:bg-gray-50"
              >
                문의하기
              </button>
            </div>
          );
        };
        
        return (
          <div 
            className="fixed left-0 right-0 bg-white border-t shadow-lg"
            style={{
              bottom: '64px',
              zIndex: 10001,
            }}
          >
            <div className="max-w-[760px] mx-auto p-3">
              {renderCTA()}
            </div>
          </div>
        );
      })()}

      {/* 🔥 작성자 전용: 하단 관리 패널 (대기 신청 알림) */}
      {isAuthor && !loading && joinList.filter(j => j.status === "pending").length > 0 && (
        <div 
          className="fixed left-0 right-0 bg-yellow-50 border-t-2 border-yellow-200 p-4 shadow-lg z-[10001]"
          style={{
            bottom: '64px', // BottomNav 높이만큼 위로
          }}
        >
          <div className="max-w-[760px] mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <p className="text-sm font-semibold text-yellow-800">
                  참여 신청 {joinList.filter(j => j.status === "pending").length}건 대기 중
                </p>
              </div>
              <button
                onClick={() => {
                  // 참여자 리스트 섹션으로 스크롤
                  const element = document.getElementById("join-list-section");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="text-sm font-medium text-yellow-700 hover:text-yellow-900 underline"
              >
                확인하기
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔥 로딩 스켈레톤 (깜빡임 방지) */}
      {loading && (
        <div 
          className="fixed left-0 right-0 bg-white border-t shadow-lg"
          style={{
            bottom: '64px',
            zIndex: 10001,
          }}
        >
          <div className="max-w-[760px] mx-auto p-3">
            <div className="flex gap-2">
              <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="w-24 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
