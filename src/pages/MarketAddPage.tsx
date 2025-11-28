import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { uploadMarketImage } from "@/lib/uploadImage";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User } from "firebase/auth";
import imageCompression from "browser-image-compression";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, Sparkles, Mic } from "lucide-react";
import { testFirestoreConnection } from "@/testFirestoreConnection";
import { FUNCTIONS_ORIGIN, TAGS_FUNCTION_ORIGIN, SEARCH_META_FUNCTION_ORIGIN, ANALYZE_PRODUCT_ENDPOINT } from "@/config/env";

export default function MarketAddPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id; // 수정 모드 여부
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // 일반 로딩 (기타 함수용)
  const [analyzeLoading, setAnalyzeLoading] = useState(false); // AI 이미지 분석 전용 로딩 상태
  const [saveLoading, setSaveLoading] = useState(false); // 상품 저장 전용 로딩 상태
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceVisionResult, setVoiceVisionResult] = useState<any>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [condition, setCondition] = useState<string>("중"); // 상/중/하
  const [priceRecommendation, setPriceRecommendation] = useState<any>(null);
  const [priceRecommendationLoading, setPriceRecommendationLoading] = useState(false);
  // 🔍 검색 최적화 필드
  const [searchTags, setSearchTags] = useState<string[]>([]); // 화면 표시용 태그
  const [keywordTokens, setKeywordTokens] = useState<string[]>([]); // Firestore 검색용 토큰
  const [searchText, setSearchText] = useState(""); // 통합 검색용 텍스트
  const [tagLoading, setTagLoading] = useState(false);
  // 📝 AI 제목 생성
  const [autoTitle, setAutoTitle] = useState("");
  const [titleLoading, setTitleLoading] = useState(false);
  // 🏷️ AI 태그 생성 (검색 최적화)
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  // 📂 AI 카테고리 자동 분류
  const [autoCategories, setAutoCategories] = useState<string[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  // 📝 AI 한줄 요약 (리스트용)
  const [oneLineSummary, setOneLineSummary] = useState("");
  const [oneLineLoading, setOneLineLoading] = useState(false);

  // 🔄 페이지 처음 열릴 때 로딩 상태 강제로 초기화
  // Vite(HMR) 때문에 이전 상태가 그대로 남아 있을 수 있음
  useEffect(() => {
    setSaveLoading(false);
    setAnalyzeLoading(false);
  }, []);

  const navigate = useNavigate();

  const ensureAuthenticated = useCallback(
    () =>
      new Promise<User>((resolve, reject) => {
        const current = auth.currentUser;
        if (current) {
          resolve(current);
          return;
        }
        let triedAnonymous = false;
        const unsubscribe = onAuthStateChanged(
          auth,
          (firebaseUser) => {
            if (firebaseUser) {
              unsubscribe();
              resolve(firebaseUser);
            } else {
              if (triedAnonymous) {
                unsubscribe();
                reject(new Error("로그인이 필요합니다."));
                return;
              }
              triedAnonymous = true;
              signInAnonymously(auth).catch((error) => {
                unsubscribe();
                reject(error);
              });
            }
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );
      }),
    [auth]
  );

  // 🔍 디버깅: 렌더링마다 로딩 상태 확인
  useEffect(() => {
    console.log("🔥 UI 상태 체크:", {
      loading,
      analyzeLoading,
      saveLoading,
      imageFile: !!imageFile,
      isEditMode,
      productId: id,
    });
  }, [loading, analyzeLoading, saveLoading, imageFile, isEditMode, id]);

  // 🔥 수정 모드: 기존 상품 데이터 로드
  useEffect(() => {
    if (!isEditMode || !id) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        
        // 먼저 사용자 인증 확인
        const user = await ensureAuthenticated();
        if (!user) {
          alert("로그인이 필요합니다.");
          navigate("/app/market");
          return;
        }

        const productRef = doc(db, "marketProducts", id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          alert("상품을 찾을 수 없습니다.");
          navigate("/app/market");
          return;
        }

        const productData = productSnap.data();

        // 🔥 권한 체크: 본인 상품인지 확인
        const productUserId = productData.userId || productData.ownerId;
        if (productUserId !== user.uid) {
          alert("본인 상품만 수정할 수 있습니다.");
          navigate(`/app/market/${id}`);
          return;
        }

        // 기존 데이터를 폼에 채우기
        if (productData.name) setName(productData.name);
        if (productData.price) setPrice(String(productData.price));
        if (productData.category) setCategory(productData.category);
        if (productData.description) setDesc(productData.description);
        if (productData.imageUrl) setImageUrl(productData.imageUrl);
        if (productData.tags) {
          setAiTags(Array.isArray(productData.tags) ? productData.tags : []);
          setSearchTags(Array.isArray(productData.tags) ? productData.tags : []);
        }
        if (productData.keywordTokens) {
          setKeywordTokens(Array.isArray(productData.keywordTokens) ? productData.keywordTokens : []);
        }
        if (productData.searchText) setSearchText(productData.searchText);
        if (productData.aiOneLine) setOneLineSummary(productData.aiOneLine);
        
        // 위치 정보 로드
        if (typeof productData.latitude === "number" && !Number.isNaN(productData.latitude)) {
          setLatitude(productData.latitude);
        }
        if (typeof productData.longitude === "number" && !Number.isNaN(productData.longitude)) {
          setLongitude(productData.longitude);
        }

        console.log("✅ 기존 상품 데이터 로드 완료:", productData);
        console.log("✅ 수정 권한 확인 완료:", { userId: user.uid, productUserId });
      } catch (error: any) {
        console.error("❌ 상품 데이터 로드 실패:", error);
        if (error?.message === "로그인이 필요합니다.") {
          alert("로그인 후 이용해주세요.");
        } else {
          alert("상품 데이터를 불러오는 중 오류가 발생했습니다.");
        }
        navigate("/app/market");
      } finally {
        setLoading(false);
      }
    };

    void loadProduct();
  }, [isEditMode, id, navigate, ensureAuthenticated]);

  // 🔥 uploadFileAndGetUrl 제거됨 - uploadMarketImage 유틸 사용
  // 모든 업로드는 uploadMarketImage를 통해서만 수행됩니다.

  // 🔎 Firestore 연결 테스트 (개발 확인용)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        testFirestoreConnection();
      }
    });
    return unsubscribe;
  }, [auth]);

  // 🔹 이미지 업로드
  const handleUpload = async () => {
    if (!imageFile) return alert("이미지를 선택하세요!");
    try {
      const user = await ensureAuthenticated();
      if (!user) {
        alert("로그인이 필요합니다.");
        return;
      }
      setLoading(true);
      // 🔥 이미지 압축 후 uploadMarketImage 사용
      let fileToUpload = imageFile;
      if (imageFile.type.startsWith("image/")) {
        try {
          const compressed = await imageCompression(imageFile, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 1080,
            useWebWorker: true,
          });
          // 🔥 imageCompression은 File을 반환하므로 그대로 사용 (Blob 재생성 금지!)
          fileToUpload = compressed;
          
          // 🔥 안전장치: 압축된 파일 크기가 0이면 원본 사용
          if (fileToUpload.size === 0) {
            console.error("❌ 압축 실패: 파일 크기 0, 원본 사용");
            fileToUpload = imageFile;
          }
        } catch (err) {
          console.warn("⚠️ 압축 실패, 원본 사용:", err);
          fileToUpload = imageFile;
        }
      }
      const url = await uploadMarketImage(fileToUpload, user.uid);
      setImageUrl(url);
    } catch (error: any) {
      if (error?.message === "로그인이 필요합니다.") {
        alert("로그인 후 이용해주세요!");
        return;
      }
      console.error("이미지 업로드 오류:", error);
      alert("이미지 업로드 실패");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 이미지 업로드 + AI 분석 (FormData 방식)
  const handleUploadAndAnalyze = async () => {
    console.log("🔥 handleUploadAndAnalyze 시작");
    console.log("🔥 ANALYZE_PRODUCT_ENDPOINT =", ANALYZE_PRODUCT_ENDPOINT);
    console.log("🔥 imageFile =", imageFile);

    if (!imageFile) {
      setErrorMsg("먼저 이미지를 선택해주세요.");
      return;
    }

    setAnalyzeLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      // 사용자 힌트 추가
      if (name.trim()) formData.append("user_title", name.trim());
      if (category.trim()) formData.append("user_category", category.trim());
      if (price.trim()) {
        const priceNum = parseFloat(price.replace(/[^0-9]/g, ""));
        if (!isNaN(priceNum)) formData.append("user_price", priceNum.toString());
      }

      console.log("🔥 fetch 시작:", ANALYZE_PRODUCT_ENDPOINT);

      const response = await fetch(ANALYZE_PRODUCT_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      console.log("🔥 fetch 응답:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "알 수 없는 오류");
        console.error("❌ 서버 오류 응답:", errorText);
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json().catch((parseError) => {
        console.error("❌ JSON 파싱 오류:", parseError);
        throw new Error("서버 응답을 파싱할 수 없습니다.");
      });

      console.log("✨ AI 분석 응답:", data);

      if (!data) {
        throw new Error("서버에서 빈 응답을 받았습니다.");
      }

      // ---------------------------
      // 🔽 분석 결과 폼에 반영
      // ---------------------------

      // 제목
      if (data?.title) {
        let titleText = data.title;
        if (
          data.brand &&
          !titleText.toLowerCase().includes(data.brand.toLowerCase())
        ) {
          titleText = `${data.brand} ${titleText}`.trim();
        }
        setName(titleText);
      }

      // 카테고리
      if (data?.category) {
        const categoryText = data.category.minor || data.category.major || "";
        if (categoryText) setCategory(categoryText);
      }

      // 설명
      if (data?.description) setDesc(data.description);

      // 상태
      if (data?.condition) setCondition(data.condition);

      // 가격 (중간값)
      if (data?.price_suggestion) {
        const { low, high } = data.price_suggestion;
        if (low && high) {
          const avgPrice = Math.round((low + high) / 2);
          setPrice(avgPrice.toLocaleString());
        }
      }

      // 태그
      if (data?.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        setAiTags(data.tags);
        setAutoTags(data.tags);
      }

      if (data?.attributes) {
        console.log("📋 상품 속성:", data.attributes);
      }

      // 이미지 URL
      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
      } else if (imageFile) {
        const previewUrl = URL.createObjectURL(imageFile);
        setImageUrl(previewUrl);
      }

      setSuccessMsg("✅ AI 분석이 완료되었습니다!");
      console.log("✨ AI 분석 완료");
    } catch (error: any) {
      console.error("❌ 이미지 분석 오류:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      setErrorMsg(`⚠️ AI 분석 오류\n${msg}\n\n직접 입력하거나 나중에 다시 시도해주세요.`);
    } finally {
      setAnalyzeLoading(false);
      console.log("✅ AI 분석 로딩 상태 종료 (finally)");
    }
  };

  // 🔹 AI 태그 생성 (간단 시뮬레이션 버전) - 기존 호환성 유지
  const handleAITags = async () => {
    if (!desc) return alert("상품 설명을 입력하세요!");
    // 실제로는 OpenAI API 또는 Firebase Functions에서 AI 처리
    const keywords = desc
      .split(" ")
      .filter((w) => w.length > 1)
      .slice(0, 5);
    setAiTags(keywords);
  };

  // 📂 AI 카테고리 자동 분류
  const generateCategoryAI = async () => {
    if (!imageUrl && !name.trim() && !desc.trim()) {
      setErrorMsg("이미지, 상품명, 또는 설명 중 하나는 필요합니다.");
      return;
    }

    setCategoryLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/generateCategory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: desc.trim(),
            imageUrl: imageUrl || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      const data = await response.json();
      const generatedCategories = Array.isArray(data.categories) ? data.categories : [];
      setAutoCategories(generatedCategories);
      
      // 첫 번째 추천 카테고리를 자동으로 선택
      if (generatedCategories.length > 0 && !category.trim()) {
        setCategory(generatedCategories[0]);
      }
      
      setSuccessMsg("✅ AI 카테고리가 추천되었습니다!");
    } catch (error: any) {
      console.error("📂 AI 카테고리 분류 오류:", error);
      setErrorMsg("⚠️ AI 카테고리 분류에 실패했습니다.");
    } finally {
      setCategoryLoading(false);
    }
  };

  // 🏷️ AI 태그 생성 (검색 최적화)
  const generateAITags = async () => {
    if (!imageUrl && !name.trim() && !desc.trim()) {
      setErrorMsg("이미지, 상품명, 또는 설명 중 하나는 필요합니다.");
      return;
    }

    setTagsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // generateTags 함수는 req.body.text만 받음
      const text = `${name.trim()} ${category.trim()} ${desc.trim()}`.trim();
      
      if (!text) {
        setErrorMsg("상품 정보를 입력해주세요.");
        return;
      }

      console.log("🔥 태그 생성 fetch 시작:", TAGS_FUNCTION_ORIGIN);
      const response = await fetch(
        TAGS_FUNCTION_ORIGIN,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
          }),
        }
      );

      console.log("🔥 태그 생성 응답:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      const data = await response.json();
      const generatedTags = Array.isArray(data.tags) ? data.tags : [];
      setAutoTags(generatedTags);
      // 생성된 태그를 searchTags에도 반영
      if (generatedTags.length > 0) {
        setSearchTags(generatedTags);
        setAiTags(generatedTags);
      }
      setSuccessMsg("✅ AI 태그가 생성되었습니다!");
    } catch (error: any) {
      console.error("🏷️ AI 태그 생성 오류:", error);
      setErrorMsg("⚠️ AI 태그 생성에 실패했습니다.");
    } finally {
      setTagsLoading(false);
    }
  };

  // 📝 AI 한줄 요약 생성 (리스트용)
  const generateOneLine = async () => {
    if (!imageUrl && !name.trim() && !desc.trim()) {
      return; // 조용히 실패 (선택적 기능)
    }

    setOneLineLoading(true);

    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/generateOneLineSummary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: desc.trim(),
            category: category.trim(),
            conditionScore: condition === "상" ? 0.8 : condition === "중" ? 0.5 : 0.3,
            imageQualityScore: 0.7, // 기본값
            components: [], // 구성품 정보는 나중에 추가 가능
            fraud: { label: "low" }, // 기본값
            imageUrl: imageUrl || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      const data = await response.json();
      const summary = data.summary || "";
      setOneLineSummary(summary);
    } catch (error: any) {
      console.error("📝 AI 한줄 요약 오류:", error);
      setOneLineSummary("");
    } finally {
      setOneLineLoading(false);
    }
  };

  // 📝 AI 제목 생성
  const generateTitle = async () => {
    if (!imageUrl && !name.trim() && !desc.trim()) {
      setErrorMsg("이미지, 상품명, 또는 설명 중 하나는 필요합니다.");
      return;
    }

    setTitleLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/generateProductTitle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim(),
            description: desc.trim(),
            tags: searchTags.length > 0 ? searchTags : aiTags,
            conditionScore: condition === "상" ? 0.8 : condition === "중" ? 0.5 : 0.3,
            imageQualityScore: 0.7, // 기본값 (이미지 품질 점수는 별도로 계산 필요)
            imageUrl: imageUrl || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      const data = await response.json();
      const generatedTitle = data.title || name || "상품";
      setAutoTitle(generatedTitle);
      setName(generatedTitle); // 제목 input 자동 입력
      setSuccessMsg("✅ AI 제목이 생성되었습니다!");
    } catch (error: any) {
      console.error("📝 제목 생성 오류:", error);
      setErrorMsg("⚠️ AI 제목 생성에 실패했습니다. 직접 입력해주세요.");
    } finally {
      setTitleLoading(false);
    }
  };

  // ✨ AI 검색 메타데이터 생성 (검색 최적화)
  const handleGenerateSearchMeta = async () => {
    if (!name.trim() && !desc.trim()) {
      setErrorMsg("상품명이나 설명을 먼저 입력해주세요.");
      return;
    }

    setTagLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // generateSearchMeta 함수 사용 (tags, keywordTokens, searchText 반환)
      console.log("🔥 검색 메타 생성 fetch 시작:", SEARCH_META_FUNCTION_ORIGIN);
      const response = await fetch(
        SEARCH_META_FUNCTION_ORIGIN,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: name.trim(),
            category: category.trim(),
            description: desc.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      console.log("🔥 검색 메타 생성 응답:", response.status, response.statusText);
      const data = await response.json();
      console.log("✨ AI 검색 메타데이터 생성 결과:", data);

      // 검색 메타데이터 설정
      if (data?.tags && Array.isArray(data.tags)) {
        setSearchTags(data.tags);
        setAiTags(data.tags);
        setAutoTags(data.tags);
      }
      
      if (data?.keywordTokens && Array.isArray(data.keywordTokens)) {
        setKeywordTokens(data.keywordTokens);
      }
      
      if (data?.searchText && typeof data.searchText === "string") {
        setSearchText(data.searchText);
      }

      setSuccessMsg("✅ AI 검색 메타데이터가 생성되었습니다!");
    } catch (error: any) {
      console.error("✨ AI 검색 메타데이터 생성 오류:", error);
      // Fallback: generateTags 사용
      try {
        console.log("🔄 Fallback: generateTags 사용");
        const fallbackResponse = await fetch(
          TAGS_FUNCTION_ORIGIN,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `${name.trim()} ${category.trim()} ${desc.trim()}`.trim(),
            }),
          }
        );
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData?.tags && Array.isArray(fallbackData.tags)) {
            setSearchTags(fallbackData.tags);
            setAiTags(fallbackData.tags);
            setAutoTags(fallbackData.tags);
            setSuccessMsg("✅ AI 태그가 생성되었습니다! (기본 모드)");
          }
        }
      } catch (fallbackError) {
        setErrorMsg("⚠️ AI 검색 메타데이터 생성에 실패했습니다. 나중에 다시 시도해주세요.");
      }
    } finally {
      setTagLoading(false);
    }
  };

  // 💰 AI 가격 추천 받기
  const getPriceRecommendation = async () => {
    if (!name.trim() || !category.trim()) {
      setErrorMsg("상품명과 카테고리를 먼저 입력해주세요.");
      return;
    }

    setPriceRecommendationLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      // AI 분석 결과에서 brand 추출 (설명에서 찾거나 빈 문자열)
      const brandMatch = name.match(/(나이키|아디다스|퓨마|뉴발란스|컨버스|반스|조던|에어맥스|스텔스|타이틀리스트|테일러메이드|칼라웨이|윌슨|헤드|바볼랫)/i);
      const brand = brandMatch ? brandMatch[0] : "";

      const response = await fetch(
        `${functionsOrigin}/getPriceRecommendation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: name.trim(),
            category: category.trim(),
            condition: condition || "중",
            brand: brand,
            latitude: latitude,
            longitude: longitude,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("가격 추천 서버 응답 없음");
      }

      const data = await response.json();
      console.log("💰 AI 가격 추천 결과:", data);

      setPriceRecommendation(data);
      
      // 권장 가격을 자동으로 가격 필드에 채우기
      if (data?.recommendedPrice) {
        setPrice(String(data.recommendedPrice));
        setSuccessMsg(`✅ AI 가격 추천 완료! 권장가: ${data.recommendedPrice.toLocaleString()}원`);
      } else {
        setSuccessMsg("✅ AI 가격 추천 완료!");
      }
    } catch (error: any) {
      console.error("💰 가격 추천 오류:", error);
      setErrorMsg("⚠️ AI 가격 추천 서버가 응답하지 않습니다. 직접 가격을 입력해주세요.");
    } finally {
      setPriceRecommendationLoading(false);
    }
  };

  // 📍 현재 위치 가져오기 (수동 저장)
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("📍 위치 서비스를 지원하지 않는 브라우저입니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(lat);
        setLongitude(lng);
        alert(`📍 위치 저장 완료!\nLat: ${lat.toFixed(6)}\nLng: ${lng.toFixed(6)}`);
      },
      (err) => {
        console.error(err);
        alert("⚠️ 위치 권한을 거부하거나 GPS 정보를 가져올 수 없습니다.");
      }
    );
  };

  // 🎙️ 음성 입력 처리 (STT + NLU + Firestore 자동 저장)
  const handleVoiceInput = async () => {
    try {
      // Web Speech API 지원 확인
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari를 사용해주세요.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setRecording(true);
        console.log("🎙️ 음성 인식 시작");
      };

      recognition.onend = () => {
        setRecording(false);
        console.log("🎙️ 음성 인식 종료");
      };

      recognition.onerror = (err: any) => {
        setRecording(false);
        console.error("❌ 음성 인식 오류:", err);
        if (err.error === "not-allowed") {
          alert("마이크 권한을 허용해주세요 🎤");
        } else {
          alert(`음성 인식 오류: ${err.error}`);
        }
      };

      recognition.onresult = async (event: any) => {
        const speechText = event.results[0][0].transcript.trim();
        setTranscript(speechText);
        recognition.stop();
        setRecording(false);
        
        // 이미지가 있으면 이미지+음성 통합 분석으로 진행
        if (imageFile) {
          handleImageAndVoiceAnalyze(imageFile, speechText);
        } else {
          // 음성만 처리 (기존 로직)
          setLoading(true);
          try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
              "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/voiceAddProduct`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: speechText }),
            });

            if (!response.ok) {
              throw new Error(`AI 분석 실패: ${response.statusText}`);
            }

            const data = await response.json();

            // AI 분석 결과를 폼에 자동 반영
            if (data?.product) {
              const product = data.product;
              if (product.name) setName(product.name);
              if (product.price) setPrice(product.price);
              if (product.category) setCategory(product.category);
              if (product.desc) setDesc(product.desc);
            }

            // 성공 메시지
            alert(`✅ ${data.message || "상품이 등록되었습니다!"}`);

            // 자동 저장 완료 시 마켓 페이지로 이동
            if (data.productId) {
              setTimeout(() => {
                navigate("/app/market");
              }, 1000);
            }
          } catch (error: any) {
            console.error("음성 상품 등록 오류:", error);
            alert(`오류 발생: ${error.message || "알 수 없는 오류"}`);
          } finally {
            setLoading(false);
          }
        }
      };

      recognition.start();
    } catch (error: any) {
      console.error("음성 인식 초기화 오류:", error);
      alert("마이크 권한을 허용해주세요 🎤");
    }
  };

  // 📸🎙️ 이미지 + 음성 동시 분석 및 등록
  const handleImageAndVoiceAnalyze = async (file: File, voiceText: string) => {
    if (!file || !voiceText) {
      setErrorMsg("이미지와 음성을 모두 입력해주세요.");
      return;
    }

    try {
      const user = await ensureAuthenticated();
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      // 1. Firebase Storage에 이미지 업로드 (uploadMarketImage 사용)
      if (!user) {
        alert("로그인이 필요합니다.");
        return;
      }
      // 🔥 이미지 압축 후 uploadMarketImage 사용
      let fileToUpload = file;
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 1080,
            useWebWorker: true,
          });
          // 🔥 imageCompression은 File을 반환하므로 그대로 사용 (Blob 재생성 금지!)
          fileToUpload = compressed;
          
          // 🔥 안전장치: 압축된 파일 크기가 0이면 원본 사용
          if (fileToUpload.size === 0) {
            console.error("❌ 압축 실패: 파일 크기 0, 원본 사용");
            fileToUpload = file;
          }
        } catch (err) {
          console.warn("⚠️ 압축 실패, 원본 사용:", err);
          fileToUpload = file;
        }
      }
      const imageUrl = await uploadMarketImage(fileToUpload, user.uid);
      setImageUrl(imageUrl);

      // 2. 백엔드 AI 통합 분석 요청
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(`${functionsOrigin}/voiceVisionAddProduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, voiceText }),
      });

      if (!response.ok) {
        throw new Error(`AI 분석 실패: ${response.statusText}`);
      }

      const data = await response.json();
      setVoiceVisionResult(data);

      // 3. AI 분석 결과를 폼에 자동 반영
      if (data?.product) {
        const product = data.product;
        if (product.name) setName(product.name);
        if (product.price) setPrice(product.price);
        if (product.category) setCategory(product.category);
        if (product.desc) setDesc(product.desc);
        if (product.aiTags) setAiTags(product.aiTags);
      }

      // 좌표 결정: 수동 저장한 좌표 우선 사용, 없으면 자동으로 가져오기
      const defaultLat = 37.5665; // 서울 시청 기본값
      const defaultLng = 126.9780;
      
      let finalLatitude: number;
      let finalLongitude: number;
      let locationText = "위치 정보없음";

      // 1순위: 수동으로 저장한 좌표 사용
      if (latitude !== null && longitude !== null && 
          typeof latitude === "number" && typeof longitude === "number" &&
          !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        finalLatitude = latitude;
        finalLongitude = longitude;
        locationText = `위도: ${latitude.toFixed(6)}, 경도: ${longitude.toFixed(6)} (수동 저장)`;
        console.log("📍 수동 저장된 좌표 사용:", { latitude, longitude });
      } else {
        // 2순위: 자동으로 현재 위치 가져오기
        try {
          if (navigator.geolocation) {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
              );
            });
            
            // 좌표 유효성 검증 및 정규화
            const rawLat = position.coords.latitude;
            const rawLng = position.coords.longitude;
            
            // 숫자이고 유효한 범위인지 확인
            if (
              typeof rawLat === "number" &&
              !Number.isNaN(rawLat) &&
              rawLat >= -90 &&
              rawLat <= 90
            ) {
              finalLatitude = rawLat;
            } else {
              finalLatitude = defaultLat;
              console.warn("⚠️ 유효하지 않은 위도, 기본값 사용:", rawLat);
            }
            
            if (
              typeof rawLng === "number" &&
              !Number.isNaN(rawLng) &&
              rawLng >= -180 &&
              rawLng <= 180
            ) {
              finalLongitude = rawLng;
            } else {
              finalLongitude = defaultLng;
              console.warn("⚠️ 유효하지 않은 경도, 기본값 사용:", rawLng);
            }
            
            locationText = `위도: ${finalLatitude.toFixed(6)}, 경도: ${finalLongitude.toFixed(6)}`;
            console.log("📍 자동으로 현재 위치 저장:", { latitude: finalLatitude, longitude: finalLongitude });
          } else {
            // Geolocation API가 없으면 기본값 사용
            finalLatitude = defaultLat;
            finalLongitude = defaultLng;
            locationText = `위도: ${defaultLat.toFixed(6)}, 경도: ${defaultLng.toFixed(6)} (기본값)`;
            console.log("📍 Geolocation API 없음, 기본값 사용:", { latitude: finalLatitude, longitude: finalLongitude });
          }
        } catch (geoError) {
          console.warn("⚠️ 위치 정보를 가져올 수 없습니다:", geoError);
          // 위치 권한이 없어도 기본값으로 저장
          finalLatitude = defaultLat;
          finalLongitude = defaultLng;
          locationText = `위도: ${defaultLat.toFixed(6)}, 경도: ${defaultLng.toFixed(6)} (기본값)`;
        }
      }
      
      // 최종 안전장치: null이면 기본값 강제 적용
      finalLatitude = finalLatitude ?? defaultLat;
      finalLongitude = finalLongitude ?? defaultLng;

      // 최종 검증: 숫자가 아니면 기본값 강제 적용
      if (typeof finalLatitude !== "number" || Number.isNaN(finalLatitude)) {
        console.warn("⚠️ 최종 검증: 위도가 유효하지 않아 기본값 사용");
        finalLatitude = defaultLat;
      }
      if (typeof finalLongitude !== "number" || Number.isNaN(finalLongitude)) {
        console.warn("⚠️ 최종 검증: 경도가 유효하지 않아 기본값 사용");
        finalLongitude = defaultLng;
      }

      // location 필드: 사용자 친화적인 형식
      const finalLocation = locationText || `서울특별시 중구 세종대로 110 (위도: ${finalLatitude.toFixed(6)}, 경도: ${finalLongitude.toFixed(6)})`;

      console.log("📍 저장할 좌표:", { latitude: finalLatitude, longitude: finalLongitude, location: finalLocation });

      // 5. Firestore에 자동 저장 (표준 필드 구조)
      const productName = data.product?.name || name.trim() || "AI 상품";
      const productCategory = data.product?.category || category.trim() || "미분류";
      const productDesc = data.product?.desc || data.product?.description || desc.trim() || "";
      
      // 📝 한줄 요약 생성 (저장 전에 자동 생성)
      let finalOneLineSummary = "";
      try {
        const summaryResponse = await fetch(
          `${functionsOrigin}/generateOneLineSummary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: productName,
              description: productDesc,
              category: productCategory,
              conditionScore: 0.5,
              imageQualityScore: 0.7,
              components: [],
              fraud: { label: "low" },
              imageUrl: imageUrl || null,
            }),
          }
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          finalOneLineSummary = summaryData.summary || "";
        }
      } catch (summaryError) {
        console.warn("📝 한줄 요약 생성 실패 (무시):", summaryError);
      }
      
      const productData = {
        name: productName,
        price: Number(data.product?.price?.replace(/[^\d.-]/g, "") || price.replace(/[^\d.-]/g, "") || 0),
        category: productCategory,
        description: productDesc,
        latitude: finalLatitude,
        longitude: finalLongitude,
        imageUrl: imageUrl || null,
        tags: searchTags.length > 0 ? searchTags : (data.product?.aiTags || aiTags || []),
        keywordTokens: keywordTokens.length > 0 ? keywordTokens : [],
        searchText: searchText || `${productName} ${productCategory} ${productDesc}`.trim(),
        aiOneLine: finalOneLineSummary || "", // AI 한줄 요약 (리스트용)
        userId: user.uid,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "marketProducts"), productData);
      const productId = docRef.id;

      // 6. 🎧 TTS 피드백
      const utterance = new SpeechSynthesisUtterance(
        `상품이 등록되었습니다. ${data.product.name}`
      );
      utterance.lang = "ko-KR";
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);

      // 성공 메시지
      setSuccessMsg(`✅ AI가 상품을 등록했습니다! ${data.product.name}`);

      // 2초 후 상품 상세 페이지로 이동
      setTimeout(() => {
        navigate(`/app/market/${productId}`);
      }, 2000);
    } catch (error: any) {
      if (error?.message === "로그인이 필요합니다.") {
        setErrorMsg("로그인 후 이용해주세요.");
        return;
      }
      console.error("이미지+음성 분석 오류:", error);
      setErrorMsg("AI 분석에 실패했습니다. 수동 입력을 사용해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Firestore 저장 (단순/안정 버전)
  const handleSave = async () => {
    console.log("🔥 handleSave 시작");
    
    if (!name.trim() || !price) {
      setErrorMsg("필수 항목을 모두 입력해주세요.");
      return;
    }

    setSaveLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    let savedProductId: string | null = null; // 🔥 저장 성공한 상품 ID 저장

    try {
      const user = await ensureAuthenticated();
      console.log("💾 handleSave 시작, user:", user.uid);
      console.log("🔥 Firestore 업로드 시작");
      
      // 🔥 사용자 인증 확인 (강화)
      if (!user || !user.uid) {
        throw new Error("로그인한 사용자 정보가 없습니다.");
      }

      // 🔥 업로드 직전 auth.currentUser.uid 재확인 (Storage Rules 일치 보장)
      const currentUid = auth.currentUser?.uid;
      if (!currentUid || currentUid !== user.uid) {
        console.error("❌ auth.currentUser.uid 불일치:", {
          userUid: user.uid,
          currentUid: currentUid
        });
        throw new Error("인증 상태가 일치하지 않습니다. 페이지를 새로고침해주세요.");
      }

      // 🔥 이미지 업로드 (uploadMarketImage 사용)
      let finalImageUrl = imageUrl;

      // 🔥 이미지 파일이 있는 경우 업로드 수행
      if (imageFile) {
        console.log("📦 업로드할 파일:", {
          size: imageFile.size,
          type: imageFile.type,
          name: imageFile.name,
        });

        // 🔥 이미지 압축 (업로드 전)
        let fileToUpload: File | Blob = imageFile;
        
        if (imageFile.type.startsWith("image/")) {
          try {
            console.log("🧪 이미지 압축 시작...");
            const compressed = await imageCompression(imageFile, {
              maxSizeMB: 0.3,
              maxWidthOrHeight: 1080,
              useWebWorker: true,
            });

            // 🔥 imageCompression은 File을 반환하므로 그대로 사용 (Blob 재생성 금지!)
            fileToUpload = compressed;

            console.log("🟢 압축 완료:", {
              original: imageFile.size,
              compressed: fileToUpload.size,
            });

            // 🔥 안전장치: 압축된 파일 크기가 0이면 업로드 중단
            if (fileToUpload.size === 0) {
              console.error("❌ 압축 실패: 파일 크기 0");
              alert("이미지 압축 중 문제가 발생했습니다. 다른 이미지를 사용해주세요.");
              setSaveLoading(false);
              return;
            }
          } catch (e) {
            console.warn("⚠️ 압축 실패, 원본 업로드 진행", e);
            fileToUpload = imageFile;
          }
        }

        // 🔥 업로드 실행
        try {
          finalImageUrl = await uploadMarketImage(fileToUpload, currentUid);
          setImageUrl(finalImageUrl);
          console.log("✅ 이미지 업로드 완료:", finalImageUrl);
        } catch (err: any) {
          console.error("❌ 이미지 업로드 실패:", err);
          alert("이미지 업로드에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
          setSaveLoading(false);
          return;
        }
      } else if (!imageUrl && !imageFile) {
        // 🔥 이미지가 아예 없는 경우 경고
        const proceedWithoutImage = confirm("이미지를 선택하지 않았습니다. 이미지 없이 저장하시겠습니까?");
        if (!proceedWithoutImage) {
          return;
        }
      }

      // 2) 가격 정리
      const numericPrice = Number(
        typeof price === "number"
          ? price
          : String(price).replace(/[^\d.-]/g, "")
      );
      const storedPrice = Number.isFinite(numericPrice) ? numericPrice : null;

      // 3) 위치 값 정리 (이미 저장된 latitude/longitude만 사용, 없으면 기본값)
      const defaultLat = 37.5665;
      const defaultLng = 126.9780;

      const finalLatitude =
        typeof latitude === "number" && !Number.isNaN(latitude)
          ? latitude
          : defaultLat;
      const finalLongitude =
        typeof longitude === "number" && !Number.isNaN(longitude)
          ? longitude
          : defaultLng;

      console.log("📍 최종 좌표:", {
        latitude: finalLatitude,
        longitude: finalLongitude,
      });

      // 4) 한줄 요약: 이미 생성된 값 사용 (없으면 비움)
      const finalOneLineSummary = oneLineSummary || "";

      // 5) Firestore에 저장할 데이터 (undefined 제거 및 값 정리)
      // 🔥 Firestore는 undefined를 허용하지 않으므로 모든 undefined를 null이나 빈 값으로 변환
      const productData: any = {
        name: name.trim() || "",
        price: storedPrice !== null && storedPrice !== undefined ? storedPrice : null,
        category: category.trim() || "",
        description: desc.trim() || "",
        latitude: typeof finalLatitude === "number" && !Number.isNaN(finalLatitude) ? finalLatitude : 37.5665,
        longitude: typeof finalLongitude === "number" && !Number.isNaN(finalLongitude) ? finalLongitude : 126.9780,
        imageUrl: finalImageUrl || null,
        tags: Array.isArray(searchTags) && searchTags.length > 0 ? searchTags : (Array.isArray(aiTags) && aiTags.length > 0 ? aiTags : []),
        keywordTokens: Array.isArray(keywordTokens) && keywordTokens.length > 0 ? keywordTokens : [],
        searchText:
          (searchText && searchText.trim()) ||
          `${name.trim()} ${category.trim()} ${desc.trim()}`.trim() ||
          "",
        aiOneLine: finalOneLineSummary || "",
        userId: user.uid,
      };

      // 🔥 수정 모드면 updatedAt만 추가, 생성 모드면 createdAt 추가
      if (isEditMode) {
        productData.updatedAt = serverTimestamp();
      } else {
        productData.createdAt = serverTimestamp();
      }

      // 🔥 productData 검증 및 로깅 (undefined, NaN 체크)
      console.log("🔥 productData to save:", JSON.stringify(productData, null, 2));
      
      // undefined나 NaN이 있는지 체크
      const hasInvalidValue = Object.entries(productData).some(([key, value]) => {
        if (value === undefined) {
          console.error(`❌ productData.${key} is undefined!`);
          return true;
        }
        if (typeof value === "number" && Number.isNaN(value)) {
          console.error(`❌ productData.${key} is NaN!`);
          return true;
        }
        return false;
      });

      if (hasInvalidValue) {
        throw new Error("productData에 유효하지 않은 값(undefined, NaN)이 포함되어 있습니다.");
      }

      console.log("💾 Firestore 저장 시작...", { isEditMode, productId: id, currentUserId: user.uid });
      
      // 🔥 수정 모드면 updateDoc, 생성 모드면 addDoc 사용
      let productId: string;
      
      if (isEditMode && id) {
        // 🔥 수정 모드: 권한 재확인 및 updateDoc 사용
        const productRef = doc(db, "marketProducts", id);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          throw new Error("상품을 찾을 수 없습니다.");
        }

        const existingData = productSnap.data();
        const productUserId = existingData.userId || existingData.ownerId;
        
        if (productUserId !== user.uid) {
          throw new Error("본인 상품만 수정할 수 있습니다.");
        }

        console.log("✅ 수정 권한 확인 완료, 업데이트 시작...", {
          productId: id,
          userId: user.uid,
          productUserId,
        });

        // 🔥 userId는 수정하지 않음 (기존 값 유지)
        const updateData = { ...productData };
        delete updateData.userId; // userId는 업데이트하지 않음

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Firestore 업데이트 타임아웃 (30초 초과)")), 30000);
        });
        
        const updatePromise = updateDoc(productRef, updateData);
        await Promise.race([updatePromise, timeoutPromise]);
        
        productId = id;
        console.log("✅ Firestore 업데이트 완료! 상품 ID:", productId);
        setSuccessMsg("✅ 상품이 수정되었습니다!");
      } else {
        // 생성 모드: addDoc 사용
        const savePromise = addDoc(collection(db, "marketProducts"), productData);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Firestore 저장 타임아웃 (30초 초과)")), 30000);
        });
        
        const docRef = await Promise.race([savePromise, timeoutPromise]) as any;
        productId = docRef.id;
        console.log("✅ Firestore 저장 완료! 상품 ID:", productId);
        setSuccessMsg("✅ 상품이 등록되었습니다!");
      }

      savedProductId = productId; // 🔥 저장 성공한 상품 ID 저장
      
    } catch (error: any) {
      console.error("❌ 저장 중 오류 발생:", error);
      console.error("🔥 저장 오류:", error);
      console.error("🔥 에러 상세:", {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      
      if (error?.message === "로그인이 필요합니다.") {
        setErrorMsg("로그인 후 이용해주세요.");
        alert("로그인 후 이용해주세요.");
      } else if (error?.message?.includes("타임아웃")) {
        setErrorMsg("저장 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
        alert(`상품 저장 중 타임아웃이 발생했습니다.\n네트워크 상태를 확인하고 다시 시도해주세요.`);
      } else if (error?.message?.includes("이미지 업로드 실패") || error?.message?.includes("이미지 선택이 취소")) {
        // 🔥 이미지 업로드 관련 오류는 이미 alert가 표시됨 (위에서 처리)
        // 여기서는 중복 알림 방지
        console.warn("⚠️ 이미지 업로드 실패로 상품 저장이 취소되었습니다.");
      } else if (error?.code === "permission-denied") {
        setErrorMsg("저장 권한이 없습니다. Firestore 규칙을 확인해주세요.");
        alert(`상품 저장 권한이 없습니다.\nFirestore 보안 규칙을 확인해주세요.\n에러: ${error?.message}`);
      } else {
        const errorMessage = error?.message || error?.code || "알 수 없는 오류";
        setErrorMsg("상품 저장에 실패했습니다. 다시 시도해주세요.");
        alert(`상품 저장 중 오류가 발생했습니다.\n${errorMessage}\n\n상세: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      }
    } finally {
      // 🔥🔥🔥 finally 블록은 무조건 실행됨 - 로딩 상태 강제 종료
      console.log("🔥 finally 실행됨 → saveLoading 강제 종료");
      setSaveLoading(false);
      console.log("✅ 상품 저장 로딩 상태 종료 (finally) - saveLoading = false");

      // 🔥 navigate도 finally 블록에서 처리 (Firestore 저장 실패 여부와 상관없이)
      // 단, 저장 성공한 경우에만 상세 페이지로 이동
      if (savedProductId) {
        setTimeout(() => {
          console.log("➡ navigate 실행:", savedProductId);
          navigate(`/app/market/${savedProductId}`);
        }, 300);
      } else {
        // 저장 실패 시 마켓 목록으로 이동하지 않음 (사용자가 다시 시도할 수 있도록)
        console.log("➡ 저장 실패 - 페이지 이동 안 함");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pb-24">
      <Card className="max-w-lg mx-auto shadow-md">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-bold mb-4 text-center">
            {isEditMode ? "✏️ 상품 수정" : "🛒 AI 상품 등록"}
          </h1>

          {/* 📸🎙️ 이미지 + 음성 결합 등록 */}
          <div className="border-b pb-4 mb-4 space-y-3">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-2">
              📸 + 🎙️ 완전 자동화 모드
            </div>
            
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
                if (file) {
                  const previewUrl = URL.createObjectURL(file);
                  setImageUrl(previewUrl);
                }
              }}
            />

            <Button
              onClick={handleVoiceInput}
              disabled={recording || loading}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              {recording ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" /> 녹음 중...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> 🎙️ 음성 입력
                </>
              )}
            </Button>

            {transcript && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>🎧 인식된 음성:</strong> {transcript}
                </p>
              </div>
            )}

            {imageFile && transcript && (
              <button
                onClick={() => handleImageAndVoiceAnalyze(imageFile, transcript)}
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    AI 분석 및 등록 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> 📸🎙️ AI 분석 및 등록
                  </span>
                )}
              </button>
            )}

            {voiceVisionResult && (
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
                {imageUrl && (
                  <div className="flex justify-center mb-3">
                    <img
                      src={imageUrl}
                      alt="preview"
                      className="w-auto max-w-xs md:max-w-sm max-h-60 object-contain rounded-xl border border-neutral-300 shadow-sm"
                      style={{
                        maxWidth: "320px",
                        maxHeight: "240px",
                        width: "auto",
                        height: "auto",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}
                <h2 className="font-semibold text-lg mb-2">
                  상품명: {voiceVisionResult.product.name}
                </h2>
                <p className="text-sm">가격: {voiceVisionResult.product.price}</p>
                <p className="text-sm">카테고리: {voiceVisionResult.product.category}</p>
                {voiceVisionResult.product.aiTags && voiceVisionResult.product.aiTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {voiceVisionResult.product.aiTags.map((t: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 기존 수동 입력 구분선 */}
          <div className="border-t pt-4 mt-4">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              또는 수동으로 입력하기
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="상품명 예: 나이키 축구화"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={generateTitle}
                disabled={titleLoading || (!imageUrl && !name.trim() && !desc.trim())}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition ${
                  titleLoading || (!imageUrl && !name.trim() && !desc.trim())
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 active:scale-95"
                }`}
              >
                {titleLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" /> 생성 중...
                  </span>
                ) : (
                  "📝 AI 제목"
                )}
              </button>
            </div>
            {autoTitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ✨ AI 추천 제목: <span className="font-semibold text-purple-600 dark:text-purple-400">{autoTitle}</span>
              </p>
            )}
            <div className="space-y-2">
              <Input
                placeholder="가격 예: ₩89,000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              
              {/* 💰 AI 가격 추천 버튼 */}
              <button
                type="button"
                onClick={getPriceRecommendation}
                disabled={priceRecommendationLoading || !name.trim() || !category.trim()}
                className={`w-full py-3 rounded-xl font-semibold text-white transition ${
                  priceRecommendationLoading || !name.trim() || !category.trim()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 active:scale-95"
                }`}
              >
                {priceRecommendationLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" /> 가격 분석 중...
                  </span>
                ) : (
                  "💰 AI 가격 추천 받기"
                )}
              </button>

              {/* 가격 추천 결과 표시 */}
              {priceRecommendation && (
                <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        💰 권장 판매가
                      </span>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {priceRecommendation.recommendedPrice?.toLocaleString()}원
                      </span>
                    </div>
                    
                    {priceRecommendation.priceRange && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">추천 범위:</span>{" "}
                        {priceRecommendation.priceRange.min?.toLocaleString()}원 ~{" "}
                        {priceRecommendation.priceRange.max?.toLocaleString()}원
                      </div>
                    )}
                    
                    {priceRecommendation.confidence && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        신뢰도: {Math.round(priceRecommendation.confidence * 100)}%
                      </div>
                    )}
                    
                    {priceRecommendation.reason && (
                      <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">📊 추천 이유:</span> {priceRecommendation.reason}
                      </div>
                    )}
                    
                    {priceRecommendation.marketData && priceRecommendation.marketData.sampleCount > 0 && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                        시장 데이터: 유사 상품 {priceRecommendation.marketData.sampleCount}개 기준
                        {priceRecommendation.marketData.avgPrice && (
                          <span> (평균 {priceRecommendation.marketData.avgPrice.toLocaleString()}원)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* 📍 현재 위치 저장 버튼 */}
            <button
              type="button"
              onClick={handleGetLocation}
              className="w-full mt-2 p-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              📍 현재 위치 저장하기
            </button>

            {latitude && longitude ? (
              <p className="mt-2 text-green-600 text-sm">
                ✅ 저장된 위치 → Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
              </p>
            ) : (
              <p className="mt-2 text-gray-400 text-sm">
                ⚠️ 위치 저장 안됨 (자동으로 기본값 사용)
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="카테고리 예: 축구 / 야구 / 러닝"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={generateCategoryAI}
                  disabled={categoryLoading || (!imageUrl && !name.trim() && !desc.trim())}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition ${
                    categoryLoading || (!imageUrl && !name.trim() && !desc.trim())
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                  }`}
                >
                  {categoryLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin w-4 h-4" /> 분석 중...
                    </span>
                  ) : (
                    "📂 AI 카테고리"
                  )}
                </button>
              </div>

              {/* AI 추천 카테고리 표시 */}
              {autoCategories.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-semibold">
                    ✨ AI 추천 카테고리:
                  </p>
                  <div className="flex flex-col gap-1">
                    {autoCategories.map((cat, index) => (
                      <button
                        key={`${cat}-${index}`}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`text-sm text-left px-3 py-2 rounded-lg transition ${
                          category === cat
                            ? "bg-blue-600 text-white font-semibold"
                            : "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                        }`}
                      >
                        {index + 1}) {cat} {category === cat && "✓"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Textarea
              placeholder="상품 설명 입력"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
            />
          </div>

          {/* 이미지 업로드 */}
          <div className="flex flex-col items-center mt-4">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
                if (file) {
                  const previewUrl = URL.createObjectURL(file);
                  setImageUrl(previewUrl);
                }
              }}
            />
            <button
              onClick={handleUploadAndAnalyze}
              disabled={analyzeLoading || !imageFile}
              className={`w-full mt-2 py-3 rounded-xl font-semibold text-white transition ${
                analyzeLoading || !imageFile
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-500 hover:bg-purple-600 active:scale-95"
              }`}
            >
              {analyzeLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  분석 중...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI 이미지 분석
                </span>
              )}
            </button>
            {/* 디버깅용: 로딩 상태 표시 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 mt-1">
                analyzeLoading: {analyzeLoading ? "true" : "false"} | saveLoading: {saveLoading ? "true" : "false"}
              </div>
            )}
            {errorMsg && (
              <div className="mt-2 text-red-500 text-sm text-center">
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mt-2 text-green-600 text-sm text-center">
                {successMsg}
              </div>
            )}
            {imageUrl && (
              <div className="flex justify-center mt-4 w-full max-w-md mx-auto">
                <img
                  src={imageUrl}
                  alt="preview"
                  className="w-auto max-w-xs md:max-w-sm max-h-60 object-contain rounded-xl border border-neutral-300 shadow-sm"
                  style={{
                    maxWidth: "320px",
                    maxHeight: "240px",
                    width: "auto",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}
          </div>

          {/* AI 태그 자동 생성 */}
          <div className="border-t pt-4 mt-4 space-y-3">
            <Button
              onClick={handleAITags}
              variant="ghost"
              className="flex items-center gap-1 w-full"
            >
              <Sparkles className="w-4 h-4 text-yellow-500" /> AI 태그 생성 (간단)
            </Button>
            
            {/* 🏷️ AI 태그 생성 버튼 (검색 최적화) */}
            <button
              type="button"
              disabled={tagsLoading || (!imageUrl && !name.trim() && !desc.trim())}
              onClick={generateAITags}
              className={`w-full mt-3 rounded-xl py-2 font-semibold text-sm transition ${
                tagsLoading || (!imageUrl && !name.trim() && !desc.trim())
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95"
              }`}
            >
              {tagsLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" /> AI 태그 생성 중...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  🏷️ AI 태그 생성
                </span>
              )}
            </button>

            {/* AI 태그 표시 */}
            {autoTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">AI 생성 태그:</p>
                <div className="flex flex-wrap gap-2">
                  {autoTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 text-xs rounded-lg"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ✨ AI 검색 메타데이터 생성 버튼 */}
            <button
              type="button"
              disabled={tagLoading || (!name.trim() && !desc.trim())}
              onClick={handleGenerateSearchMeta}
              className={`w-full mt-3 rounded-xl py-2 font-semibold text-sm transition ${
                tagLoading || (!name.trim() && !desc.trim())
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-amber-400 hover:bg-amber-500 text-gray-900 active:scale-95"
              }`}
            >
              {tagLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" /> AI 검색 태그 생성 중...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> ✨ AI 검색 태그 생성
                </span>
              )}
            </button>

            {/* 검색 태그 미리보기 */}
            {searchTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">검색 최적화 태그:</p>
                <div className="flex flex-wrap gap-2">
                  {searchTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                {keywordTokens.length > 0 && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    검색 토큰: {keywordTokens.slice(0, 5).join(", ")}
                    {keywordTokens.length > 5 && ` +${keywordTokens.length - 5}개`}
                  </p>
                )}
              </div>
            )}
            
            {/* 기존 AI 태그 표시 (호환성) */}
            {aiTags.length > 0 && searchTags.length === 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {aiTags.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 에러/성공 메시지 표시 */}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm text-center">
                ⚠️ {errorMsg}
              </p>
            </div>
          )}
          {successMsg && (
            <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-green-600 dark:text-green-400 text-sm text-center">
                {successMsg}
              </p>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saveLoading || analyzeLoading}
            className={`w-full mt-6 text-white transition ${
              saveLoading || analyzeLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
            }`}
          >
            {saveLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" /> 
                {imageFile ? "이미지 업로드 및 저장 중..." : "저장 중..."}
              </span>
            ) : analyzeLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" /> AI 분석 중...
              </span>
            ) : (
              isEditMode ? "수정 완료" : "상품 등록 완료"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

