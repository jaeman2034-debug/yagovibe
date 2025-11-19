export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  maxWorkers: 1, // Firebase Emulator와 충돌 방지
  testTimeout: 30000, // Firebase Emulator 시작 시간 고려
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

