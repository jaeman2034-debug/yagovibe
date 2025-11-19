// src/lib/loadNaverMap.ts

// ENV 체크
console.log("ENV CHECK →", {
	VITE_NAVER_MAP_CLIENT_ID: import.meta.env.VITE_NAVER_MAP_CLIENT_ID,
	MODE: import.meta.env.MODE,
	DEV: import.meta.env.DEV,
	PROD: import.meta.env.PROD,
});

let naverLoaded: Promise<typeof window.naver> | null = null;

export function loadNaverMap(): Promise<typeof window.naver> {
	if (naverLoaded) return naverLoaded;

	naverLoaded = new Promise((resolve, reject) => {
		if (typeof window === "undefined") return;

		if (window.naver && window.naver.maps) {
			resolve(window.naver);
			return;
		}

		const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

		console.debug("NAVER_CLIENT_ID:", clientId);

		if (!clientId) {
			reject(new Error("VITE_NAVER_MAP_CLIENT_ID 환경변수가 없습니다."));
			return;
		}

		const existing = document.querySelector("script[data-naver-map]");
		if (existing) {
			existing.addEventListener("load", () => {
				if (window.naver && window.naver.maps) resolve(window.naver);
				else reject(new Error("네이버 지도 객체 생성 실패"));
			});
			return;
		}

		const scriptUrl = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;

		console.debug("NAVER MAP SDK URL:", scriptUrl);

		const script = document.createElement("script");
		script.src = scriptUrl;
		script.async = true;
		script.dataset.naverMap = "true";

		script.onload = () => {
			console.debug("NAVER MAP SDK Loaded:", !!window.naver);
			if (window.naver && window.naver.maps) resolve(window.naver);
			else reject(new Error("네이버 지도 객체 생성 실패 (onload)"));
		};

		script.onerror = () => {
			reject(new Error("네이버 지도 SDK 로딩 실패"));
		};

		document.head.appendChild(script);
	});

	return naverLoaded;
}
