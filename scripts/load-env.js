// scripts/load-env.js
/**
 * 🔥 빌드 전 환경 변수 로드 스크립트
 * 
 * .env.production 파일에서 환경 변수를 읽어서
 * process.env에 주입합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envProductionPath = path.join(__dirname, '..', '.env.production');

console.log('🔍 환경 변수 로드 시작...');

if (!fs.existsSync(envProductionPath)) {
  console.warn('⚠️ .env.production 파일이 없습니다.');
  console.warn('   기본값을 사용하거나 환경 변수를 수동으로 설정하세요.');
  process.exit(0);
}

// .env.production 파일 읽기
const envContent = fs.readFileSync(envProductionPath, 'utf-8');
const envLines = envContent.split('\n');

let loadedCount = 0;

envLines.forEach((line) => {
  // 주석 제거 및 빈 줄 스킵
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }

  // KEY=VALUE 형식 파싱
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    
    // process.env에 주입
    process.env[key] = value;
    loadedCount++;
    
    // 민감한 정보는 마스킹하여 출력
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
      const masked = value.length > 10 
        ? `${value.substring(0, 10)}... (${value.length}자)`
        : '***';
      console.log(`  ✅ ${key} = ${masked}`);
    } else {
      console.log(`  ✅ ${key} = ${value}`);
    }
  }
});

console.log(`\n✅ 총 ${loadedCount}개 환경 변수 로드 완료!`);
console.log('🚀 빌드를 시작합니다...\n');

