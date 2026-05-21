/**
 * 🧠 Movement 진입점 컴포넌트
 * 
 * "오늘 운동하러 가는 길이에요?"
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { inferDestination, inferIntent, getCurrentTimeContext } from "@/services/movementInference";
import { getUserLocation } from "@/lib/getUserLocation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MovementEntryProps {
  onStartNavigation: (destination: {
    lat: number;
    lng: number;
    name: string;
    type: string;
    id?: string;
  }) => void;
}

export function MovementEntry({ onStartNavigation }: MovementEntryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInferring, setIsInferring] = useState(false);
  const [inferredDestination, setInferredDestination] = useState<{
    destination: { lat: number; lng: number; name: string; type: string; id?: string };
    reason: string;
  } | null>(null);

  const handleYes = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setIsInferring(true);

    try {
      // 현재 위치 가져오기
      const currentLocation = await getUserLocation();
      
      // 시간 컨텍스트
      const timeContext = getCurrentTimeContext();
      
      // 목적지 추론
      const result = await inferDestination(user.uid, {
        ...timeContext,
        ...currentLocation,
      });

      if (result.destination) {
        setInferredDestination({
          destination: result.destination,
          reason: result.reason,
        });
      } else {
        // 추론 실패 시 일반 지도로 이동
        navigate("/general-map");
      }
    } catch (error) {
      console.error("❌ [MovementEntry] 추론 실패:", error);
      navigate("/general-map");
    } finally {
      setIsInferring(false);
    }
  };

  const handleConfirm = () => {
    if (inferredDestination) {
      onStartNavigation(inferredDestination.destination);
    }
  };

  const handleReject = () => {
    // 일반 지도로 이동 (사용자가 직접 선택)
    navigate("/general-map");
  };

  if (isInferring) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-sm text-gray-600">이동 패턴을 확인하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (inferredDestination) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-gray-800">
            {inferredDestination.reason}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {inferredDestination.destination.name}
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1"
            >
              아니야
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              맞아
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="text-center space-y-6">
        <p className="text-2xl font-bold text-gray-900">
          오늘 운동하러 가는 길이에요?
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleYes}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            응
          </Button>
          <Button
            onClick={() => navigate("/general-map")}
            variant="outline"
            className="flex-1"
          >
            아니
          </Button>
        </div>
      </div>
    </Card>
  );
}
