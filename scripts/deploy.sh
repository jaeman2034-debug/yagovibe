#!/bin/bash

# YAGO VIBE AI 리포트 시스템 배포 스크립트
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 YAGO VIBE AI 리포트 시스템 배포 시작..."

# 1. React 빌드
echo "📦 React 프로젝트 빌드 중..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ 빌드 실패: dist 폴더가 생성되지 않았습니다."
  exit 1
fi

echo "✅ React 빌드 완료"

# 2. Functions 빌드
echo "📦 Functions 빌드 중..."
cd functions
npm run build
cd ..

echo "✅ Functions 빌드 완료"

# 3. Firebase 배포
echo "🚀 Firebase 배포 시작..."
firebase deploy --only hosting,functions

echo "✅ 배포 완료!"

# 4. 배포 알림 테스트 (선택사항)
read -p "배포 알림을 Slack에 전송하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📤 Slack 배포 알림 전송 중..."
  # 프로젝트 ID를 환경 변수에서 가져오거나 수동으로 설정
  PROJECT_ID=$(firebase projects:list | grep -oP '(?<=│ )[^ ]+' | head -1)
  if [ -n "$PROJECT_ID" ]; then
    curl "https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/notifyDeployment" || echo "⚠️ 배포 알림 전송 실패 (함수가 아직 배포되지 않았을 수 있습니다)"
  else
    echo "⚠️ 프로젝트 ID를 찾을 수 없습니다. 수동으로 알림을 전송하세요."
  fi
fi

echo "🎉 배포 프로세스 완료!"

