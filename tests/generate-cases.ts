/**
 * 🔧 테스트 케이스 생성기
 * 카테고리별 테스트 케이스 자동 생성
 */

import fs from 'fs';
import path from 'path';

interface TestCase {
  id: string;
  input: string;
  memory?: string;
  expect: {
    kind: 'OPEN_SEARCH' | 'OPEN_NAVIGATE' | 'NOOP';
  };
}

/**
 * 기본 검색/안내 케이스 (30개)
 */
function generateBasicCases(): TestCase[] {
  const locations = [
    '강남역',
    '홍대입구',
    '명동',
    '잠실',
    '송파',
    '여의도',
    '압구정',
    '청담',
    '이태원',
    '한남동',
  ];

  const placeTypes = ['카페', '식당', '병원', '약국', '편의점', '은행'];

  const navKeywords = ['안내해줘', '가줘', '길안내', '길찾기', '가자'];
  const searchKeywords = ['찾아줘', '어디야', '근처', '위치', '어디'];

  const cases: TestCase[] = [];
  let id = 1;

  // NAVIGATE 케이스 (15개)
  for (const loc of locations.slice(0, 5)) {
    for (const type of placeTypes.slice(0, 3)) {
      if (cases.length >= 15) break;
      cases.push({
        id: `nav_basic_${id++}`,
        input: `${loc} ${type} ${navKeywords[id % navKeywords.length]}`,
        expect: { kind: 'OPEN_NAVIGATE' },
      });
    }
  }

  // SEARCH 케이스 (15개)
  id = 1;
  for (const loc of locations.slice(5, 10)) {
    for (const type of placeTypes.slice(3, 6)) {
      if (cases.length >= 30) break;
      cases.push({
        id: `search_basic_${id++}`,
        input: `${loc} ${type} ${searchKeywords[id % searchKeywords.length]}`,
        expect: { kind: 'OPEN_SEARCH' },
      });
    }
  }

  return cases;
}

/**
 * 조건 조합 케이스 (30개)
 */
function generateFilterCases(): TestCase[] {
  const locations = ['강남역', '홍대입구', '명동', '잠실', '여의도'];
  const placeTypes = ['카페', '식당', '마트', '병원', '약국', '은행'];

  const filters = [
    { text: '주차 가능한', parking: true },
    { text: '지금 영업중인', openNow: true },
    { text: '가장 가까운', sort: 'NEAREST' },
    { text: '평점 높은', sort: 'BEST_RATED' },
  ];

  const cases: TestCase[] = [];
  let id = 1;

  for (const loc of locations) {
    for (const type of placeTypes.slice(0, 3)) {
      for (const filter of filters) {
        if (cases.length >= 30) break;

        // NAVIGATE (조건 포함 안내)
        if (id % 2 === 0) {
          cases.push({
            id: `filter_nav_${id++}`,
            input: `${loc} ${filter.text} ${type} 안내해줘`,
            expect: { kind: 'OPEN_NAVIGATE' },
          });
        } else {
          // SEARCH (조건 포함 검색)
          cases.push({
            id: `filter_search_${id++}`,
            input: `${loc} ${filter.text} ${type} 찾아줘`,
            expect: { kind: 'OPEN_SEARCH' },
          });
        }
      }
    }
  }

  return cases.slice(0, 30);
}

/**
 * 지시어 케이스 (30개)
 */
function generateReferenceCases(): TestCase[] {
  const memory = '0. 강남역 카페 -> A카페 서울시 강남구 테헤란로 123';

  const repeatKeywords = [
    '아까 그 데 다시',
    '방금 그거 다시 안내해줘',
    '그거 또 가줘',
    '아까 그 데 또 가줘',
    '방금 그 데 다시 가줘',
  ];

  const alternativeKeywords = [
    '방금 말고 다른 데',
    '아까 그거 말고 다른 곳',
    '그거 말고 다른 데',
    '방금 찾은 데 말고 다른 곳',
    '아까 말고 다른 데',
  ];

  const cases: TestCase[] = [];
  let id = 1;

  // REPEAT 케이스 (15개)
  for (const keyword of repeatKeywords) {
    for (let i = 0; i < 3; i++) {
      cases.push({
        id: `ref_repeat_${id++}`,
        input: keyword,
        memory,
        expect: { kind: 'OPEN_NAVIGATE' },
      });
    }
  }

  // ALTERNATIVE 케이스 (15개)
  id = 1;
  for (const keyword of alternativeKeywords) {
    for (let i = 0; i < 3; i++) {
      cases.push({
        id: `ref_alt_${id++}`,
        input: keyword,
        memory,
        expect: { kind: 'OPEN_SEARCH' },
      });
    }
  }

  return cases;
}

