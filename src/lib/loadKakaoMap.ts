let kakaoLoaded: Promise<typeof window.kakao> | null = null;

declare global {
	interface Window {
		kakao: any;
	}
}

export function loadKakaoMap(): Promise<typeof window.kakao> {
	if (kakaoLoaded) return kakaoLoaded;

	kakaoLoaded = new Promise((resolve, reject) => {
		if (typeof window === "undefined") {
			reject(new Error("window is undefined"));
			return;
		}

		// 이미 로드된 경우
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if ((window as any).kakao && (window as any).kakao.maps) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			resolve((window as any).kakao);
			return;
		}

		const appkey = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
		if (!appkey) {
			reject(new Error("VITE_KAKAO_JS_KEY 가 설정되어 있지 않습니다."));
			return;
		}

		const script = document.createElement("script");
		script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
		script.async = true;
		script.onload = () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			(window as any).kakao.maps.load(() => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				resolve((window as any).kakao);
			});
		};
		script.onerror = () => reject(new Error("카카오 지도 스크립트 로드 실패"));
		document.head.appendChild(script);
	});

	return kakaoLoaded;
}


