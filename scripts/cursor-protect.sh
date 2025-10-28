#!/bin/bash
# ===============================================
# 🧠 YAGO VIBE Cursor-Protect Script
# 목적: 커서가 핵심 로직(router, firebase, ai-core 등)을 자동 수정하지 못하게 보호
# 실행: bash scripts/cursor-protect.sh
# ===============================================

ROOT_DIR="src"
CORE_DIR="$ROOT_DIR/core"

echo "🚀 Setting up Cursor-Protected architecture..."

# 1️⃣ core 폴더 생성
mkdir -p $CORE_DIR

# 2️⃣ 보호 대상 파일 이동
for f in router.tsx firebase.ts ai-core.ts env.ts constants.ts; do
  if [ -f "$ROOT_DIR/$f" ]; then
    mv "$ROOT_DIR/$f" "$CORE_DIR/$f"
    echo "🔒 Moved $f → $CORE_DIR/"
  fi
done

# 3️⃣ core 폴더 보호 주석 자동 삽입
for file in $(find $CORE_DIR -type f -name "*.ts" -o -name "*.tsx"); do
  if ! grep -q "PROTECTED SECTION" "$file"; then
    sed -i '1i // === CORE PROTECTED: DO NOT MODIFY BELOW ===' "$file"
    echo "// === END PROTECTED ===" >> "$file"
    echo "🛡️ Protected header added to $file"
  fi
done

# 4️⃣ src 경로 alias 점검 (vite.config.ts)
if ! grep -q "@" vite.config.ts; then
  echo "⚙️ Adding @ alias to vite.config.ts"
  echo "
  resolve: {
    alias: {
      '@': '/src'
    }
  }," >> vite.config.ts
fi

# 5️⃣ 완료 메시지
echo "✅ Cursor-Protect structure applied successfully."
echo "👉 커서 수정 시 'core/' 폴더는 절대 터치하지 않습니다."
