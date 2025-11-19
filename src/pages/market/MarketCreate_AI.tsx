import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { app, db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

function createTtsMessage(data: any): string {
  if (!data) return "";
  const brandPart = data.brand ? `${data.brand} ` : "";
  const categoryPart = data.category || "상품";
  const pricePart = data.price ? `${Number(data.price).toLocaleString()}원` : "가격 정보 없음";
  const summaryPart = data.summary ? ` 요약: ${data.summary}` : "";
  return `이 상품은 ${brandPart}${categoryPart}이며, 추천가는 ${pricePart}입니다.${summaryPart}`;
}

function playTts(message: string) {
  if (!message || typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(message);
  utter.lang = "ko-KR";
  utter.rate = 1.0;
  synth.speak(utter);
}

function AITTSReader({ result }: { result: string }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!result) return;

    const synth = window.speechSynthesis;

    if (isPlaying) {
      synth.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(result);
    utterance.lang = "ko-KR";
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onend = () => setIsPlaying(false);
    synth.cancel();
    synth.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <button
        onClick={handleSpeak}
        className={`px-4 py-2 rounded-xl shadow ${isPlaying ? "bg-red-500" : "bg-blue-500"} text-white`}
      >
        {isPlaying ? "🔇 음성 중지" : "🔊 분석 결과 듣기"}
      </button>
    </div>
  );
}

export default function MarketCreate_AI() {
  const [user, setUser] = useState<User | null>(null);
  const [, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const storage = getStorage(app);
  const AI_ANALYZE_URL =
    import.meta.env.VITE_AI_ANALYZE_URL ||
    "https://aianalyze-2q3hdcfwca-uc.a.run.app";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ 파일 업로드 + AI 분석 자동 실행
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setAiResult(null);
    setLoading(true);
    setSaved(false);

    try {
      // ✅ Firebase Storage 업로드
      const storageRef = ref(storage, `marketUploads/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setImageUrl(downloadURL);

      console.log("✅ 업로드 완료:", downloadURL);

      // ✅ AI 분석 호출
      const res = await fetch(AI_ANALYZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: downloadURL, description }),
      });
      const data = await res.json();
      console.log("✅ AI 분석 결과:", data);
      setAiResult(data);

      // 현재 위치 가져오기 (좌표 저장) - 안전장치 포함
      const defaultLat = 37.5665; // 서울 시청 기본값
      const defaultLng = 126.9780;
      
      let latitude: number | null = null;
      let longitude: number | null = null;
      let locationText = "위치 정보없음";

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
            latitude = rawLat;
          } else {
            latitude = defaultLat;
            console.warn("⚠️ 유효하지 않은 위도, 기본값 사용:", rawLat);
          }
          
          if (
            typeof rawLng === "number" &&
            !Number.isNaN(rawLng) &&
            rawLng >= -180 &&
            rawLng <= 180
          ) {
            longitude = rawLng;
          } else {
            longitude = defaultLng;
            console.warn("⚠️ 유효하지 않은 경도, 기본값 사용:", rawLng);
          }
          
          locationText = `위도: ${latitude.toFixed(6)}, 경도: ${longitude.toFixed(6)}`;
          console.log("📍 현재 위치 저장:", { latitude, longitude });
        } else {
          // Geolocation API가 없으면 기본값 사용
          latitude = defaultLat;
          longitude = defaultLng;
          locationText = `위도: ${defaultLat.toFixed(6)}, 경도: ${defaultLng.toFixed(6)} (기본값)`;
          console.log("📍 Geolocation API 없음, 기본값 사용:", { latitude, longitude });
        }
      } catch (geoError) {
        console.warn("⚠️ 위치 정보를 가져올 수 없습니다:", geoError);
        // 위치 권한이 없어도 기본값으로 저장
        latitude = defaultLat;
        longitude = defaultLng;
        locationText = `위도: ${defaultLat.toFixed(6)}, 경도: ${defaultLng.toFixed(6)} (기본값)`;
      }
      
      // 최종 안전장치: null이면 기본값 강제 적용
      latitude = latitude ?? defaultLat;
      longitude = longitude ?? defaultLng;

      // 최종 검증: 숫자가 아니면 기본값 강제 적용
      if (typeof latitude !== "number" || Number.isNaN(latitude)) {
        console.warn("⚠️ 최종 검증: 위도가 유효하지 않아 기본값 사용");
        latitude = defaultLat;
      }
      if (typeof longitude !== "number" || Number.isNaN(longitude)) {
        console.warn("⚠️ 최종 검증: 경도가 유효하지 않아 기본값 사용");
        longitude = defaultLng;
      }

      // location 필드: 사용자 친화적인 형식
      const finalLocation = locationText || `서울특별시 중구 세종대로 110 (위도: ${latitude.toFixed(6)}, 경도: ${longitude.toFixed(6)})`;

      console.log("📍 저장할 좌표:", { latitude, longitude, location: finalLocation });

      // ✅ Firestore 저장 (표준 필드 구조)
      const productData = {
        name: data?.name || "AI 상품",
        price: Number(data?.price || 0),
        category: data?.category || "미분류",
        description: description || data?.summary || "",
        latitude: latitude,
        longitude: longitude,
        imageUrl: downloadURL || null,
        tags: [],
        userId: user?.uid || null,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "marketProducts"), productData);
      const productId = docRef.id;
      console.log("✅ Firestore 저장 완료:", docRef.id);
      setSaved(true);

      // ✅ 분석 결과 음성으로 읽기
      playTts(createTtsMessage(data));
    } catch (err) {
      console.error("❌ 업로드/AI 분석/저장 오류:", err);
      alert("AI 분석 또는 Firestore 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center">🤖 AI 상품 등록</h1>

      {/* 이미지 업로드 */}
      <label className="block border rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50">
        {loading ? (
          <p className="text-gray-500">AI 분석 중...</p>
        ) : (
          <>
            <p className="text-gray-600">
              {imageUrl ? "📸 새 이미지 업로드 (다시 분석)" : "이미지 업로드 클릭"}
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        )}
      </label>

      {/* 이미지 미리보기 */}
      {imageUrl && (
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt="상품 미리보기"
            className="w-48 h-48 object-cover rounded-lg shadow"
          />
        </div>
      )}

      {/* 설명 입력 */}
      <textarea
        placeholder="상품 설명을 입력하세요 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded p-2"
        rows={3}
      />

      {/* 결과 표시 */}
      {aiResult && (
        <Card className="border mt-4">
          <CardHeader>
            <h2 className="font-semibold text-lg">🧠 AI 분석 결과</h2>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {aiResult.category && (
              <p>
                <strong>카테고리:</strong> {aiResult.category}
              </p>
            )}
            {aiResult.brand && (
              <p>
                <strong>브랜드:</strong> {aiResult.brand}
              </p>
            )}
            {aiResult.price && (
              <p>
                <strong>추천가:</strong>{" "}
                {aiResult.price.toLocaleString()}원
              </p>
            )}
            {aiResult.summary && (
              <p>
                <strong>요약:</strong> {aiResult.summary}
              </p>
            )}
            <AITTSReader result={createTtsMessage(aiResult)} />
          </CardContent>
        </Card>
      )}

      {/* 등록 완료 메시지 */}
      {saved && (
        <p className="text-center text-green-600 font-medium mt-2">
          ✅ Firestore에 상품 등록 완료!
        </p>
      )}
    </div>
  );
}
