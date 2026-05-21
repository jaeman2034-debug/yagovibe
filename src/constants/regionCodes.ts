/**
 * 🔥 지역 코드 상수
 * 
 * 역할: 플랫폼 전체에서 사용하는 지역 코드 표준화
 * 형식: {시도}_{시군구} (예: SEOUL_NOWON)
 */

/**
 * 지역 코드 타입 (전국 확장형)
 * 
 * 형식: {국가코드}_{시도}_{시군구}
 * 예: KR_SEOUL_NOWON
 */
export type RegionCode =
  // 서울
  | "KR_SEOUL_NOWON"        // 서울 노원구
  | "KR_SEOUL_GANGNAM"      // 서울 강남구
  | "KR_SEOUL_MAPO"         // 서울 마포구
  | "KR_SEOUL_GANGDONG"     // 서울 강동구
  | "KR_SEOUL_GANGBUK"      // 서울 강북구
  | "KR_SEOUL_GANGSEO"      // 서울 강서구
  | "KR_SEOUL_GWANAK"       // 서울 관악구
  | "KR_SEOUL_GWANGJIN"     // 서울 광진구
  | "KR_SEOUL_GURO"         // 서울 구로구
  | "KR_SEOUL_GEUMCHEON"    // 서울 금천구
  | "KR_SEOUL_DOBONG"       // 서울 도봉구
  | "KR_SEOUL_DONGDAEMUN"   // 서울 동대문구
  | "KR_SEOUL_DONGJAK"      // 서울 동작구
  | "KR_SEOUL_SEONGDONG"    // 서울 성동구
  | "KR_SEOUL_SEONGBUK"     // 서울 성북구
  | "KR_SEOUL_SONGPA"       // 서울 송파구
  | "KR_SEOUL_YANGCHEON"    // 서울 양천구
  | "KR_SEOUL_YEONGDEUNGPO" // 서울 영등포구
  | "KR_SEOUL_YONGSAN"      // 서울 용산구
  | "KR_SEOUL_EUNPYEONG"    // 서울 은평구
  | "KR_SEOUL_JONGNO"       // 서울 종로구
  | "KR_SEOUL_JUNG"         // 서울 중구
  | "KR_SEOUL_JUNGNANG"     // 서울 중랑구
  // 경기
  | "KR_GYEONGGI_UIJEONGBU" // 경기 의정부
  | "KR_GYEONGGI_SUWON"     // 경기 수원
  | "KR_GYEONGGI_SEONGNAM"  // 경기 성남
  | "KR_GYEONGGI_ANYANG"    // 경기 안양
  | "KR_GYEONGGI_BUCHON"    // 경기 부천
  | "KR_GYEONGGI_GWANGMYEONG" // 경기 광명
  | "KR_GYEONGGI_PYEONGTAEK"  // 경기 평택
  | "KR_GYEONGGI_DONGDUCHEON" // 경기 동두천
  | "KR_GYEONGGI_ANSAN"     // 경기 안산
  | "KR_GYEONGGI_GOYANG"    // 경기 고양
  | "KR_GYEONGGI_GWACHEON"  // 경기 과천
  | "KR_GYEONGGI_GURI"      // 경기 구리
  | "KR_GYEONGGI_NAMYANGJU" // 경기 남양주
  | "KR_GYEONGGI_OSAN"      // 경기 오산
  | "KR_GYEONGGI_SIHEUNG"   // 경기 시흥
  | "KR_GYEONGGI_GUNPO"     // 경기 군포
  | "KR_GYEONGGI_UIWANG"    // 경기 의왕
  | "KR_GYEONGGI_HANAM"     // 경기 하남
  | "KR_GYEONGGI_YONGIN"    // 경기 용인
  | "KR_GYEONGGI_PAJU"      // 경기 파주
  | "KR_GYEONGGI_ICHEON"    // 경기 이천
  | "KR_GYEONGGI_ANSEONG"   // 경기 안성
  | "KR_GYEONGGI_GIMPO"     // 경기 김포
  | "KR_GYEONGGI_HWASEONG"  // 경기 화성
  | "KR_GYEONGGI_GWANGJU"   // 경기 광주
  | "KR_GYEONGGI_YANGJU"    // 경기 양주
  | "KR_GYEONGGI_POCHEON"   // 경기 포천
  | "KR_GYEONGGI_YEOJU"     // 경기 여주
  | "KR_GYEONGGI_GAPYEONG"  // 경기 가평
  | "KR_GYEONGGI_YANGPYEONG" // 경기 양평
  // 인천
  | "KR_INCHEON_JUNG"       // 인천 중구
  | "KR_INCHEON_DONG"       // 인천 동구
  | "KR_INCHEON_MICHUHOL"   // 인천 미추홀구
  | "KR_INCHEON_YEONSU"     // 인천 연수구
  | "KR_INCHEON_NAMDONG"    // 인천 남동구
  | "KR_INCHEON_BUPYEONG"   // 인천 부평구
  | "KR_INCHEON_GYEYANG"    // 인천 계양구
  | "KR_INCHEON_SEO"        // 인천 서구
  // 기타
  | "KR_BUSAN"              // 부산
  | "KR_DAEGU"              // 대구
  | "KR_GWANGJU"            // 광주
  | "KR_DAEJEON"            // 대전
  | "KR_ULSAN"              // 울산
  | "KR_SEJONG"             // 세종
  | "KR_GANGWON"            // 강원
  | "KR_CHUNGBUK"           // 충북
  | "KR_CHUNGNAM"           // 충남
  | "KR_JEONBUK"            // 전북
  | "KR_JEONNAM"            // 전남
  | "KR_GYEONGBUK"          // 경북
  | "KR_GYEONGNAM"          // 경남
  | "KR_JEJU";              // 제주

