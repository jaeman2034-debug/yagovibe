// scripts/generate-cert.js
// 🔥 SSL 인증서 생성 스크립트 (OpenSSL 없이 Node.js로 생성)
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.join(__dirname, '..', 'cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// cert 디렉토리 생성
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log('✅ cert 디렉토리 생성 완료');
}

// OpenSSL이 설치되어 있는지 확인
try {
  execSync('openssl version', { stdio: 'ignore' });
  console.log('✅ OpenSSL이 설치되어 있습니다. 인증서 생성 중...');
  
  // OpenSSL로 인증서 생성
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=localhost"`,
    { cwd: certDir, stdio: 'inherit' }
  );
  
  console.log('✅ SSL 인증서 생성 완료!');
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
} catch (error) {
  console.error('❌ OpenSSL이 설치되어 있지 않습니다.');
  console.error('');
  console.error('📌 해결 방법:');
  console.error('   1. OpenSSL 설치:');
  console.error('      - Windows: https://slproweb.com/products/Win32OpenSSL.html');
  console.error('      - 또는 Git Bash에 포함된 OpenSSL 사용');
  console.error('');
  console.error('   2. 또는 임시 해결책:');
  console.error('      Firebase Console에서 https://localhost:5173/__auth/handler URI 삭제');
  console.error('      http://localhost:5173/__auth/handler만 사용');
  process.exit(1);
}

