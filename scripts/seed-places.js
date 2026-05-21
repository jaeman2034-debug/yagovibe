/**
 * 🔥 Firestore Places 샘플 데이터 생성 스크립트
 * 
 * 사용법:
 * node scripts/seed-places.js
 * 
 * 또는 Firebase Console에서 직접 추가:
 * Firestore → places 컬렉션 → 문서 추가
 */

const samplePlaces = [
  {
    id: 'seoul-city-hall',
    name: '서울시청',
    lat: 37.5665,
    lng: 126.9780,
    address: '서울특별시 중구 세종대로 110',
    category: '관공서',
    status: 'active',
    rating: 4.5,
    createdAt: new Date().toISOString(),
    // AI 추천용 메타데이터
    tags: ['관광지', '역사', '무료'],
    description: '서울특별시의 행정 중심지',
  },
  {
    id: 'myeongdong',
    name: '명동',
    lat: 37.5651,
    lng: 126.9895,
    address: '서울특별시 중구 명동',
    category: '쇼핑',
    status: 'active',
    rating: 4.3,
    createdAt: new Date().toISOString(),
    tags: ['쇼핑', '음식', '관광'],
    description: '서울의 대표적인 쇼핑 거리',
  },
  {
    id: 'deoksugung',
    name: '덕수궁',
    lat: 37.5700,
    lng: 126.9769,
    address: '서울특별시 중구 세종대로 99',
    category: '역사',
    status: 'active',
    rating: 4.4,
    createdAt: new Date().toISOString(),
    tags: ['역사', '문화', '관광'],
    description: '조선 왕조의 궁궐',
  },
  {
    id: 'seoul-station',
    name: '서울역',
    lat: 37.5636,
    lng: 126.9747,
    address: '서울특별시 중구 한강대로 405',
    category: '교통',
    status: 'active',
    rating: 4.2,
    createdAt: new Date().toISOString(),
    tags: ['교통', '역', '접근성'],
    description: '서울의 주요 교통 허브',
  },
  {
    id: 'city-hall-station',
    name: '시청역',
    lat: 37.5663,
    lng: 126.9779,
    address: '서울특별시 중구 세종대로',
    category: '교통',
    status: 'active',
    rating: 4.1,
    createdAt: new Date().toISOString(),
    tags: ['교통', '역', '접근성'],
    description: '서울시청 인근 지하철역',
  },
];

// Firebase Admin SDK를 사용한 배치 추가 (서버에서 실행)
// 또는 Firebase Console에서 수동 추가

console.log('📋 샘플 장소 데이터:');
console.log(JSON.stringify(samplePlaces, null, 2));

console.log('\n📝 Firebase Console에서 추가하는 방법:');
console.log('1. https://console.firebase.google.com/project/yago-vibe-spt/firestore/data 접속');
console.log('2. "places" 컬렉션 클릭 (없으면 생성)');
console.log('3. "문서 추가" 클릭');
console.log('4. 문서 ID: 위의 id 값 입력 (예: seoul-city-hall)');
console.log('5. 필드 추가:');
samplePlaces[0] && Object.keys(samplePlaces[0]).forEach(key => {
  console.log(`   - ${key}: ${typeof samplePlaces[0][key]} (${key === 'lat' || key === 'lng' ? 'number' : key === 'tags' ? 'array' : 'string'})`);
});
