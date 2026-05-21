#!/usr/bin/env node

/**
 * 🔥 SSL 인증서 생성 스크립트
 * 
 * 로컬 개발 환경에서 HTTPS를 사용하기 위한 self-signed 인증서 생성
 * 
 * 사용법:
 *   node scripts/generate-ssl-cert.js
 * 
 * 또는:
 *   npm run generate-cert
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const keyPath = path.join(projectRoot, 'localhost-key.pem');
const certPath = path.join(projectRoot, 'localhost-cert.pem');

console.log('🔐 SSL 인증서 생성 시작...');
console.log('📁 프로젝트 루트:', projectRoot);
console.log('');

// OpenSSL 설치 확인
try {
  execSync('openssl version', { stdio: 'ignore' });
  console.log('✅ OpenSSL이 설치되어 있습니다.');
} catch (error) {
  console.error('❌ OpenSSL이 설치되어 있지 않습니다.');
  console.error('');
  console.error('📌 해결 방법:');
  console.error('   1. OpenSSL 설치:');
  console.error('      - Windows: https://slproweb.com/products/Win32OpenSSL.html');
  console.error('      - 또는 Git Bash에 포함된 OpenSSL 사용');
  console.error('   2. 또는 아래 명령어를 Git Bash에서 실행:');
  console.error('');
  console.error('   openssl req -x509 -newkey rsa:2048 -nodes \\');
  console.error('     -keyout localhost-key.pem \\');
  console.error('     -out localhost-cert.pem \\');
  console.error('     -days 365');
  console.error('');
  process.exit(1);
}

// 기존 인증서 확인
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('⚠️  기존 인증서가 발견되었습니다.');
  console.log('   - localhost-key.pem');
  console.log('   - localhost-cert.pem');
  console.log('');
  console.log('   기존 인증서를 덮어쓰시겠습니까? (y/n)');
  // 자동으로 덮어쓰기 (y)
  console.log('   → 자동으로 덮어쓰기 진행...');
}

try {
  console.log('🔨 인증서 생성 중...');
  
  // OpenSSL 명령어 실행
  // -x509: self-signed 인증서 생성
  // -newkey rsa:2048: 2048비트 RSA 키 생성
  // -nodes: 키를 암호화하지 않음 (개발용)
  // -days 365: 365일 유효
  // -subj: 인증서 정보 (질문 없이 자동 입력)
  const command = `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/C=KR/ST=Seoul/L=Seoul/O=YAGO VIBE/OU=Development/CN=localhost"`;
  
  execSync(command, { 
    stdio: 'inherit',
    cwd: projectRoot 
  });
  
  console.log('');
  console.log('✅ SSL 인증서 생성 완료!');
  console.log('');
  console.log('📁 생성된 파일:');
  console.log(`   - ${keyPath}`);
  console.log(`   - ${certPath}`);
  console.log('');
  console.log('🚀 다음 단계:');
  console.log('   1. npm run dev 실행');
  console.log('   2. https://localhost:5173 접속');
  console.log('   3. 브라우저에서 "고급" → "안전하지 않은 사이트로 이동" 클릭');
  console.log('   (self-signed 인증서이므로 경고가 표시됩니다)');
  console.log('');
} catch (error) {
  console.error('❌ 인증서 생성 실패:', error.message);
  console.error('');
  console.error('📌 수동 생성 방법:');
  console.error('   프로젝트 루트에서 다음 명령어 실행:');
  console.error('');
  console.error('   openssl req -x509 -newkey rsa:2048 -nodes \\');
  console.error('     -keyout localhost-key.pem \\');
  console.error('     -out localhost-cert.pem \\');
  console.error('     -days 365');
  console.error('');
  process.exit(1);
}

