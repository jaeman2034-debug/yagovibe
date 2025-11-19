// Kakao Maps SDK 동적 로더
let kakaoLoading: Promise<typeof window.kakao> | null = null;

export function loadKakaoSDK(): Promise<typeof window.kakao> {
  if (typeof window === "undefined") {
    throw new Error("window unavailable");
  }

  // 이미 로드된 경우
  if ((window as any).kakao?.maps) {
    return Promise.resolve((window as any).kakao);
  }

  // 로딩 중인 경우 기존 Promise 반환
  if (!kakaoLoading) {
    const appKey = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
    if (!appKey) {
      throw new Error("VITE_KAKAO_JS_KEY is missing");
    }

    kakaoLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
      script.async = true;
      
      script.onload = () => {
        (window as any).kakao.maps.load(() => {
          resolve((window as any).kakao);
        });
      };
      
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return kakaoLoading;
}

// 장소 검색 함수
export async function searchPlaces(keyword: string): Promise<any[]> {
  const kakao = await loadKakaoSDK();
  
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places();
    
    places.keywordSearch(keyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        resolve(data || []);
      } else {
        reject(new Error(`검색 실패: ${status}`));
      }
    });
  });
}
