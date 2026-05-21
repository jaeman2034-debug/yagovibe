/**
 * 🔥 팀 모집 폼 (recruit)
 */

import { useState, useRef, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageUploader from "@/components/market/ImageUploader";
import type { ImagePipelineResult } from "@/utils/imagePipeline";
import type { Sport } from "../types";

interface RecruitFormProps {
  sport: Sport; // 🔥 종목 선택
  onSuccess: (postId?: string) => void; // 🔥 postId 전달 가능
}

const POSITIONS = ["FW", "MF", "DF", "GK"] as const;
const LEVELS = ["입문", "아마", "프로지향"] as const;

export default function RecruitForm({ sport, onSuccess }: RecruitFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState("");
  const [currentPeople, setCurrentPeople] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [level, setLevel] = useState<"입문" | "아마" | "프로지향">("아마");
  const [ageRange, setAgeRange] = useState("");
  const [practiceDay, setPracticeDay] = useState("");
  const [practiceLocation, setPracticeLocation] = useState("");
  const [images, setImages] = useState<ImagePipelineResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 카테고리별 기본 템플릿 자동 입력 (초기 로드 시)
  useEffect(() => {
    if (!description.trim()) {
      const template = "팀원 모집에 대한 자세한 정보를 적어주세요.\n\n• 모집 포지션\n• 실력 레벨\n• 연령대\n• 연습 일정\n• 연습 장소\n\n추가로 궁금한 점이 있으시면 채팅으로 문의해주세요!";
      setDescription(template);
    }
  }, [description]);

  // 🔥 이미지 변경 핸들러 (ImageUploader에서 호출)
  const handleImagesChange = (newImages: ImagePipelineResult[]) => {
    setImages(newImages);
  };

  const togglePosition = (position: string) => {
    setSelectedPositions((prev) =>
      prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 검증
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (title.trim().length < 3) {
      setError("제목은 최소 3자 이상 입력해주세요.");
      return;
    }

    if (!people || isNaN(Number(people)) || Number(people) <= 0) {
      setError("모집 인원수를 입력해주세요.");
      return;
    }

    // 🔥 설명은 선택사항이지만, 입력했다면 최소 10자 이상 (빈 값은 통과)
    if (description.trim() && description.trim().length > 0 && description.trim().length < 10) {
      setError("설명은 최소 10자 이상 입력해주세요.");
      return;
    }

    if (!auth.currentUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    setSaving(true);

    try {
      // 🔥 이미지 URL 추출 (이미 파이프라인에서 업로드 완료)
      const imageUrls = images.map((img) => img.originalUrl);

      // Firestore에 저장
      const postDataRaw = {
        sport, // 🔥 선택한 종목 저장
        category: "recruit",
        type: "used", // 🔥 거래 유형: 중고거래 (MarketPage 필터링용, 모집은 기본적으로 중고거래로 분류)
        title: title.trim(),
        description: description.trim() || undefined,
        people: Number(people),
        currentPeople: currentPeople ? Number(currentPeople) : 0,
        position: selectedPositions.length > 0 ? selectedPositions : undefined,
        level,
        ageRange: ageRange.trim() || undefined,
        practiceDay: practiceDay.trim() ? [practiceDay.trim()] : undefined,
        practiceLocation: practiceLocation.trim() || undefined,
        images: imageUrls,
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
      const validation = validateRequiredFields(postDataRaw, ["title", "people", "sport", "images"]);
      if (!validation.valid) {
        throw new Error(validation.message || "필수 필드가 누락되었습니다.");
      }
      const postData = cleanFirestoreData(postDataRaw);

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
        ...postData,
        ...(isFirstPost && {
          boostActive: true,
          boostWeight: 1.5, // 첫 글은 1.5배 부스트
          boostEndTime: boostEndTime ? { seconds: Math.floor(boostEndTime.getTime() / 1000), nanoseconds: 0 } : null,
          boostChatCount: 0,
        }),
      };

      const docRef = await addDoc(collection(db, "market"), postDataWithBoost);
      console.log("✅ [RecruitForm] market saved:", docRef.id);
      
      // 🔥 recruitPosts 컬렉션에도 동기화 (랭킹 시스템용)
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "recruitPosts", docRef.id), {
          ...postDataWithBoost,
          id: docRef.id,
        });
        console.log("✅ [RecruitForm] recruitPosts 동기화 완료:", docRef.id);
      } catch (err) {
        console.warn("⚠️ [RecruitForm] recruitPosts 동기화 실패 (무시):", err);
      }

      // 🔥 marketPosts 통합 읽기 모델 (종목 마켓 리스트·정렬)
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { withMarketPostsIndexDefaults } = await import("@/utils/marketPostsIndexDefaults");
        await setDoc(
          doc(db, "marketPosts", docRef.id),
          withMarketPostsIndexDefaults({
            ...postDataWithBoost,
            id: docRef.id,
            price: 0,
          } as Record<string, unknown>)
        );
        console.log("✅ [RecruitForm] marketPosts 동기화 완료:", docRef.id);
      } catch (err) {
        console.warn("⚠️ [RecruitForm] marketPosts 동기화 실패 (무시):", err);
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
      //     summary: people ? `모집 인원: ${people}명` : undefined,
      //     refId: docRef.id,
      //     sourceId: docRef.id,
      //     sourceType: "marketPosts",
      //     category: "recruit",
      //     thumbnail: imageUrls[0] || undefined,
      //     createdAt: serverTimestamp(),
      //   };
      //   const activityLogRef = await addDoc(collection(db, "activityLogs"), activityLogData);
      //   console.log("✅ [RecruitForm] Activity 로그 생성 완료:", {
      //     activityLogId: activityLogRef.id,
      //     marketPostId: docRef.id,
      //     userId: auth.currentUser.uid,
      //   });
      // } catch (err: any) {
      //   console.error("❌ [RecruitForm] Activity 로그 생성 실패:", {
      //     error: err,
      //     code: err?.code,
      //     message: err?.message,
      //     marketPostId: docRef.id,
      //     userId: auth.currentUser.uid,
      //   });
      // }

      // 🔥 activities 컬렉션에 Activity 생성 (ActivityFeed 표시용)
      console.log("🔥 [RecruitForm] creating activity...", { marketId: docRef.id, sport });
      try {
        const { auth } = await import("@/lib/firebase");
        const user = auth.currentUser;
        if (!user) {
          console.warn("⚠️ [RecruitForm] 사용자 정보 없음 - activity 생성 스킵");
        } else {
          const { createTeamRecruitActivity } = await import("@/services/activity/activityFactory");
          const activityId = await createTeamRecruitActivity({
            recruitId: docRef.id,
            authorId: user.uid,
            teamName: title.trim(),
            position: selectedPositions,
            slots: Number(people),
            description: description.trim(),
            thumbnailUrl: imageUrls[0],
            sport: sport?.toLowerCase().trim() || "soccer",
          });
          console.log("🔥 [RecruitForm] activity created:", {
            activityId,
            marketPostId: docRef.id,
          });
        }
      } catch (err: any) {
        console.error("❌ [RecruitForm] activities 생성 실패:", {
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
              console.log("✅ [RecruitForm] 첫 글 작성 badge 추가 완료");
            }
          }
        } catch (badgeError) {
          console.warn("⚠️ [RecruitForm] badge 추가 실패 (무시):", badgeError);
        }
      }

      // 🔥 성공 - 로그 전송은 실패해도 등록 흐름을 막지 않음
      try {
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "market_post_created", {
            category: "recruit",
            sport, // 🔥 선택한 종목 저장
          });
        }
      } catch (logError) {
        console.warn("⚠️ [RecruitForm] 로그 전송 실패 (등록은 성공):", logError);
      }

      // 🔥 성공 - 상세 페이지로 이동
      onSuccess(docRef.id);
    } catch (err: any) {
      console.error("❌ [RecruitForm] 저장 실패:", err);
      setError("글 작성 중 오류가 발생했습니다. 다시 시도해주세요.");
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
          제목 * <span className="text-xs text-gray-500">(팀명 또는 모집 포지션을 포함해주세요)</span>
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 축구 팀원 모집합니다 (FW, MF 필요)"
          disabled={saving}
          required
        />
      </div>

      {/* 모집 인원수 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          모집 인원수 *
        </label>
        <Input
          type="number"
          value={people}
          onChange={(e) => setPeople(e.target.value)}
          placeholder="예: 5"
          disabled={saving}
          required
        />
      </div>

      {/* 현재 인원수 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          현재 인원수
        </label>
        <Input
          type="number"
          value={currentPeople}
          onChange={(e) => setCurrentPeople(e.target.value)}
          placeholder="예: 2"
          disabled={saving}
        />
      </div>

      {/* 포지션 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          모집 포지션
        </label>
        <div className="flex gap-2 flex-wrap">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => togglePosition(pos)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPositions.includes(pos)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              disabled={saving}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* 실력 레벨 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          실력 레벨
        </label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        >
          {LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      </div>

      {/* 연령대 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          연령대
        </label>
        <Input
          value={ageRange}
          onChange={(e) => setAgeRange(e.target.value)}
          placeholder="예: 20-30"
          disabled={saving}
        />
      </div>

      {/* 연습 요일 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          연습 요일
        </label>
        <Input
          value={practiceDay}
          onChange={(e) => setPracticeDay(e.target.value)}
          placeholder="예: 토요일 오후"
          disabled={saving}
        />
      </div>

      {/* 연습 장소 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          연습 장소
        </label>
        <Input
          value={practiceLocation}
          onChange={(e) => setPracticeLocation(e.target.value)}
          placeholder="예: 서울 노원구 풋살장"
          disabled={saving}
        />
      </div>

      {/* 설명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          모집 설명
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="팀 소개, 모집 조건, 연락 방법 등을 자세히 적어주세요"
          disabled={saving}
        />
      </div>

      {/* 🔥 이미지 업로더 (최소 1장 강제, 3장 권장) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          팀 이미지 <span className="text-red-500">*</span>
        </label>
        <ImageUploader
          minImages={1}
          maxImages={5}
          recommendedImages={3}
          onImagesChange={handleImagesChange}
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
