#!/bin/bash

# 🔥 안전 배포 스크립트 (실전 DevOps 세트)
# 순서: rules → functions → hosting → indexes

set -e  # 에러 발생 시 즉시 종료

echo "🚀 안전 배포 시작..."

# 0️⃣ 배포 전 체크
echo "📋 배포 전 체크 실행..."
bash scripts/predeploy-check.sh

# 1️⃣ Firestore Rules 배포 (최우선)
echo "🔐 [1/4] Firestore Rules 배포..."
firebase deploy --only firestore:rules
echo "✅ Rules 배포 완료"

# 2️⃣ Functions 배포
echo "⚙️ [2/4] Functions 배포..."
cd functions
npm run build
cd ..
firebase deploy --only functions
echo "✅ Functions 배포 완료"

# 3️⃣ Hosting 배포
echo "🌐 [3/4] Hosting 배포..."
npm run build
firebase deploy --only hosting
echo "✅ Hosting 배포 완료"

# 4️⃣ Firestore Indexes 배포 (마지막)
echo "📊 [4/4] Firestore Indexes 배포..."
firebase deploy --only firestore:indexes
echo "✅ Indexes 배포 완료"

echo "🎉 전체 배포 완료!"
