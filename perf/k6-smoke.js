/**
 * Step 69: k6 Smoke Test
 * Launch Gates 성능 검증
 */

import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 5 },  // 5 VUs로 10초
        { duration: '20s', target: 5 },   // 5 VUs 유지 20초
    ],
    thresholds: {
        http_req_failed: ['rate<0.02'],      // 실패율 < 2%
        http_req_duration: ['p(95)<900'],    // p95 < 900ms
        http_req_duration: ['p(50)<400'],   // p50 < 400ms
    },
};

const TARGET = __ENV.TARGET || 'https://yago-vibe-spt.web.app';

export default function () {
    // Health Check
    const healthRes = http.get(`${TARGET}/health`);
    check(healthRes, {
        'health status is 200': (res) => res.status === 200,
        'health response time < 500ms': (res) => res.timings.duration < 500,
    });

    sleep(1);

    // API 엔드포인트 테스트 (예시)
    const apiRes = http.get(`${TARGET}/api/health`);
    check(apiRes, {
        'api status is 200': (res) => res.status === 200,
        'api response time < 900ms': (res) => res.timings.duration < 900,
    });

    sleep(1);
}

