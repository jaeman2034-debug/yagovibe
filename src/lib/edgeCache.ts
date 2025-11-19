/**
 * Step 67: Edge 캐싱 헤더 설정
 * Functions 응답에 적절한 캐시 헤더 추가
 */

/**
 * 캐시 헤더 설정 (Functions 응답용)
 */
export function setCacheHeaders(
    res: any,
    strategy: 'html' | 'api' | 'static' | 'immutable'
): void {
    switch (strategy) {
        case 'html':
            // HTML: 짧게 (30초 브라우저, 5분 CDN)
            res.set('Cache-Control', 'public, max-age=30, s-maxage=300');
            break;
            
        case 'api':
            // API: 5초 응답 캐시 + stale-while-revalidate=30
            res.set('Cache-Control', 'public, max-age=5, s-maxage=5, stale-while-revalidate=30');
            break;
            
        case 'static':
            // 정적 파일: 1일
            res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            break;
            
        case 'immutable':
            // 불변 아티팩트(pdf/audio): 1년 + immutable
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            break;
    }
}

/**
 * 지역 라우팅 헬퍼 (클라이언트)
 */
export function getRegionEndpoint(baseUrl: string): string {
    // 간단한 지역 감지 (실제로는 더 정교한 로직 필요)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (timezone.includes('Seoul') || timezone.includes('Tokyo') || timezone.includes('Asia')) {
        return baseUrl.replace('us-central1', 'asia-northeast3');
    }
    
    return baseUrl;
}

/**
 * Signed URL 생성 (Storage용)
 */
export async function generateSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
): Promise<string> {
    // 실제 구현은 Firebase Admin SDK 사용
    // const signedUrl = await storage.bucket(bucket).file(path).getSignedUrl({
    //     action: 'read',
    //     expires: Date.now() + expiresIn * 1000,
    // });
    // return signedUrl[0];
    
    // 임시 구현
    return `https://storage.googleapis.com/${bucket}/${path}`;
}