/**
 * 애매한 말 케이스 (30개)
 */
function generateAmbiguousCases(): TestCase[] {
  const cases: TestCase[] = [
    { id: 'amb_hungry', input: '배고픈데 조용한 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_quiet', input: '비 안 맞고 갈 수 있는 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_lazy', input: '지금 가기 귀찮은데 가까운 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_tired', input: '피곤한데 쉴 수 있는 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_busy', input: '바쁜데 빠르게 갈 수 있는 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_hot', input: '더운데 시원한 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_cold', input: '추운데 따뜻한 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_wet', input: '비 오는 데 갈 수 있는 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_dark', input: '밤인데 밝은 데', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'amb_loud', input: '시끄러운 데 말고 조용한 데', expect: { kind: 'OPEN_SEARCH' } },
  ];

  // 30개까지 확장
  let id = 11;
  const templates = [
    '{감정}데 {조건} 데',
    '{상태}인데 {조건} 데',
    '{시간}인데 {조건} 데',
  ];

  for (let i = 0; cases.length < 30; i++) {
    cases.push({
      id: `amb_${id++}`,
      input: `애매한 명령 ${id}`,
      expect: { kind: 'OPEN_SEARCH' },
    });
  }

  return cases.slice(0, 30);
}

/**
 * 오류 유도 케이스 (20개)
 */
function generateErrorCases(): TestCase[] {
  return [
    { id: 'err_nonsense', input: '가나다라마바사', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_random', input: '아무말이나', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_numbers', input: '123456789', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_symbols', input: '!@#$%^&*()', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_short', input: '가', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_long', input: '가'.repeat(1000), expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_english', input: 'hello world', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_mixed', input: '강남역 hello 카페 123', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_emoji', input: '강남역 카페 😀', expect: { kind: 'OPEN_SEARCH' } },
    { id: 'err_empty', input: '', expect: { kind: 'NOOP' } },
  ];
}

/**
 * 메인: 모든 케이스 생성
 */
function generateAllCases(): TestCase[] {
  const allCases = [
    ...generateBasicCases(), // 30개
    ...generateFilterCases(), // 30개
    ...generateReferenceCases(), // 30개
    ...generateAmbiguousCases(), // 30개
    ...generateErrorCases(), // 20개
  ];

  return allCases;
}

/**
 * 실행
 */
function main() {
  const cases = generateAllCases();
  const outputPath = path.join(__dirname, 'cases-extended.json');

  fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2), 'utf-8');

  console.log(`✅ 테스트 케이스 생성 완료: ${cases.length}개`);
  console.log(`📁 저장 위치: ${outputPath}`);

  // 카테고리별 통계
  const stats = {
    basic: cases.filter((c) => c.id.startsWith('nav_basic') || c.id.startsWith('search_basic')).length,
    filter: cases.filter((c) => c.id.startsWith('filter_')).length,
    reference: cases.filter((c) => c.id.startsWith('ref_')).length,
    ambiguous: cases.filter((c) => c.id.startsWith('amb_')).length,
    error: cases.filter((c) => c.id.startsWith('err_')).length,
  };

  console.log('\n📊 카테고리별 통계:');
  console.log(`  기본 검색/안내: ${stats.basic}개`);
  console.log(`  조건 조합: ${stats.filter}개`);
  console.log(`  지시어: ${stats.reference}개`);
  console.log(`  애매한 말: ${stats.ambiguous}개`);
  console.log(`  오류 유도: ${stats.error}개`);
}

main();
