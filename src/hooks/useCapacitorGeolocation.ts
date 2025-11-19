/**
 * 📍 Capacitor GPS Hook
 * 
 * 웹과 모바일 앱에서 모두 작동하는 고정밀 GPS 위치 기능을 제공합니다.
 */

import { useState, useEffect } from 'react';

interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * 고정밀 GPS Hook
 */
export function useCapacitorGeolocation(options: GeolocationOptions = {}) {
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 현재 위치 가져오기
   */
  const getCurrentPosition = async (): Promise<Position | null> => {
    setLoading(true);
    setError(null);

    try {
      // 모바일 앱 환경: Capacitor Geolocation Plugin 사용 (고정밀)
      if (window.Capacitor?.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        
        // 권한 확인
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
          // 권한 요청
          const request = await Geolocation.requestPermissions();
          if (request.location !== 'granted') {
            throw new Error('위치 권한이 거부되었습니다.');
          }
        }

        // 현재 위치 가져오기
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 0,
        });

        const pos: Position = {
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          accuracy: coordinates.coords.accuracy ?? undefined,
          altitude: coordinates.coords.altitude ?? null,
          altitudeAccuracy: coordinates.coords.altitudeAccuracy ?? null,
          heading: coordinates.coords.heading ?? null,
          speed: coordinates.coords.speed ?? null,
          timestamp: coordinates.timestamp,
        };

        setPosition(pos);
        return pos;
      }

      // 웹 환경: HTML5 Geolocation API 사용
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('브라우저가 위치 서비스를 지원하지 않습니다.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (geoloc) => {
            const pos: Position = {
              latitude: geoloc.coords.latitude,
              longitude: geoloc.coords.longitude,
              accuracy: geoloc.coords.accuracy ?? undefined,
              altitude: geoloc.coords.altitude ?? null,
              altitudeAccuracy: geoloc.coords.altitudeAccuracy ?? null,
              heading: geoloc.coords.heading ?? null,
              speed: geoloc.coords.speed ?? null,
              timestamp: geoloc.timestamp,
            };

            setPosition(pos);
            resolve(pos);
          },
          (err) => {
            const errorMessage =
              err.code === 1
                ? '위치 권한이 거부되었습니다.'
                : err.code === 2
                ? '위치 정보를 가져올 수 없습니다.'
                : '위치 확인 시간이 초과되었습니다.';
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: options.enableHighAccuracy ?? true,
            timeout: options.timeout ?? 10000,
            maximumAge: options.maximumAge ?? 0,
          }
        );
      });
    } catch (err: any) {
      const errorMessage = err.message || '위치 확인 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('📍 GPS 오류:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 위치 감시 시작
   */
  const watchPosition = (callback: (position: Position) => void): (() => void) => {
    let watchId: number | string | null = null;

    const startWatch = async () => {
      try {
        // 모바일 앱 환경: Capacitor Geolocation Plugin 사용
        if (window.Capacitor?.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');

          // 권한 확인
          const permission = await Geolocation.checkPermissions();
          if (permission.location !== 'granted') {
            const request = await Geolocation.requestPermissions();
            if (request.location !== 'granted') {
              throw new Error('위치 권한이 거부되었습니다.');
            }
          }

          watchId = await Geolocation.watchPosition(
            {
              enableHighAccuracy: options.enableHighAccuracy ?? true,
              timeout: options.timeout ?? 10000,
              maximumAge: options.maximumAge ?? 0,
            },
            (coordinates) => {
              const pos: Position = {
                latitude: coordinates.coords.latitude,
                longitude: coordinates.coords.longitude,
                accuracy: coordinates.coords.accuracy ?? undefined,
                altitude: coordinates.coords.altitude ?? null,
                altitudeAccuracy: coordinates.coords.altitudeAccuracy ?? null,
                heading: coordinates.coords.heading ?? null,
                speed: coordinates.coords.speed ?? null,
                timestamp: coordinates.timestamp,
              };

              setPosition(pos);
              callback(pos);
            }
          );

          // Capacitor watchPosition은 문자열 ID 반환
          return () => {
            if (typeof watchId === 'string' && window.Capacitor?.isNativePlatform()) {
              const id = watchId; // 타입 가드로 string 확인됨
              import('@capacitor/geolocation').then(({ Geolocation }) => {
                Geolocation.clearWatch({ id });
              }).catch(() => {});
            }
          };
        }

        // 웹 환경: HTML5 Geolocation API 사용
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (geoloc) => {
              const pos: Position = {
                latitude: geoloc.coords.latitude,
                longitude: geoloc.coords.longitude,
                accuracy: geoloc.coords.accuracy ?? undefined,
                altitude: geoloc.coords.altitude ?? null,
                altitudeAccuracy: geoloc.coords.altitudeAccuracy ?? null,
                heading: geoloc.coords.heading ?? null,
                speed: geoloc.coords.speed ?? null,
                timestamp: geoloc.timestamp,
              };

              setPosition(pos);
              callback(pos);
            },
            (err) => {
              const errorMessage =
                err.code === 1
                  ? '위치 권한이 거부되었습니다.'
                  : err.code === 2
                  ? '위치 정보를 가져올 수 없습니다.'
                  : '위치 확인 시간이 초과되었습니다.';
              setError(errorMessage);
            },
            {
              enableHighAccuracy: options.enableHighAccuracy ?? true,
              timeout: options.timeout ?? 10000,
              maximumAge: options.maximumAge ?? 0,
            }
          );

          return () => {
            if (typeof watchId === 'number') {
              navigator.geolocation.clearWatch(watchId);
            }
          };
        }

        throw new Error('브라우저가 위치 서비스를 지원하지 않습니다.');
      } catch (err: any) {
        const errorMessage = err.message || '위치 감시 시작 오류';
        setError(errorMessage);
        console.error('📍 GPS 감시 오류:', err);
        return () => {}; // 빈 함수 반환
      }
    };

    startWatch();

    // 클린업 함수 반환
    return () => {
      if (typeof watchId === 'string' && window.Capacitor?.isNativePlatform()) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: watchId as string });
        }).catch(() => {});
      } else if (typeof watchId === 'number') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  };

  return {
    position,
    loading,
    error,
    getCurrentPosition,
    watchPosition,
  };
}

