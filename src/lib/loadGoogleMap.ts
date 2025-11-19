// src/lib/loadGoogleMap.ts

let googleLoaded: Promise<typeof google> | null = null;

export function loadGoogleMap(): Promise<typeof google> {
  if (googleLoaded) return googleLoaded;

  googleLoaded = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;

    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error("GOOGLE MAP API KEY가 없습니다."));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;

    script.onload = () => {
      if (window.google) resolve(window.google);
      else reject(new Error("Google Maps 로드 실패"));
    };

    script.onerror = () => reject(new Error("Google Map script load error"));

    document.head.appendChild(script);
  });

  return googleLoaded;
}
