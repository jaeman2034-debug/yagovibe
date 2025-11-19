import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, Sparkles, Mic } from "lucide-react";
import { testFirestoreConnection } from "@/testFirestoreConnection";

export default function MarketAddPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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

  const uploadFileAndGetUrl = useCallback(
    async (file: File, user: User) => {
      const storageRef = ref(
        storage,
        `marketProducts/${user.uid}/${Date.now()}-${file.name}`
      );
      console.log("📤 업로드 시작:", storageRef.fullPath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      const url = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
          async (error) => {
            console.error(
              "❌ 업로드 오류:",
              error.code,
              error.message,
              (error as any)?.serverResponse ?? "(serverResponse 없음)"
            );
            if (error.code === "storage/retry-limit-exceeded") {
              try {
                const downloadUrl = await getDownloadURL(storageRef);
                console.log("⚠️ 업로드 재시도 실패, 기존 객체 URL 사용:", downloadUrl);
                resolve(downloadUrl);
                return;
              } catch (fallbackError) {
                console.error("❌ 업로드 실패 후 URL 획득 실패:", fallbackError);
              }
            }
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              console.log("✅ 업로드 성공 URL:", downloadUrl);
              resolve(downloadUrl);
            } catch (urlError) {
              console.error("❌ 다운로드 URL 획득 실패:", urlError);
              reject(urlError);
            }
          }
        );
      });
      console.log("✅ 업로드 완료 URL:", url);
      return url;
    },
    []
  );

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
      setLoading(true);
      const url = await uploadFileAndGetUrl(imageFile, user);
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
    if (!imageFile) {
      setErrorMsg("먼저 이미지를 선택해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/handleImageAndVoiceAnalyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("서버 응답 없음");
      }

      const data = await response.json();
      console.log("AI 분석 응답:", data);

      // AI 분석 결과를 폼에 자동 채우기 (강화 버전 - 더 많은 필드 지원)
      if (data?.productName) setName(data.productName || "");
      if (data?.description) setDesc(data.description || "");
      if (data?.category) setCategory(data.category || "");
      if (data?.price) setPrice(data.price || "");
      if (data?.brand) {
        // 브랜드 정보가 있으면 상품명에 포함하거나 별도 표시
        if (!name && data.brand) {
          setName(`${data.brand} ${data.productName || ""}`.trim());
        }
      }
      if (data?.condition) {
        // 상태 정보 저장
        setCondition(data.condition);
        // 상태 정보를 설명에 추가
        const conditionText = data.condition === "상" ? "상태 좋음" : data.condition === "중" ? "보통 상태" : "사용감 있음";
        if (desc) {
          setDesc(`${desc} (${conditionText})`);
        } else {
          setDesc(conditionText);
        }
      }
      if (data?.tags && Array.isArray(data.tags)) {
        setAiTags(data.tags);
      } else if (data?.aiTags && Array.isArray(data.aiTags)) {
        setAiTags(data.aiTags);
      }

      // 이미지 URL이 있으면 설정
      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
      } else if (imageFile) {
        // 이미지 미리보기 유지
        const previewUrl = URL.createObjectURL(imageFile);
        setImageUrl(previewUrl);
      }

      setSuccessMsg("✅ AI 분석이 완료되었습니다!");
    } catch (error: any) {
      console.error("이미지+음성 분석 오류:", error);
      setErrorMsg(
        "⚠️ AI 분석 서버가 응답하지 않습니다.\n" +
        "현재는 이미지 기반 자동 인식 기능을 사용할 수 없습니다.\n" +
        "직접 입력하거나 나중에 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
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
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/generateAITags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim(),
            description: desc.trim(),
            conditionScore: condition === "상" ? 0.8 : condition === "중" ? 0.5 : 0.3,
            imageQualityScore: 0.7, // 기본값
            imageUrl: imageUrl || null,
          }),
        }
      );

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
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/generateSearchMeta`,
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

      const data = await response.json();
      console.log("✨ AI 검색 메타데이터 생성 결과:", data);

      // 검색 메타데이터 설정
      if (data?.tags && Array.isArray(data.tags)) {
        setSearchTags(data.tags);
        // 기존 aiTags도 함께 업데이트 (호환성)
        setAiTags(data.tags);
      }
      if (data?.keywordTokens && Array.isArray(data.keywordTokens)) {
        setKeywordTokens(data.keywordTokens);
      }
      if (data?.searchText) {
        setSearchText(data.searchText);
      }

      setSuccessMsg("✅ AI 검색 태그가 생성되었습니다!");
    } catch (error: any) {
      console.error("✨ AI 검색 메타데이터 생성 오류:", error);
      setErrorMsg("⚠️ AI 태그 생성에 실패했습니다. 나중에 다시 시도해주세요.");
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
      // 1. Firebase Storage에 이미지 업로드
      const imageUrl = await uploadFileAndGetUrl(file, user);
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

  // 🔹 Firestore 저장 (안전 가드: base64 → Storage 업로드 후 URL 저장)
  const handleSave = async () => {
    if (!name.trim() || !price) {
      setErrorMsg("필수 항목을 모두 입력해주세요.");
      return;
    }

    try {
      const user = await ensureAuthenticated();
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      let finalImageUrl = imageUrl;

      if (imageFile) {
        finalImageUrl = await uploadFileAndGetUrl(imageFile, user);
        setImageUrl(finalImageUrl);
      } else if (imageUrl?.startsWith("data:")) {
        console.log("📤 이미지 업로드 시작 (data URL)...");
        const resp = await fetch(imageUrl);
        const blob = await resp.blob();
        finalImageUrl = await uploadFileAndGetUrl(
          new File([blob], "embedded.png", { type: blob.type }),
          user
        );
        setImageUrl(finalImageUrl);
      }

      const numericPrice = Number(
        typeof price === "number"
          ? price
          : String(price).replace(/[^\d.-]/g, "")
      );
      const storedPrice = Number.isFinite(numericPrice) ? numericPrice : null;

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

      console.log("💾 Firestore 저장 시작...");
      console.log("📍 저장할 좌표:", { latitude: finalLatitude, longitude: finalLongitude });
      
      // 📝 한줄 요약 생성 (저장 전에 자동 생성)
      let finalOneLineSummary = oneLineSummary;
      if (!finalOneLineSummary && (finalImageUrl || name.trim() || desc.trim())) {
        try {
          const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
            "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

          const summaryResponse = await fetch(
            `${functionsOrigin}/generateOneLineSummary`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: name.trim(),
                description: desc.trim(),
                category: category.trim(),
                conditionScore: condition === "상" ? 0.8 : condition === "중" ? 0.5 : 0.3,
                imageQualityScore: 0.7,
                components: [],
                fraud: { label: "low" },
                imageUrl: finalImageUrl || null,
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
      }

      // 표준 필드 구조로 저장 (MarketPage, DetailPage와 호환)
      const productData = {
        name: name.trim(),
        price: storedPrice,
        category: category.trim(),
        description: desc.trim(),
        latitude: finalLatitude,
        longitude: finalLongitude,
        imageUrl: finalImageUrl || null,
        tags: searchTags.length > 0 ? searchTags : aiTags, // 검색 최적화 태그 우선 사용
        keywordTokens: keywordTokens.length > 0 ? keywordTokens : [], // Firestore 검색용 토큰
        searchText: searchText || `${name.trim()} ${category.trim()} ${desc.trim()}`.trim(), // 통합 검색용 텍스트
        aiOneLine: finalOneLineSummary || "", // AI 한줄 요약 (리스트용)
        userId: user.uid,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "marketProducts"), productData);
      const productId = docRef.id;
      
      console.log("✅ Firestore 저장 완료! 상품 ID:", productId);
      console.log("🪪 저장된 데이터:", productData);
      setSuccessMsg("✅ 상품이 등록되었습니다!");
      
      // 등록 완료 후 상품 상세 페이지로 이동
      setTimeout(() => {
        navigate(`/app/market/${productId}`);
      }, 1500);
    } catch (error: any) {
      if (error?.message === "로그인이 필요합니다.") {
        setErrorMsg("로그인 후 이용해주세요.");
        return;
      }
      console.error("❌ 상품 저장 오류:", error);
      setErrorMsg("상품 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pb-24">
      <Card className="max-w-lg mx-auto shadow-md">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-bold mb-4 text-center">🛒 AI 상품 등록</h1>

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
              disabled={loading || !imageFile}
              className={`w-full mt-2 py-3 rounded-xl font-semibold text-white transition ${
                loading || !imageFile
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-500 hover:bg-purple-600 active:scale-95"
              }`}
            >
              {loading ? (
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
            disabled={loading}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" /> 저장 중...
              </span>
            ) : (
              "상품 등록 완료"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

