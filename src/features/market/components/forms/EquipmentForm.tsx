/**
 * 🔥 중고 거래 폼 (equipment)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadMarketImage } from "@/lib/uploadImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageUploadStrip from "@/components/market/ImageUploadStrip";
import { processImagePipeline, type ImagePipelineResult } from "@/utils/imagePipeline";
import { useImageRecommendation } from "@/hooks/useImageRecommendation";
import type { Sport } from "../types";
import {
  saveMarketDraft,
  getMarketDraft,
  deleteMarketDraft,
  extractDraftImages,
  type MarketDraft,
} from "@/services/marketDraftService";

interface EquipmentFormProps {
  sport: Sport; // 🔥 종목 선택
  onSuccess: () => void;
  initialDraft?: MarketDraft | null; // 🔥 이어쓰기용 초기 draft
}

interface FormErrors {
  title?: string;
  price?: string;
  description?: string;
  image?: string;
}

export default function EquipmentForm({
  sport,
  onSuccess,
  initialDraft,
}: EquipmentFormProps) {
  // 🔥 초기값: draft가 있으면 draft에서, 없으면 빈 값
  const [title, setTitle] = useState(initialDraft?.title || "");
  const [price, setPrice] = useState(initialDraft?.price || "");
  const [description, setDescription] = useState(initialDraft?.description || "");
  const [condition, setCondition] = useState<"new" | "like_new" | "used" | "poor">(
    initialDraft?.condition || "used"
  );
  const [brand, setBrand] = useState(initialDraft?.brand || "");
  const [location, setLocation] = useState(initialDraft?.location || "");
  const [images, setImages] = useState<ImagePipelineResult[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0); // 🔥 대표사진 인덱스
  const [priceGuide, setPriceGuide] = useState<{ min: number; max: number; recommended: number } | null>(null); // 🔥 AI 가격 가이드
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  
  // 🔥 AI 추천 훅
  const { recommend, loading: recommending } = useImageRecommendation();
  
  // ✨ 간단 AI 문장 생성기 (임시): 현재 입력값을 조합해 자연어 문장으로 구성
  const generateAiDescription = () => {
    const parts: string[] = [];
    if (brand) parts.push(`${brand} 제품`);
    if (condition === "new") parts.push("미개봉 새 상품");
    if (condition === "like_new") parts.push("거의 새것 컨디션");
    if (condition === "used") parts.push("일반적인 사용감");
    if (condition === "poor") parts.push("사용감 있으며 하자 있을 수 있음");
    if (price) parts.push(`가격은 ${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원입니다`);
    const text =
      parts.length > 0
        ? `안녕하세요! ${parts.join(" · ")}. 상세 상태와 사용 기간, 직거래 가능 지역을 알려주세요. 🙂`
        : "안녕하세요! 상세 상태와 사용 기간, 직거래 가능 지역을 자유롭게 적어주세요. 🙂";
    setDescription((prev) => (prev && prev.trim().length > 0 ? `${prev}\n${text}` : text));
  };
  
  // 🔥 Draft에서 이미지 복원 (초기 로드 시)
  useEffect(() => {
    if (initialDraft?.images && initialDraft.images.length > 0) {
      // 이미지 URL을 ImagePipelineResult 형식으로 변환
      const restoredImages: ImagePipelineResult[] = initialDraft.images.map((url) => ({
        originalUrl: url,
        thumbnailUrl: url,
        quality: { score: 100, warnings: [], suggestions: [] },
        metadata: {
          width: 0,
          height: 0,
          size: 0,
          compressedSize: 0,
          compressionRatio: 0,
        },
      }));
      setImages(restoredImages);
      setImagePreviews(initialDraft.images);
    }
  }, [initialDraft]);

  // 🔥 카테고리별 기본 템플릿 자동 입력 (초기 로드 시, draft가 없을 때만)
  useEffect(() => {
    if (!initialDraft && !description.trim()) {
      const template = "상품 상태를 자세히 적어주세요.\n\n• 구매 시기\n• 사용 빈도\n• 하자 여부\n• 교환/환불 가능 여부\n\n추가로 궁금한 점이 있으시면 채팅으로 문의해주세요!";
      setDescription(template);
    }
  }, [initialDraft, description]);
  
  // 🔥 Draft 자동 저장 (debounce 1초)
  const saveDraftDebounced = useRef<NodeJS.Timeout | null>(null);
  
  const saveDraft = useCallback(() => {
    if (!auth.currentUser?.uid) return;
    
    // 이전 타이머 취소
    if (saveDraftDebounced.current) {
      clearTimeout(saveDraftDebounced.current);
    }
    
    // 1초 후 저장
    saveDraftDebounced.current = setTimeout(() => {
      const draftData: Partial<MarketDraft> = {
        title,
        price,
        description,
        condition,
        brand,
        location,
        images: extractDraftImages(images), // 업로드된 이미지 URL만 저장
      };
      
      saveMarketDraft(auth.currentUser!.uid, sport, "equipment", draftData);
    }, 1000);
  }, [title, price, description, condition, brand, location, images, sport]);
  
  // 🔥 입력 변경 시 draft 저장
  useEffect(() => {
    saveDraft();
  }, [title, price, description, condition, brand, location, images, saveDraft]);
  
  // 🔥 페이지 이탈 시 draft 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (auth.currentUser?.uid) {
        const draftData: Partial<MarketDraft> = {
          title,
          price,
          description,
          condition,
          brand,
          location,
          images: extractDraftImages(images),
        };
        saveMarketDraft(auth.currentUser.uid, sport, "equipment", draftData);
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveDraftDebounced.current) {
        clearTimeout(saveDraftDebounced.current);
      }
    };
  }, [title, price, description, condition, brand, location, images, sport]);

  // 실시간 검증
  const validateField = (field: keyof FormErrors, value: string) => {
    const errors: FormErrors = { ...fieldErrors };
    
    switch (field) {
      case "title":
        if (!value.trim()) {
          errors.title = "제목을 입력해주세요.";
        } else if (value.trim().length < 3) {
          errors.title = "제목은 최소 3자 이상 입력해주세요.";
        } else {
          delete errors.title;
        }
        break;
      case "price":
        if (!value.trim()) {
          errors.price = "가격을 입력해주세요.";
        } else if (isNaN(Number(value)) || Number(value) <= 0) {
          errors.price = "올바른 가격을 입력해주세요.";
        } else {
          delete errors.price;
        }
        break;
      case "description":
        // 🔥 설명은 완전히 선택사항 (입력하지 않아도 OK)
        // 10자 미만이어도 에러로 표시하지 않음 (경고만)
        delete errors.description;
        break;
    }
    
    setFieldErrors(errors);
  };

  // 🔥 이미지 변경 핸들러 (먼저꺼 레이아웃: 가로 스트립)
  const handleStripSelect = async (files: File[], previews: string[]) => {
    try {
      // 업로드 파이프라인 적용 (품질 분석은 기본 옵션 유지)
      const processed = await Promise.all(
        files.map((f) => processImagePipeline(f, (auth.currentUser as any)?.uid || "anon", { analyzeQuality: false }))
      );
      const merged = [...images, ...processed].slice(0, 5);
      setImages(merged);
      setImagePreviews((prev) => [...prev, ...previews].slice(0, 5));
      
      if (merged.length === 0) {
        setFieldErrors((prev) => ({ ...prev, image: "최소 1장의 이미지가 필요합니다." }));
      } else {
        setFieldErrors((prev) => {
          const { image, ...rest } = prev;
          return rest;
        });
      }
      
      // 첫 이미지 기반 AI 추천
      if (merged.length > 0 && !title.trim()) {
        try {
          const quality = merged[0].quality;
          const recommendation = await recommend(merged[0].originalUrl, {
            score: quality.score,
            detectedObjects: quality.warnings.length > 0 ? [] : undefined,
          });
          if (recommendation) {
            if (recommendation.title && !title.trim()) setTitle(recommendation.title);
            if (recommendation.suggestedPrice) setPriceGuide(recommendation.suggestedPrice);
          }
        } catch (err) {
          console.warn("⚠️ AI 추천 실패 (무시):", err);
        }
      }
    } catch (e) {
      console.error("❌ 이미지 처리 실패:", e);
      setFieldErrors((prev) => ({ ...prev, image: "이미지 업로드에 실패했습니다." }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // 전체 검증
    const errors: FormErrors = {};
    
    if (!title.trim()) {
      errors.title = "제목을 입력해주세요.";
    } else if (title.trim().length < 3) {
      errors.title = "제목은 최소 3자 이상 입력해주세요.";
    }

    if (!price.trim()) {
      errors.price = "가격을 입력해주세요.";
    } else if (isNaN(Number(price)) || Number(price) <= 0) {
      errors.price = "올바른 가격을 입력해주세요.";
    }

    // 🔥 설명은 완전히 선택사항 (입력하지 않아도 OK, 입력했다면 10자 이상 권장)
    // 10자 미만이어도 제출은 가능하지만 경고만 표시
    if (description.trim().length > 0 && description.trim().length < 10) {
      // 경고만 표시하고 제출은 허용
      console.warn("⚠️ 설명이 10자 미만입니다. 더 자세한 설명을 권장합니다.");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("입력 정보를 확인해주세요.");
      return;
    }

    if (!auth.currentUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    if (images.length === 0) {
      setFieldErrors({ image: "최소 1장의 이미지가 필요합니다." });
      return;
    }

    setSaving(true);

    try {
      // 🔥 이미지 URL 추출 (이미 파이프라인에서 업로드 완료)
      const imageUrls = images.map((img) => img.originalUrl);
      const primaryImageUrl = images[primaryImageIndex]?.originalUrl || imageUrls[0]; // 🔥 대표사진

      // Firestore에 저장
      const postDataRaw = {
        sport, // 🔥 선택한 종목 저장
        category: "equipment",
        type: "used", // 🔥 거래 유형: 중고거래 (MarketPage 필터링용)
        title: title.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        condition,
        brand: brand.trim() || undefined,
        location: location.trim() || undefined,
        images: imageUrls,
        imageUrl: primaryImageUrl, // 🔥 대표사진 (하위 호환)
        primaryImageIndex, // 🔥 대표사진 인덱스
        status: "active", // 🔥 기본값: active
        createdAt: serverTimestamp(),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || undefined,
        // 🔥 랭킹 필드 초기화
        views: 0,
        likesCount: 0,
        chatCount: 0,
        rankScore: 0,
      };

      // 🔥 undefined 값 제거 (Firestore 저장 전 필수)
      const { cleanFirestoreData, validateRequiredFields } = await import("@/utils/firestoreHelpers");
      const validation = validateRequiredFields(postDataRaw, ["title", "price", "sport", "images"]);
      if (!validation.valid) {
        throw new Error(validation.message || "필수 필드가 누락되었습니다.");
      }
      const postData = cleanFirestoreData(postDataRaw);
      
      // ✅ 필수 기본값 강제 정규화 (목록 필터와 100% 일치)
      const normalizedPostData = {
        ...postData,
        status: (postData as any)?.status ?? "active",
        sport: sport, // URL/선택 기반 종목으로 강제
        category: "equipment" as const,
      };
      console.log("🔥 [EquipmentForm] 저장 직전 데이터(정규화):", normalizedPostData);

      // 🔥 GeoHash 자동 추가 (위치 기반 쿼리 최적화)
      const { addGeohashToProduct } = await import("@/utils/geoQuery");
      const postDataWithGeohash = addGeohashToProduct(normalizedPostData);

      // 🔥 첫 글 작성 여부 확인 (등록 전에 확인)
      const { query, where, getDocs } = await import("firebase/firestore");
      const userPostsQuery = query(
        collection(db, "market"),
        where("authorId", "==", auth.currentUser.uid)
      );
      const existingPosts = await getDocs(userPostsQuery);
      const isFirstPost = existingPosts.empty;

      // 🔥 첫 글인 경우 24시간 피드 부스트 적용
      const now = new Date();
      const boostEndTime = isFirstPost 
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24시간 후
        : null;

      const postDataWithBoost = {
        ...postDataWithGeohash,
        ...(isFirstPost && {
          boostActive: true,
          boostWeight: 1.5, // 첫 글은 1.5배 부스트
          boostEndTime: boostEndTime ? { seconds: Math.floor(boostEndTime.getTime() / 1000), nanoseconds: 0 } : null,
          boostChatCount: 0,
        }),
      };

      const docRef = await addDoc(collection(db, "market"), postDataWithBoost);
      console.log("✅ [EquipmentForm] market saved:", docRef.id);
      
      // 🔥 marketPosts 컬렉션에도 동기화 (랭킹 시스템용)
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { withMarketPostsIndexDefaults } = await import("@/utils/marketPostsIndexDefaults");
        await setDoc(
          doc(db, "marketPosts", docRef.id),
          withMarketPostsIndexDefaults({
            ...postDataWithBoost,
            id: docRef.id,
          } as Record<string, unknown>)
        );
        console.log("✅ [EquipmentForm] SYNC SUCCESS → marketPosts/", docRef.id);
      } catch (err) {
        console.error("❌ [EquipmentForm] SYNC ERROR (setDoc to marketPosts):", err);
        // 🔥 안전망: setDoc이 규칙/권한 등으로 실패 시 addDoc으로 직접 생성
        try {
          const { withMarketPostsIndexDefaults } = await import("@/utils/marketPostsIndexDefaults");
          const created = await addDoc(collection(db, "marketPosts"), {
            ...withMarketPostsIndexDefaults({
              ...postDataWithBoost,
              id: docRef.id,
              syncFallback: true,
            } as Record<string, unknown>),
          });
          console.log("✅ [EquipmentForm] Fallback addDoc → marketPosts/", created.id);
        } catch (fallbackErr) {
          console.error("❌ [EquipmentForm] Fallback addDoc 실패:", fallbackErr);
        }
      }

      // ⚠️ [DEPRECATED] activityLogs 생성 - v1 아키텍처 전환 중
      // 🔥 activityLogs는 더 이상 사용하지 않음 (activities로 통합)
      // try {
      //   const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      //   const { db } = await import("@/lib/firebase");
      //   const activityLogData = {
      //     type: "market",
      //     action: "upload",
      //     userId: auth.currentUser.uid,
      //     authorId: auth.currentUser.uid,
      //     sport,
      //     title: title.trim(),
      //     price: price || null,
      //     summary: price ? `${price.toLocaleString()}원` : undefined,
      //     refId: docRef.id,
      //     sourceId: docRef.id,
      //     sourceType: "marketPosts",
      //     category: "equipment",
      //     thumbnail: imageUrls[0] || undefined,
      //     createdAt: serverTimestamp(),
      //   };
      //   const activityLogRef = await addDoc(collection(db, "activityLogs"), activityLogData);
      //   console.log("✅ [EquipmentForm] Activity 로그 생성 완료:", {
      //     activityLogId: activityLogRef.id,
      //     marketPostId: docRef.id,
      //     userId: auth.currentUser.uid,
      //   });
      // } catch (err: any) {
      //   console.error("❌ [EquipmentForm] Activity 로그 생성 실패:", {
      //     error: err,
      //     code: err?.code,
      //     message: err?.message,
      //     marketPostId: docRef.id,
      //     userId: auth.currentUser.uid,
      //   });
      // }

      // 🔥 activities 단일 피드 (ActivityFactory)
      console.log("🔥 [EquipmentForm] creating activity...", { marketId: docRef.id, sport });
      try {
        const { auth } = await import("@/lib/firebase");
        const user = auth.currentUser;
        if (!user) {
          console.warn("⚠️ [EquipmentForm] 사용자 정보 없음 - activity 생성 스킵");
        } else {
          const { createEquipmentActivity } = await import("@/services/activity/activityFactory");
          const activityId = await createEquipmentActivity({
            postId: docRef.id,
            authorId: user.uid,
            title: title.trim(),
            description: description?.trim(),
            price: price ?? undefined,
            thumbnailUrl: imageUrls[0],
            sport: sport?.toLowerCase().trim() || "soccer",
          });
          console.log("🔥 [EquipmentForm] activity created:", {
            activityId,
            marketPostId: docRef.id,
          });
        }
      } catch (err: any) {
        console.error("❌ [EquipmentForm] activities 생성 실패:", {
          error: err,
          code: err?.code,
          message: err?.message,
          marketPostId: docRef.id,
        });
        // 🔥 activities 실패해도 업로드는 성공으로 처리
      }

      // 🔥 첫 글 작성 보상: badge 추가
      if (isFirstPost && auth.currentUser?.uid) {
        try {
          const { doc: getDoc, updateDoc, arrayUnion } = await import("firebase/firestore");
          const userRef = doc(db, "users", auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentBadges = userData.badges || [];
            
            if (!currentBadges.includes("first_post")) {
              await updateDoc(userRef, {
                badges: arrayUnion("first_post"),
              });
              console.log("✅ [EquipmentForm] 첫 글 작성 badge 추가 완료");
            }
          }
        } catch (badgeError) {
          console.warn("⚠️ [EquipmentForm] badge 추가 실패 (무시):", badgeError);
        }
      }

      // 🔥 성공 - 로그 전송은 실패해도 등록 흐름을 막지 않음
      try {
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "market_post_created", {
            category: "equipment",
            sport: "soccer",
          });
        }
      } catch (logError) {
        console.warn("⚠️ [EquipmentForm] 로그 전송 실패 (등록은 성공):", logError);
      }

      // 신뢰·리스크 스냅샷: Cloud Functions `onMarketWriteTrustRisk` (market 문서 생성 시)

      // 🔥 Draft 삭제 (등록 성공 시)
      if (auth.currentUser?.uid) {
        deleteMarketDraft(auth.currentUser.uid, sport, "equipment");
      }
      
      // 🔥 성공 - 상세 페이지로 이동
      onSuccess(docRef.id);
    } catch (err: any) {
      console.error("❌ [EquipmentForm] 저장 실패:", err);
      
      // 🔥 에러 메시지 개선
      let errorMessage = "글 작성 중 오류가 발생했습니다. 다시 시도해주세요.";
      if (err.code === "permission-denied") {
        errorMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          제목 * <span className="text-xs text-gray-500">(축구 장비명을 포함해주세요)</span>
          {recommending && (
            <span className="ml-2 text-xs text-blue-600">🤖 AI 추천 중...</span>
          )}
        </label>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            validateField("title", e.target.value);
          }}
          onBlur={(e) => validateField("title", e.target.value)}
          placeholder="예: 나이키 축구화 판매합니다"
          disabled={saving || recommending}
          className={fieldErrors.title ? "border-red-500" : ""}
          required
        />
        {fieldErrors.title && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
        )}
      </div>

      {/* 가격 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          가격 *
        </label>
        <Input
          type="number"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            validateField("price", e.target.value);
          }}
          onBlur={(e) => validateField("price", e.target.value)}
          placeholder="예: 50000"
          disabled={saving || recommending}
          className={fieldErrors.price ? "border-red-500" : ""}
          required
        />
        {fieldErrors.price && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.price}</p>
        )}
        {/* 🔥 AI 가격 가이드 */}
        {priceGuide && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">
              💡 유사 매물 가격 가이드
            </p>
            <p className="text-xs text-blue-700">
              최저: {priceGuide.min.toLocaleString()}원 | 
              최고: {priceGuide.max.toLocaleString()}원 | 
              추천: <span className="font-semibold">{priceGuide.recommended.toLocaleString()}원</span>
            </p>
            <button
              type="button"
              onClick={() => setPrice(priceGuide.recommended.toString())}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              추천 가격으로 설정
            </button>
          </div>
        )}
      </div>

      {/* 상태 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          상태 *
        </label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        >
          <option value="new">새상품</option>
          <option value="like_new">거의 새것</option>
          <option value="used">중고</option>
          <option value="poor">하자있음</option>
        </select>
      </div>

      {/* 브랜드 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          브랜드
        </label>
        <Input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="예: 나이키, 아디다스"
          disabled={saving}
        />
      </div>

      {/* 위치 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          거래 희망 지역
        </label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="예: 서울 노원구"
          disabled={saving}
        />
      </div>

      {/* 설명 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            상품 설명{" "}
            {description.trim() && (
              <span className="text-xs text-gray-500">
                ({description.trim().length}자)
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={generateAiDescription}
            className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            disabled={saving}
            aria-label="AI로 설명 작성"
            title="AI로 설명 작성"
          >
            ✨ AI로 작성
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            validateField("description", e.target.value);
          }}
          onBlur={(e) => validateField("description", e.target.value)}
          rows={5}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.description ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="상품 상태, 사용 기간, 하자 여부, 직거래 가능 지역 등을 자유롭게 적어주세요 🙂"
          disabled={saving}
        />
        {fieldErrors.description && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
        )}
        {description.trim().length > 0 && description.trim().length < 10 && (
          <p className="mt-1 text-sm text-amber-600">
            💡 더 자세한 설명을 입력하시면 거래가 더 원활해집니다. (권장: 10자 이상)
          </p>
        )}
      </div>

      {/* 🔥 이미지 업로더 (먼저꺼 레이아웃: 가로 스트립) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          상품 이미지 <span className="text-red-500">*</span>
        </label>
        {fieldErrors.image && (
          <p className="text-sm text-red-600 mb-2">{fieldErrors.image}</p>
        )}
        <ImageUploadStrip
          onSelect={handleStripSelect}
          previews={imagePreviews}
          disabled={saving}
        />
      </div>

      {/* 🔥 등록 전 안내 문구 */}
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800 font-medium">
          💡 이 글은 지금 근처 사용자들에게 노출됩니다
        </p>
      </div>

      {/* 제출 버튼 */}
      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={saving}
      >
        {saving ? "저장 중..." : "등록하기"}
      </Button>
    </form>
  );
}
