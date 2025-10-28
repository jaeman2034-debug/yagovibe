// src/server/pdfGenerator.ts
import express from 'express';
import { generateVoiceReportPDF } from '../utils/generateVoiceReportPDF';
import { generateYagoSignatureReport } from '../utils/generateYagoSignatureReport';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(express.json());
app.use(express.static('public'));

// PDF 생성 엔드포인트
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { intents, keywords, summary, totalCommands } = req.body;

    console.log('📄 PDF 생성 요청 받음:', {
      intents: Object.keys(intents || {}).length,
      keywords: Object.keys(keywords || {}).length,
      totalCommands
    });

    // PDF 생성
    const pdfPath = await generateVoiceReportPDF(
      intents || {},
      keywords || {},
      summary || '요약 내용이 없습니다.',
      totalCommands || 0
    );

    // PDF 파일 전송
    const fullPath = path.resolve(pdfPath);

    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(pdfPath)}"`);

      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);

      // 전송 완료 후 파일 삭제 (선택사항)
      fileStream.on('end', () => {
        setTimeout(() => {
          try {
            fs.unlinkSync(fullPath);
            console.log('🗑️ 임시 PDF 파일 삭제 완료');
          } catch (error) {
            console.warn('⚠️ 파일 삭제 실패:', error);
          }
        }, 5000); // 5초 후 삭제
      });
    } else {
      res.status(404).json({ error: 'PDF 파일을 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('❌ PDF 생성 오류:', error);
    res.status(500).json({
      error: 'PDF 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 시그니처 PDF 생성 엔드포인트
app.post('/api/generate-signature-pdf', async (req, res) => {
  try {
    const { intents, keywords, summary, totalCommands } = req.body;

    console.log('🎨 시그니처 PDF 생성 요청 받음:', {
      intents: Object.keys(intents || {}).length,
      keywords: Object.keys(keywords || {}).length,
      totalCommands
    });

    // 시그니처 PDF 생성
    const pdfPath = await generateYagoSignatureReport(
      intents || {},
      keywords || {},
      summary || '요약 내용이 없습니다.',
      totalCommands || 0
    );

    // PDF 파일 전송
    const fullPath = path.resolve(pdfPath);

    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(pdfPath)}"`);

      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);

      // 전송 완료 후 파일 삭제 (선택사항)
      fileStream.on('end', () => {
        setTimeout(() => {
          try {
            fs.unlinkSync(fullPath);
            console.log('🗑️ 임시 시그니처 PDF 파일 삭제 완료');
          } catch (error) {
            console.warn('⚠️ 파일 삭제 실패:', error);
          }
        }, 5000); // 5초 후 삭제
      });
    } else {
      res.status(404).json({ error: '시그니처 PDF 파일을 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('❌ 시그니처 PDF 생성 오류:', error);
    res.status(500).json({
      error: '시그니처 PDF 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 시그니처 테스트 엔드포인트
app.get('/api/test-signature-pdf', async (_req, res) => {
  try {
    const testIntents = {
      "지도열기": 15,
      "근처검색": 20,
      "위치이동": 6,
      "홈이동": 1,
      "미확인": 2
    };

    const testKeywords = {
      "편의점": 12,
      "식당": 8,
      "카페": 5,
      "약국": 3,
      "병원": 2,
      "주유소": 1
    };

    const testSummary = `오늘 가장 많이 사용된 명령은 '근처검색'이며 편의점 요청이 30%를 차지했습니다. 
사용자들이 주로 편의시설을 찾는 패턴을 보이고 있으며, 특히 오후 시간대에 검색이 집중되었습니다.
AI 시스템의 성공률은 95.5%로 매우 높은 수준을 유지하고 있습니다. 
내일은 더 많은 사용자에게 도움이 될 수 있도록 개선된 검색 알고리즘을 적용할 예정입니다.`;

    const pdfPath = await generateYagoSignatureReport(
      testIntents,
      testKeywords,
      testSummary,
      44
    );

    const fullPath = path.resolve(pdfPath);

    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="YAGO_VIBE_Signature_Test_Report.pdf"`);

      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ error: '시그니처 테스트 PDF 파일을 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('❌ 시그니처 테스트 PDF 생성 오류:', error);
    res.status(500).json({ error: '시그니처 테스트 PDF 생성 실패' });
  }
});

// 기존 테스트 엔드포인트
app.get('/api/test-pdf', async (_req, res) => {
  try {
    const testIntents = {
      "지도열기": 15,
      "근처검색": 20,
      "위치이동": 6,
      "홈이동": 1,
      "미확인": 2
    };

    const testKeywords = {
      "편의점": 12,
      "식당": 8,
      "카페": 5,
      "약국": 3,
      "병원": 2
    };

    const testSummary = `오늘은 근처검색 명령이 가장 많았으며, 편의점 관련 요청이 전체의 30%를 차지했습니다. 
사용자들이 주로 편의시설을 찾는 패턴을 보이고 있으며, 특히 오후 시간대에 검색이 집중되었습니다.
AI 시스템의 성공률은 95.5%로 매우 높은 수준을 유지하고 있습니다.`;

    const pdfPath = await generateVoiceReportPDF(
      testIntents,
      testKeywords,
      testSummary,
      44
    );

    const fullPath = path.resolve(pdfPath);

    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="YAGO_VIBE_Test_Report.pdf"`);

      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ error: '테스트 PDF 파일을 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('❌ 테스트 PDF 생성 오류:', error);
    res.status(500).json({ error: '테스트 PDF 생성 실패' });
  }
});

// 헬스 체크
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'YAGO VIBE PDF Generator',
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 PDF Generator 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📄 PDF 생성 엔드포인트: http://localhost:${PORT}/api/generate-pdf`);
  console.log(`🎨 시그니처 PDF 생성 엔드포인트: http://localhost:${PORT}/api/generate-signature-pdf`);
  console.log(`🧪 테스트 엔드포인트: http://localhost:${PORT}/api/test-pdf`);
  console.log(`🎨 시그니처 테스트 엔드포인트: http://localhost:${PORT}/api/test-signature-pdf`);
});

export default app;
