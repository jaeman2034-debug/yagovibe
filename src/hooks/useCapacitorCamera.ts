/**
 * 📷 Capacitor 카메라 Hook
 * 
 * 웹과 모바일 앱에서 모두 작동하는 고화질 카메라 기능을 제공합니다.
 */

import { useState } from 'react';

interface CameraOptions {
  quality?: number; // 0-100
  allowEditing?: boolean;
  resultType?: 'base64' | 'uri';
  width?: number;
  height?: number;
}

interface CameraResult {
  base64?: string;
  dataUrl?: string;
  webPath?: string;
  path?: string;
  format: string;
}

/**
 * 고화질 카메라 Hook
 */
export function useCapacitorCamera() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 카메라로 사진 촬영 (모바일 앱에서 고화질)
   */
  const takePicture = async (options: CameraOptions = {}): Promise<CameraResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // 모바일 앱 환경: Capacitor Camera Plugin 사용 (고화질)
      if (window.Capacitor?.isNativePlatform()) {
        const { Camera } = await import('@capacitor/camera');
        const { CameraResultType } = await import('@capacitor/camera');

        const image = await Camera.getPhoto({
          quality: options.quality || 90,
          allowEditing: options.allowEditing || false,
          resultType: options.resultType === 'base64' 
            ? CameraResultType.Base64 
            : CameraResultType.Uri,
          width: options.width || 1920,
          height: options.height || 1920,
          correctOrientation: true,
          source: 'camera',
        });

        // Base64로 요청한 경우
        if (image.base64String) {
          const dataUrl = `data:image/${image.format};base64,${image.base64String}`;
          return {
            base64: image.base64String,
            dataUrl,
            format: image.format,
            path: image.path,
          };
        }

        // URI로 요청한 경우
        if (image.webPath) {
          return {
            webPath: image.webPath,
            path: image.path,
            format: image.format,
          };
        }

        throw new Error('카메라 결과를 받을 수 없습니다.');
      }

      // 웹 환경: 기존 HTML5 File API 사용
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // 후면 카메라 우선

        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(new Error('파일을 선택하지 않았습니다.'));
            return;
          }

          // FileReader로 Base64로 변환
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({
              base64,
              dataUrl: reader.result as string,
              format: file.type.split('/')[1] || 'jpeg',
            });
          };
          reader.onerror = () => reject(new Error('파일 읽기 실패'));
          reader.readAsDataURL(file);
        };

        input.oncancel = () => {
          reject(new Error('사용자가 취소했습니다.'));
        };

        input.click();
      });
    } catch (err: any) {
      const errorMessage = err.message || '카메라 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('📷 카메라 오류:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 갤러리에서 사진 선택
   */
  const pickFromGallery = async (options: CameraOptions = {}): Promise<CameraResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // 모바일 앱 환경: Capacitor Camera Plugin 사용
      if (window.Capacitor?.isNativePlatform()) {
        const { Camera } = await import('@capacitor/camera');
        const { CameraResultType } = await import('@capacitor/camera');

        const image = await Camera.getPhoto({
          quality: options.quality || 90,
          allowEditing: options.allowEditing || false,
          resultType: options.resultType === 'base64'
            ? CameraResultType.Base64
            : CameraResultType.Uri,
          width: options.width || 1920,
          height: options.height || 1920,
          correctOrientation: true,
          source: 'photos', // 갤러리에서 선택
        });

        if (image.base64String) {
          const dataUrl = `data:image/${image.format};base64,${image.base64String}`;
          return {
            base64: image.base64String,
            dataUrl,
            format: image.format,
            path: image.path,
          };
        }

        if (image.webPath) {
          return {
            webPath: image.webPath,
            path: image.path,
            format: image.format,
          };
        }

        throw new Error('이미지 결과를 받을 수 없습니다.');
      }

      // 웹 환경: 기존 HTML5 File API 사용
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(new Error('파일을 선택하지 않았습니다.'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({
              base64,
              dataUrl: reader.result as string,
              format: file.type.split('/')[1] || 'jpeg',
            });
          };
          reader.onerror = () => reject(new Error('파일 읽기 실패'));
          reader.readAsDataURL(file);
        };

        input.oncancel = () => {
          reject(new Error('사용자가 취소했습니다.'));
        };

        input.click();
      });
    } catch (err: any) {
      const errorMessage = err.message || '갤러리 선택 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('📷 갤러리 오류:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    takePicture,
    pickFromGallery,
    loading,
    error,
  };
}

