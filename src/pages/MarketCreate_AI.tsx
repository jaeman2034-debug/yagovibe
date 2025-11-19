import React, { useState } from "react";
import CameraButton from "@/components/CameraButton";

const MarketCreate_AI: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSelected = (imageUrl: string, base64?: string) => {
    setPreview(imageUrl);
    // base64 데이터를 저장하여 나중에 업로드에 사용할 수 있음
    console.log("이미지 선택됨:", imageUrl, base64 ? "Base64 포함" : "URI만");
  };

  const handleAIAnalyze = () => {
    alert("AI 이미지 분석 실행 (Vision API 연결 예정)");
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-extrabold text-gray-800">
        🛒 AI 상품 등록
      </h1>

      <div className="mb-6 flex w-full max-w-md flex-col items-center">
        <label className="mb-2 block font-semibold text-gray-700">상품 이미지</label>

        <div
          className="relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-100"
          style={{
            width: "100%",
            maxWidth: "340px",
            height: "220px",
            minHeight: "200px",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="상품 미리보기"
              style={{
                objectFit: "contain",
                width: "100%",
                height: "100%",
                display: "block",
              }}
            />
          ) : (
            <span className="text-sm text-gray-400">이미지를 선택해주세요</span>
          )}
        </div>

        {/* 고화질 카메라 버튼 (모바일 앱에서 네이티브 카메라 사용) */}
        <div className="mt-3 w-full">
          <CameraButton
            onImageSelected={handleImageSelected}
            label="📷 카메라로 촬영 (고화질)"
            showGallery={true}
          />
        </div>

        {/* 기존 파일 선택 (웹 환경 fallback) */}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageChange} 
          className="mt-3 w-full text-sm text-gray-600" 
        />

        <button onClick={handleAIAnalyze} className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-white shadow transition hover:bg-indigo-600">
          ⚙️ AI 이미지 분석
        </button>
      </div>

      <div className="w-full max-w-md space-y-3">
        <input
          type="text"
          placeholder="상품명 예: 나이키 축구화"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="text"
          placeholder="가격 예: ₩89,000"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="text"
          placeholder="카테고리 예: 축구 / 야구 / 러닝"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <textarea
          placeholder="상품 설명 입력"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <button onClick={() => alert("상품이 등록되었습니다.")} className="mt-6 rounded-lg bg-green-600 px-6 py-2 text-white shadow transition hover:bg-green-700">
        ✅ 상품 등록 완료
      </button>
    </div>
  );
};

export default MarketCreate_AI;
