/**
 * 🔥 위치 품질 대시보드
 * 
 * 목적: 위치 데이터 품질을 한눈에 파악하고 문제 상품을 즉시 식별
 * 
 * 기능:
 * - KPI 지표 표시 (전체 상품, 위치 누락, 행정동 누락, 거리 이상치)
 * - 문제 상품 테이블
 * - 재변환 기능
 * - 품질 스코어 계산
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, getDocs, where, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, AlertCircle, CheckCircle, MapPin, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";
import { getDistanceKm } from "@/utils/geo";
import { isInvalidDistance } from "@/utils/distanceValidation";
import { useUserLocation } from "@/hooks/useUserLocation";

interface ProductQuality {
  id: string;
  name: string;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  hasCoords: boolean;
  hasLocationText: boolean;
  distanceKm: number | null;
  distanceStatus: "VALID" | "ZERO_DISTANCE" | "OUT_OF_RANGE" | "NULL" | null;
  qualityScore: number;
  qualityStatus: "🟢 정상" | "🟡 주의" | "🔴 조치 필요";
  createdAt?: any;
}

export default function LocationQualityDashboard() {
  const navigate = useNavigate();
  const { loc: userLoc } = useUserLocation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductQuality[]>([]);
  const [reconverting, setReconverting] = useState<string | null>(null);

  // 📊 KPI 계산
  const kpis = useMemo(() => {
    const total = products.length;
    const missingCoords = products.filter((p) => !p.hasCoords).length;
    const missingLocationText = products.filter((p) => !p.hasLocationText).length;
    const zeroDistance = products.filter((p) => p.distanceStatus === "ZERO_DISTANCE").length;
    const outOfRange = products.filter((p) => p.distanceStatus === "OUT_OF_RANGE").length;
    const anomalyTotal = zeroDistance + outOfRange;

    return {
      total,
      missingCoords,
      missingLocationText,
      zeroDistance,
      outOfRange,
      anomalyTotal,
    };
  }, [products]);

  // 🔥 상품 데이터 로드
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, "marketProducts");
        const snapshot = await getDocs(productsRef);
        
        const loaded: ProductQuality[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const id = docSnap.id;
          
          const lat = data.latitude != null ? Number(data.latitude) : null;
          const lng = data.longitude != null ? Number(data.longitude) : null;
          const hasCoords = 
            lat != null && 
            lng != null &&
            !Number.isNaN(lat) &&
            !Number.isNaN(lng) &&
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180;
          
          const hasLocationText = 
            data.locationText != null && 
            data.locationText.trim() !== "" &&
            data.locationText !== "위치 정보 없음";
          
          // 🔥 거리 계산 (사용자 위치가 있을 때만)
          let distanceKm: number | null = null;
          let distanceStatus: "VALID" | "ZERO_DISTANCE" | "OUT_OF_RANGE" | "NULL" | null = null;
          
          if (hasCoords && userLoc && lat != null && lng != null) {
            try {
              const distance = getDistanceKm(userLoc, { lat, lng });
              if (Number.isFinite(distance) && distance >= 0) {
                distanceKm = distance;
                
                if (isInvalidDistance(distance)) {
                  if (distance < 0.01) {
                    distanceStatus = "ZERO_DISTANCE";
                  } else if (distance > 100) {
                    distanceStatus = "OUT_OF_RANGE";
                  }
                } else {
                  distanceStatus = "VALID";
                }
              } else {
                distanceStatus = "NULL";
              }
            } catch {
              distanceStatus = "NULL";
            }
          } else {
            distanceStatus = "NULL";
          }
          
          // 🔥 품질 스코어 계산
          let score = 100;
          if (!hasCoords) score -= 60;
          if (!hasLocationText) score -= 20;
          if (distanceStatus === "ZERO_DISTANCE") score -= 10;
          if (distanceStatus === "OUT_OF_RANGE") score -= 10;
          
          const qualityStatus: "🟢 정상" | "🟡 주의" | "🔴 조치 필요" =
            score >= 80 ? "🟢 정상" :
            score >= 50 ? "🟡 주의" :
            "🔴 조치 필요";
          
          loaded.push({
            id,
            name: data.name || "이름 없음",
            locationText: data.locationText || null,
            latitude: lat,
            longitude: lng,
            hasCoords,
            hasLocationText,
            distanceKm,
            distanceStatus,
            qualityScore: score,
            qualityStatus,
            createdAt: data.createdAt,
          });
        }
        
        // 🔥 품질 점수 순으로 정렬 (낮은 점수 우선)
        loaded.sort((a, b) => a.qualityScore - b.qualityScore);
        
        setProducts(loaded);
      } catch (error: any) {
        console.error("❌ 위치 품질 데이터 로드 실패:", error);
        toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, [userLoc]);

  // 🔥 재변환 기능
  const handleReconvert = async (productId: string, lat: number, lng: number) => {
    setReconverting(productId);
    
    try {
      // 🔥 Cloud Function 호출
      const { GEOCODE_LOCATION_ENDPOINT } = await import("@/config/env");
      const geocodeUrl = `${GEOCODE_LOCATION_ENDPOINT}?latitude=${lat}&longitude=${lng}`;
      
      const response = await fetch(geocodeUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.locationText) {
        throw new Error(data.error || "Geocoding 실패");
      }
      
      // 🔥 Firestore 업데이트
      const productRef = doc(db, "marketProducts", productId);
      await updateDoc(productRef, {
        locationText: data.locationText,
        address: data.locationText,
        addressShort: data.addressShort || null,
        region1: data.region1 || null,
        region2: data.region2 || null,
        region3: data.region3 || null,
        updatedAt: serverTimestamp(),
      });
      
      toast.success("행정동 변환 완료!");
      
      // 🔥 데이터 재로드
      const loadProducts = async () => {
        const productsRef = collection(db, "marketProducts");
        const snapshot = await getDocs(productsRef);
        
        const loaded: ProductQuality[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const id = docSnap.id;
          
          const lat = data.latitude != null ? Number(data.latitude) : null;
          const lng = data.longitude != null ? Number(data.longitude) : null;
          const hasCoords = 
            lat != null && 
            lng != null &&
            !Number.isNaN(lat) &&
            !Number.isNaN(lng) &&
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180;
          
          const hasLocationText = 
            data.locationText != null && 
            data.locationText.trim() !== "" &&
            data.locationText !== "위치 정보 없음";
          
          let distanceKm: number | null = null;
          let distanceStatus: "VALID" | "ZERO_DISTANCE" | "OUT_OF_RANGE" | "NULL" | null = null;
          
          if (hasCoords && userLoc && lat != null && lng != null) {
            try {
              const distance = getDistanceKm(userLoc, { lat, lng });
              if (Number.isFinite(distance) && distance >= 0) {
                distanceKm = distance;
                
                if (isInvalidDistance(distance)) {
                  if (distance < 0.01) {
                    distanceStatus = "ZERO_DISTANCE";
                  } else if (distance > 100) {
                    distanceStatus = "OUT_OF_RANGE";
                  }
                } else {
                  distanceStatus = "VALID";
                }
              } else {
                distanceStatus = "NULL";
              }
            } catch {
              distanceStatus = "NULL";
            }
          } else {
            distanceStatus = "NULL";
          }
          
          let score = 100;
          if (!hasCoords) score -= 60;
          if (!hasLocationText) score -= 20;
          if (distanceStatus === "ZERO_DISTANCE") score -= 10;
          if (distanceStatus === "OUT_OF_RANGE") score -= 10;
          
          const qualityStatus: "🟢 정상" | "🟡 주의" | "🔴 조치 필요" =
            score >= 80 ? "🟢 정상" :
            score >= 50 ? "🟡 주의" :
            "🔴 조치 필요";
          
          loaded.push({
            id,
            name: data.name || "이름 없음",
            locationText: data.locationText || null,
            latitude: lat,
            longitude: lng,
            hasCoords,
            hasLocationText,
            distanceKm,
            distanceStatus,
            qualityScore: score,
            qualityStatus,
            createdAt: data.createdAt,
          });
        }
        
        loaded.sort((a, b) => a.qualityScore - b.qualityScore);
        setProducts(loaded);
      };
      
      await loadProducts();
    } catch (error: any) {
      console.error("❌ 재변환 실패:", error);
      toast.error(`재변환 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setReconverting(null);
    }
  };

  // 🔥 문제 상품만 필터링
  const problemProducts = useMemo(() => {
    return products.filter((p) => p.qualityScore < 80);
  }, [products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📍 위치 품질 대시보드
          </h1>
          <p className="text-gray-600">
            위치 데이터 품질을 한눈에 파악하고 문제 상품을 즉시 식별
          </p>
        </div>

        {/* 📊 KPI 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">전체 상품</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{kpis.total}</div>
            </CardContent>
          </Card>

          <Card className={kpis.missingCoords > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                좌표 없는 상품
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{kpis.missingCoords}</div>
              {kpis.missingCoords > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {((kpis.missingCoords / kpis.total) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={kpis.missingLocationText > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-yellow-500" />
                행정동 없는 상품
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{kpis.missingLocationText}</div>
              {kpis.missingLocationText > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  {((kpis.missingLocationText / kpis.total) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={kpis.zeroDistance > 0 ? "border-orange-200 bg-orange-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">거리 &lt; 10m</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{kpis.zeroDistance}</div>
            </CardContent>
          </Card>

          <Card className={kpis.outOfRange > 0 ? "border-purple-200 bg-purple-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">거리 &gt; 100km</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{kpis.outOfRange}</div>
            </CardContent>
          </Card>

          <Card className={kpis.anomalyTotal > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">거리 이상치 총계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{kpis.anomalyTotal}</div>
            </CardContent>
          </Card>
        </div>

        {/* 🔥 문제 상품 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>문제 상품 목록 (품질 점수 &lt; 80)</span>
              <Badge variant="destructive">{problemProducts.length}개</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {problemProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>문제 상품이 없습니다. 모든 상품이 정상입니다! 🎉</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">상품명</th>
                      <th className="text-left p-2 font-medium">행정동</th>
                      <th className="text-left p-2 font-medium">좌표</th>
                      <th className="text-left p-2 font-medium">거리 상태</th>
                      <th className="text-left p-2 font-medium">품질 점수</th>
                      <th className="text-left p-2 font-medium">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problemProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{product.name}</td>
                        <td className="p-2">
                          {product.locationText ? (
                            <span className="text-gray-700">{product.locationText}</span>
                          ) : (
                            <span className="text-red-500">없음</span>
                          )}
                        </td>
                        <td className="p-2">
                          {product.hasCoords ? (
                            <span className="text-green-600">✅ 있음</span>
                          ) : (
                            <span className="text-red-500">❌ 없음</span>
                          )}
                        </td>
                        <td className="p-2">
                          {product.distanceStatus === "VALID" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              정상 ({product.distanceKm?.toFixed(2)}km)
                            </Badge>
                          )}
                          {product.distanceStatus === "ZERO_DISTANCE" && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                              &lt; 10m
                            </Badge>
                          )}
                          {product.distanceStatus === "OUT_OF_RANGE" && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              &gt; 100km
                            </Badge>
                          )}
                          {product.distanceStatus === "NULL" && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              계산 불가
                            </Badge>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{product.qualityScore}점</span>
                            <Badge
                              variant={
                                product.qualityScore >= 80
                                  ? "default"
                                  : product.qualityScore >= 50
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {product.qualityStatus}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            {product.hasCoords && product.latitude != null && product.longitude != null && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReconvert(product.id, product.latitude!, product.longitude!)
                                }
                                disabled={reconverting === product.id}
                              >
                                {reconverting === product.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    변환 중...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCcw className="w-3 h-3 mr-1" />
                                    재변환
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/app/market/edit/${product.id}`)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              수정
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

