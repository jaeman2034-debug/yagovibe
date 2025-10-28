// Firestore 예시 데이터 생성 스크립트
// Firebase Console에서 실행하거나 관리자 페이지에서 사용

const exampleLocations = [
    {
        "name": "소흘 축구장",
        "lat": 37.75712,
        "lng": 127.14028,
        "description": "포천시 소흘읍 체육공원 내 위치"
    },
    {
        "name": "청룡FC 구장",
        "lat": 37.73311,
        "lng": 127.11804,
        "description": "청룡팀 전용 연습 구장"
    },
    {
        "name": "포천 스포츠센터",
        "lat": 37.76667,
        "lng": 127.11667,
        "description": "포천시 대표 체육시설"
    },
    {
        "name": "소흘 체육공원",
        "lat": 37.75712,
        "lng": 127.14028,
        "description": "소흘읍 주민 체육활동 공간"
    },
    {
        "name": "청룡 훈련장",
        "lat": 37.73311,
        "lng": 127.11804,
        "description": "청룡FC 전용 훈련 시설"
    }
];

// Firebase Console에서 locations 컬렉션에 위 데이터 추가
console.log("Firestore locations 컬렉션에 추가할 데이터:", exampleLocations);
