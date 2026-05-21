/**
 * 🔥 만남 인증 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 장소 도착 시 체크인 버튼 활성
 * - GPS 위치 확인
 * - QR 코드 상호 인증
 */

import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle, XCircle, QrCode } from "lucide-react";

interface MeetVerifyProps {
  tradeId: string;
  meetingPlace?: { lat: number; lng: number; name?: string };
  onVerified?: () => void;
}

export default function MeetVerify({
  tradeId,
  meetingPlace,
  onVerified,
}: MeetVerifyProps) {
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  // 🔥 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error("❌ 위치 가져오기 실패:", err);
          setError("위치 정보를 가져올 수 없습니다.");
        }
      );
    } else {
      setError("위치 서비스를 사용할 수 없습니다.");
    }
  }, []);

  // 🔥 거리 계산
  useEffect(() => {
    if (userLocation && meetingPlace) {
      const R = 6371000; // 지구 반지름 (미터)
      const dLat = ((meetingPlace.lat - userLocation.lat) * Math.PI) / 180;
      const dLon = ((meetingPlace.lng - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((meetingPlace.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const calculatedDistance = R * c;
      setDistance(calculatedDistance);
    }
  }, [userLocation, meetingPlace]);

  const handleCheckIn = async () => {
    if (!userLocation) {
      setError("위치 정보가 없습니다.");
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const meetCheckIn = httpsCallable(functions, "meetCheckInCallable");
      const result = await meetCheckIn({
        tradeId,
        location: userLocation,
        meetingPlace,
      });

      const data = result.data as { success: boolean; verified: boolean; distance?: number };

      if (data.success && data.verified) {
        setVerified(true);
        if (onVerified) {
          onVerified();
        }
      } else {
        setError(`거래 장소에서 너무 멀리 있습니다. (${Math.round(data.distance || 0)}m)`);
      }
    } catch (err: any) {
      console.error("❌ [MeetVerify] 체크인 실패:", err);
      setError(err.message || "체크인 중 오류가 발생했습니다.");
    } finally {
      setChecking(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const generateQR = httpsCallable(functions, "generateQRCodeCallable");
      const result = await generateQR({ tradeId });
      const data = result.data as { success: boolean; qrData: string };

      if (data.success) {
        setQrData(data.qrData);
        setShowQR(true);
      }
    } catch (err: any) {
      console.error("❌ [MeetVerify] QR 생성 실패:", err);
      setError(err.message || "QR 코드 생성 중 오류가 발생했습니다.");
    }
  };

  const isNearby = distance !== null && distance <= 100; // 100미터 이내

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        만남 인증
      </h3>

      {meetingPlace && (
        <div className="text-sm text-gray-600">
          <p className="font-medium">거래 장소: {meetingPlace.name || "설정된 장소"}</p>
          {distance !== null && (
            <p className="mt-1">
              거리: {Math.round(distance)}m
              {isNearby && (
                <span className="ml-2 text-green-600 font-semibold">✓ 도착 확인</span>
              )}
            </p>
          )}
        </div>
      )}

      {verified ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">인증 완료</span>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCheckIn}
              disabled={!isNearby || checking || !userLocation}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {checking ? "체크인 중..." : "장소 도착 체크인"}
            </Button>

            <Button
              onClick={handleGenerateQR}
              variant="outline"
              className="flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              QR 인증
            </Button>
          </div>

          {!isNearby && distance !== null && (
            <p className="text-sm text-yellow-600">
              거래 장소에서 100m 이내로 이동해주세요.
            </p>
          )}
        </>
      )}

      {showQR && qrData && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-2">QR 코드를 상대방에게 보여주세요</p>
          <div className="p-4 bg-white rounded border border-gray-300 text-center">
            <QrCode className="w-32 h-32 mx-auto text-gray-400" />
            <p className="mt-2 text-xs text-gray-500 break-all">{qrData}</p>
          </div>
        </div>
      )}
    </div>
  );
}
