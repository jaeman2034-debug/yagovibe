/**
 * Jest 테스트 설정 파일
 * Firebase Emulator 시작 전 초기화
 */

// 테스트 환경 변수 설정
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FUNCTIONS_EMULATOR_HOST = '127.0.0.1:5001';
process.env.GCLOUD_PROJECT = 'yago-vibe-spt';

// 기본 타임아웃 설정
jest.setTimeout(30000);

// 전역 테스트 전처리
beforeAll(async () => {
  console.log('🧪 테스트 환경 초기화 시작...');
});

// 전역 테스트 후처리
afterAll(async () => {
  console.log('✅ 테스트 환경 정리 완료');
});

