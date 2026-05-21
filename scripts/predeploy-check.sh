#!/bin/bash

# 🔥 배포 전 안전 체크리스트 (실전 DevOps 세트)

set -e  # 에러 발생 시 즉시 종료

echo "🚀 배포 전 안전 체크 시작..."

# 1️⃣ Functions 타입 체크
echo "📦 [1/4] Functions 타입 체크..."
cd functions
if ! npm run build; then
  echo "❌ Functions 빌드 실패"
  exit 1
fi
cd ..
echo "✅ Functions 빌드 성공"

# 2️⃣ Firestore Rules 문법 체크
echo "🔐 [2/4] Firestore Rules 문법 체크..."
if ! firebase deploy --only firestore:rules --dry-run > /dev/null 2>&1; then
  echo "❌ Firestore Rules 문법 오류"
  exit 1
fi
echo "✅ Firestore Rules 문법 정상"

# 3️⃣ 인덱스 체크
echo "📊 [3/4] Firestore 인덱스 체크..."
if ! firebase deploy --only firestore:indexes --dry-run > /dev/null 2>&1; then
  echo "❌ Firestore 인덱스 오류"
  exit 1
fi
echo "✅ Firestore 인덱스 정상"

# 4️⃣ 클라이언트 빌드 체크
echo "🏗️ [4/4] 클라이언트 빌드 체크..."
if ! npm run build > /dev/null 2>&1; then
  echo "❌ 클라이언트 빌드 실패"
  exit 1
fi
echo "✅ 클라이언트 빌드 성공"

echo "✅ 모든 배포 전 체크 완료!"
echo "🚀 배포 준비 완료"
