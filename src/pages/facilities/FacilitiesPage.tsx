// src/pages/facilities/FacilitiesPage.tsx
// 🔥 시설 페이지 (MVP)

import { useSearchParams } from "react-router-dom";

export default function FacilitiesPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "football";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">근처 시설</h1>
        <p className="text-gray-500">시설 목록 (준비중) - {type}</p>
      </div>
    </div>
  );
}

