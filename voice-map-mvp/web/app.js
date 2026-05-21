// 🗺️ 지도 초기화
let map;
let markers = [];
let userLocation = { lat: 37.738, lng: 127.046 }; // 의정부 기준

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: userLocation,
    zoom: 15,
    mapTypeId: "roadmap",
  });

  // 내 위치 마커
  new google.maps.Marker({
    position: userLocation,
    map: map,
    title: "내 위치",
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#2563eb",
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#ffffff",
    },
  });

  // 실제 위치 획득 (가능하면)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(userLocation);
      },
      () => {
        console.log("위치 권한 거부됨, 기본 위치 사용");
      }
    );
  }
}

// 🎙️ 음성 인식 (웹은 mock 처리, 모바일 앱에서만 실제 STT 사용)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const voiceBtn = document.getElementById("voiceBtn");
const resultCard = document.getElementById("resultCard");

// 웹에서는 mock 처리 (전략적 판단)
// 실제 음성 인식은 모바일 앱에서만 검증
voiceBtn.onclick = async () => {
  voiceBtn.innerText = "듣고 있어요…";
  voiceBtn.classList.add("listening");

  // 웹에서는 1초 후 mock 텍스트로 처리
  setTimeout(async () => {
    const mockText = "근처 축구장"; // 웹 데모용
    console.log("🎤 웹 mock 처리:", mockText);

    voiceBtn.innerText = "🎙️ 말로 장소 찾기";
    voiceBtn.classList.remove("listening");

    try {
      const res = await fetch("http://localhost:4000/search/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mockText,
          lat: userLocation.lat,
          lng: userLocation.lng,
        }),
      });

      const data = await res.json();
      showResult(data.primary, data.others);
    } catch (error) {
      console.error("❌ API 호출 실패:", error);
      voiceBtn.innerText = "🎙️ 말로 장소 찾기";
      voiceBtn.classList.remove("listening");
    }
  }, 1000);
};

// 참고: Web Speech API가 지원되는 경우에도 mock 사용 (일관성)
// 실제 음성 인식은 모바일 앱(React Native)에서만 사용

// 📍 결과 표시
function showResult(primary, others = []) {
  // 기존 마커 제거
  markers.forEach(m => m.setMap(null));
  markers = [];

  if (!primary) {
    document.getElementById("resultCard").style.display = "none";
    return;
  }

  // 가장 가까운 장소 강조 (빨간색, 크게)
  const primaryMarker = new google.maps.Marker({
    position: { lat: primary.lat, lng: primary.lng },
    map: map,
    title: primary.name,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: "#ef4444",
      fillOpacity: 1,
      strokeWeight: 3,
      strokeColor: "#ffffff",
    },
  });
  markers.push(primaryMarker);

  // 나머지 장소 (청록색, 작게)
  others.forEach(place => {
    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map: map,
      title: place.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#14b8a6",
        fillOpacity: 0.8,
        strokeWeight: 2,
        strokeColor: "#ffffff",
      },
    });
    markers.push(marker);
  });

  // 지도 자동 줌 (모든 마커 보이도록)
  if (markers.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(userLocation);
    markers.forEach(m => bounds.extend(m.getPosition()));
    map.fitBounds(bounds, { top: 100, bottom: 180, left: 40, right: 40 });
  }

  // 결과 카드 표시
  const distance = primary.distance
    ? `${Math.round(primary.distance)}m`
    : "거리 계산 중";
  
  resultCard.innerHTML = `
    <h3>${primary.name}</h3>
    <p>${distance} 거리</p>
    <button onclick="openNavigation(${primary.lat}, ${primary.lng})">
      여기로 가기
    </button>
  `;
  resultCard.style.display = "block";
}

// 🧭 길찾기 (외부 지도 앱)
function openNavigation(lat, lng) {
  // Google Maps 웹 링크
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, "_blank");
}
