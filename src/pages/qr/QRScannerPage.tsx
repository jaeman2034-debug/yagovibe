import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, AlertCircle } from 'lucide-react';

/**
 * 🔹 1단계: QR 스캔 화면
 * 
 * 플로우:
 * QR 스캔 → 팀 정보 파싱 → 팀 미리보기 화면으로 이동
 */
export default function QRScannerPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // QR 코드 스캔 시작
  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      // 카메라 접근
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // 후면 카메라 우선
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // TODO: QR 코드 라이브러리 연동 (예: html5-qrcode, jsQR)
      // 여기서는 시뮬레이션으로 처리
      
    } catch (err: any) {
      console.error('QR 스캔 오류:', err);
      setError('카메라 접근 권한이 필요합니다.');
      setScanning(false);
    }
  };

  // QR 코드 파싱 및 이동
  const handleQRCodeDetected = (qrData: string) => {
    try {
      // QR 형식: https://yagovibe.com/qr?invite=INV_xxxxx
      const url = new URL(qrData);
      const inviteId = url.searchParams.get('invite');

      if (inviteId) {
        // 🔥 v1 LOCK: /qr로 이동 (자동 Preview + Auto-Join)
        navigate(`/qr?invite=${inviteId}`);
      } else {
        setError('유효하지 않은 QR 코드입니다.');
      }
    } catch (err) {
      // URL이 아닌 경우 inviteId로 직접 처리
      navigate(`/qr?invite=${qrData}`);
    }
  };

  // 컴포넌트 언마운트 시 스트림 정리
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-none md:max-w-3xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            QR 코드 스캔
          </h1>
          <p className="text-sm text-gray-500">
            팀 초대 QR 코드를 스캔하세요
          </p>
        </div>

        {/* 카메라 영역 */}
        <div className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-6">
          {scanning ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
              {/* 스캔 가이드 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-blue-500 rounded-xl">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-24 h-24 text-gray-300" />
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error}</p>
              <p className="text-xs text-red-600 mt-1">
                브라우저 설정에서 카메라 권한을 허용해주세요.
              </p>
            </div>
          </div>
        )}

        {/* 스캔 버튼 */}
        {!scanning ? (
          <button
            onClick={startScanning}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg"
          >
            QR 코드 스캔 시작
          </button>
        ) : (
          <button
            onClick={() => {
              setScanning(false);
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
              }
            }}
            className="w-full py-4 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all"
          >
            스캔 중지
          </button>
        )}

        {/* 수동 입력 옵션 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/qr/input')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            QR 코드가 없나요? 초대 코드 직접 입력
          </button>
        </div>
      </div>
    </div>
  );
}

