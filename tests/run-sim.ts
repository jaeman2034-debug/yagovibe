/**
 * 🧪 QA 시뮬레이터
 * 음성 명령 자동 테스트 및 리포트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 모듈 지원
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  id: string;
  input: string;
  memory?: string;
  expect: {
    kind: 'OPEN_SEARCH' | 'OPEN_NAVIGATE' | 'NOOP';
  };
}

interface TestResult {
  id: string;
  ok: boolean;
  kind?: string;
  latencyMs: number;
  fallback?: string;
  error?: string;
}

interface Summary {
  total: number;
  pass: number;
  fail: number;
  failRate: number;
  p95Latency: number;
  p99Latency: number;
  avgLatency: number;
  fallbackRate: number;
  results: TestResult[];
}

/**
 * 단일 테스트 케이스 실행
 */
async function runCase(
  testCase: TestCase,
  endpoint: string
): Promise<TestResult> {
  const t0 = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finalText: testCase.input,
        memory: testCase.memory || '(empty)',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const latencyMs = Date.now() - t0;

    const kind = json.instruction?.kind;
    const ok = kind === testCase.expect.kind;

    return {
      id: testCase.id,
      ok,
      kind,
      latencyMs,
      fallback: json.debug?.fallback,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - t0;

    return {
      id: testCase.id,
      ok: false,
      latencyMs,
      error: error?.message || String(error),
    };
  }
}

/**
 * 시뮬레이터 실행
 */
async function runSimulator(
  casesPath: string,
  endpoint: string,
  outputPath?: string
): Promise<Summary> {
  // 테스트 케이스 로드
  const casesContent = fs.readFileSync(casesPath, 'utf-8');
  const cases: TestCase[] = JSON.parse(casesContent);

  console.log(`🧪 테스트 케이스 로드: ${cases.length}개`);
  console.log(`🎯 엔드포인트: ${endpoint}\n`);

  // 모든 케이스 실행
  const results: TestResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    process.stdout.write(
      `[${i + 1}/${cases.length}] ${testCase.id}... `
    );

    const result = await runCase(testCase, endpoint);
    results.push(result);

    const status = result.ok ? '✅' : '❌';
    console.log(
      `${status} ${result.kind || 'NONE'} (${result.latencyMs}ms)`
    );

    // 짧은 딜레이 (Rate Limit 방지)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 결과 분석
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const failRate = (fail / results.length) * 100;

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avgLatency =
    latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0;

  const fallbackCount = results.filter((r) => r.fallback).length;
  const fallbackRate = (fallbackCount / results.length) * 100;

  const summary: Summary = {
    total: results.length,
    pass,
    fail,
    failRate,
    p95Latency,
    p99Latency,
    avgLatency,
    fallbackRate,
    results,
  };

  // 결과 저장
  if (outputPath) {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(summary, null, 2),
      'utf-8'
    );
    console.log(`\n📊 결과 저장: ${outputPath}`);
  }

  return summary;
}

/**
 * 레드라인 체크
 */
function checkRedlines(summary: Summary): boolean {
  const redlines = [
    {
      name: 'Fail Rate',
      value: summary.failRate,
      threshold: 1.0,
      passed: summary.failRate <= 1.0,
    },
    {
      name: 'P95 Latency',
      value: summary.p95Latency,
      threshold: 1200,
      passed: summary.p95Latency <= 1200,
    },
    {
      name: 'Fallback Rate',
      value: summary.fallbackRate,
      threshold: 10.0,
      passed: summary.fallbackRate <= 10.0,
    },
  ];

  console.log('\n=== 레드라인 체크 ===');
  let allPassed = true;

  for (const redline of redlines) {
    const status = redline.passed ? '✅' : '❌';
    console.log(
      `${status} ${redline.name}: ${redline.value.toFixed(2)} (임계값: ${redline.threshold})`
    );

    if (!redline.passed) {
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * 리포트 출력
 */
function printReport(summary: Summary): void {
  console.log('\n=== QA 리포트 ===');
  console.log(`총 테스트: ${summary.total}`);
  console.log(`✅ 통과: ${summary.pass}`);
  console.log(`❌ 실패: ${summary.fail}`);
  console.log(`실패율: ${summary.failRate.toFixed(2)}%`);
  console.log(`\n⚡ Latency:`);
  console.log(`  평균: ${summary.avgLatency.toFixed(2)}ms`);
  console.log(`  P95: ${summary.p95Latency.toFixed(2)}ms`);
  console.log(`  P99: ${summary.p99Latency.toFixed(2)}ms`);
  console.log(`\n🛡️ Fallback 비율: ${summary.fallbackRate.toFixed(2)}%`);

  // 실패 케이스 목록
  const failures = summary.results.filter((r) => !r.ok);
  if (failures.length > 0) {
    console.log(`\n❌ 실패 케이스 (${failures.length}개):`);
    for (const failure of failures) {
      console.log(`  - ${failure.id}: ${failure.error || 'kind mismatch'}`);
    }
  }
}

/**
 * 메인 실행
 */
async function main() {
  const casesPath =
    process.env.CASES_PATH || path.join(__dirname, 'cases.json');
  
  // 엔드포인트 확인
  const defaultEndpoint = process.env.STEP_ENDPOINT || 
    'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/voiceStep';
  
  console.log(`\n⚠️  주의: 엔드포인트가 배포되지 않았을 수 있습니다.`);
  console.log(`📝 현재 엔드포인트: ${defaultEndpoint}`);
  console.log(`💡 로컬 테스트 시: STEP_ENDPOINT=http://localhost:5001/yago-vibe-spt/asia-northeast3/voiceStep npm run test\n`);
  
  const endpoint = defaultEndpoint;
  const outputPath =
    process.env.OUTPUT_PATH || path.join(__dirname, 'results.json');

  try {
    // 시뮬레이터 실행
    const summary = await runSimulator(casesPath, endpoint, outputPath);

    // 리포트 출력
    printReport(summary);

    // 레드라인 체크
    const passed = checkRedlines(summary);

    console.log('\n=== 최종 결과 ===');
    if (passed) {
      console.log('✅ QA PASSED');
      process.exit(0);
    } else {
      console.log('❌ QA FAILED');
      console.log('레드라인 위반으로 배포 금지');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ 시뮬레이터 실행 실패:', error);
    process.exit(1);
  }
}

// 실행
main();