/**
 * 지역 코드 → 지역명 매핑
 */
export const REGION_LABELS: Record<RegionCode, string> = {
  // 서울
  KR_SEOUL_NOWON: "서울 노원구",
  KR_SEOUL_GANGNAM: "서울 강남구",
  SEOUL_MAPO: "서울 마포구",
  SEOUL_GANGDONG: "서울 강동구",
  SEOUL_GANGBUK: "서울 강북구",
  SEOUL_GANGSEO: "서울 강서구",
  SEOUL_GWANAK: "서울 관악구",
  SEOUL_GWANGJIN: "서울 광진구",
  SEOUL_GURO: "서울 구로구",
  SEOUL_GEUMCHEON: "서울 금천구",
  SEOUL_DOBONG: "서울 도봉구",
  SEOUL_DONGDAEMUN: "서울 동대문구",
  SEOUL_DONGJAK: "서울 동작구",
  SEOUL_SEONGDONG: "서울 성동구",
  SEOUL_SEONGBUK: "서울 성북구",
  SEOUL_SONGPA: "서울 송파구",
  SEOUL_YANGCHEON: "서울 양천구",
  SEOUL_YEONGDEUNGPO: "서울 영등포구",
  SEOUL_YONGSAN: "서울 용산구",
  SEOUL_EUNPYEONG: "서울 은평구",
  SEOUL_JONGNO: "서울 종로구",
  SEOUL_JUNG: "서울 중구",
  SEOUL_JUNGNANG: "서울 중랑구",
  // 경기
  GYEONGGI_UIJEONGBU: "경기 의정부",
  GYEONGGI_SUWON: "경기 수원",
  GYEONGGI_SEONGNAM: "경기 성남",
  GYEONGGI_ANYANG: "경기 안양",
  GYEONGGI_BUCHON: "경기 부천",
  GYEONGGI_GWANGMYEONG: "경기 광명",
  GYEONGGI_PYEONGTAEK: "경기 평택",
  GYEONGGI_DONGDUCHEON: "경기 동두천",
  GYEONGGI_ANSAN: "경기 안산",
  GYEONGGI_GOYANG: "경기 고양",
  GYEONGGI_GWACHEON: "경기 과천",
  GYEONGGI_GURI: "경기 구리",
  GYEONGGI_NAMYANGJU: "경기 남양주",
  GYEONGGI_OSAN: "경기 오산",
  GYEONGGI_SIHEUNG: "경기 시흥",
  GYEONGGI_GUNPO: "경기 군포",
  GYEONGGI_UIWANG: "경기 의왕",
  GYEONGGI_HANAM: "경기 하남",
  GYEONGGI_YONGIN: "경기 용인",
  GYEONGGI_PAJU: "경기 파주",
  GYEONGGI_ICHEON: "경기 이천",
  GYEONGGI_ANSEONG: "경기 안성",
  GYEONGGI_GIMPO: "경기 김포",
  GYEONGGI_HWASEONG: "경기 화성",
  GYEONGGI_GWANGJU: "경기 광주",
  GYEONGGI_YANGJU: "경기 양주",
  GYEONGGI_POCHEON: "경기 포천",
  GYEONGGI_YEOJU: "경기 여주",
  GYEONGGI_GAPYEONG: "경기 가평",
  GYEONGGI_YANGPYEONG: "경기 양평",
  // 인천
  INCHEON_JUNG: "인천 중구",
  INCHEON_DONG: "인천 동구",
  INCHEON_MICHUHOL: "인천 미추홀구",
  INCHEON_YEONSU: "인천 연수구",
  INCHEON_NAMDONG: "인천 남동구",
  INCHEON_BUPYEONG: "인천 부평구",
  INCHEON_GYEYANG: "인천 계양구",
  INCHEON_SEO: "인천 서구",
  // 기타
  BUSAN: "부산",
  DAEGU: "대구",
  GWANGJU: "광주",
  DAEJEON: "대전",
  ULSAN: "울산",
  SEJONG: "세종",
  GANGWON: "강원",
  CHUNGBUK: "충북",
  CHUNGNAM: "충남",
  JEONBUK: "전북",
  JEONNAM: "전남",
  GYEONGBUK: "경북",
  GYEONGNAM: "경남",
  JEJU: "제주",
};

/**
 * 지역 코드 가져오기
 */
export function getRegionLabel(code: RegionCode): string {
  return REGION_LABELS[code] || code;
}

/**
 * 지역명 → 지역 코드 변환 (간단한 매핑)
 */
export function getRegionCode(region: string): RegionCode | null {
  const normalized = region.trim();
  
  // 정확한 매칭
  for (const [code, label] of Object.entries(REGION_LABELS)) {
    if (label === normalized) {
      return code as RegionCode;
    }
  }
  
  // 부분 매칭 (예: "노원구" → "SEOUL_NOWON")
  for (const [code, label] of Object.entries(REGION_LABELS)) {
    if (label.includes(normalized) || normalized.includes(label)) {
      return code as RegionCode;
    }
  }
  
  return null;
}
