/**
 * NLU API 프록시 - Firebase Functions로 요청 전달
 * 
 * Vercel API Route: /api/nlu
 * Firebase Functions: https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/nluHandler
 */

export default async function handler(req: any, res: any) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    // Firebase Functions URL
    const firebaseFunctionUrl = process.env.VITE_NLU_ENDPOINT ||
      'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/nluHandler';

    console.log('📡 NLU 프록시 요청:', {
      method: req.method,
      url: firebaseFunctionUrl,
      body: req.body,
    });

    // Firebase Functions로 요청 전달
    const response = await fetch(firebaseFunctionUrl, {
      method: req.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method === 'POST' && req.body ? JSON.stringify(req.body) : undefined,
    });

    // 응답 데이터 파싱
    const data = await response.json();

    console.log('✅ NLU 프록시 응답:', {
      status: response.status,
      data,
    });

    // 상태 코드와 함께 응답
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('❌ NLU 프록시 오류:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'NLU 서버 연결 실패',
    });
  }
}

