/**
 * 📷 고화질 카메라 버튼 컴포넌트
 * 
 * 웹과 모바일 앱에서 모두 작동하는 고화질 카메라 기능을 제공합니다.
 */

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { useCapacitorCamera } from '@/hooks/useCapacitorCamera';
import { Button } from '@/components/ui/button';

interface CameraButtonProps {
  onImageSelected: (imageUrl: string, base64?: string) => void;
  disabled?: boolean;
  label?: string;
  showGallery?: boolean;
}

export default function CameraButton({
  onImageSelected,
  disabled = false,
  label = '카메라로 촬영',
  showGallery = true,
}: CameraButtonProps) {
  const { takePicture, pickFromGallery, loading, error } = useCapacitorCamera();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleTakePicture = async () => {
    const result = await takePicture({
      quality: 90, // 0-100, 모바일에서 고화질
      allowEditing: false,
      resultType: 'base64',
      width: 1920,
      height: 1920,
    });

    if (result?.dataUrl) {
      setSelectedImage(result.dataUrl);
      onImageSelected(result.dataUrl, result.base64);
    } else if (result?.webPath) {
      // 모바일 앱에서 URI 반환된 경우
      setSelectedImage(result.webPath);
      onImageSelected(result.webPath);
    }
  };

  const handlePickFromGallery = async () => {
    const result = await pickFromGallery({
      quality: 90,
      allowEditing: false,
      resultType: 'base64',
      width: 1920,
      height: 1920,
    });

    if (result?.dataUrl) {
      setSelectedImage(result.dataUrl);
      onImageSelected(result.dataUrl, result.base64);
    } else if (result?.webPath) {
      setSelectedImage(result.webPath);
      onImageSelected(result.webPath);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          onClick={handleTakePicture}
          disabled={disabled || loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              촬영 중...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              {label}
            </>
          )}
        </Button>

        {showGallery && (
          <Button
            onClick={handlePickFromGallery}
            disabled={disabled || loading}
            variant="outline"
            className="flex-1"
          >
            {loading ? (
              '선택 중...'
            ) : (
              '📁 갤러리에서 선택'
            )}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          오류: {error}
        </p>
      )}

      {selectedImage && (
        <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img
            src={selectedImage}
            alt="선택된 이미지"
            className="w-full h-auto max-h-64 object-contain"
          />
        </div>
      )}
    </div>
  );
}

