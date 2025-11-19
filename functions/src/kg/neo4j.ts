import neo4j, { Driver, Session } from "neo4j-driver";
import * as logger from "firebase-functions/logger";

let driver: Driver | null = null;

/**
 * Neo4j 드라이버 초기화
 */
export function getDriver(): Driver {
    if (!driver) {
        const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
        const user = process.env.NEO4J_USER || "neo4j";
        const pass = process.env.NEO4J_PASS || "password";

        if (!process.env.NEO4J_URI) {
            logger.warn("⚠️ NEO4J_URI 환경 변수가 설정되지 않았습니다. 기본값 사용: bolt://localhost:7687");
        }

        driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
        logger.info("✅ Neo4j 드라이버 초기화 완료");
    }
    return driver;
}

/**
 * Cypher 쿼리 실행
 * @param query Cypher 쿼리 문자열
 * @param params 쿼리 파라미터
 * @returns 쿼리 결과
 */
export async function run(query: string, params?: any): Promise<any> {
    const driverInstance = getDriver();
    const session: Session = driverInstance.session();

    try {
        logger.info("🔍 Cypher 쿼리 실행:", { query: query.substring(0, 100) + "..." });
        const result = await session.run(query, params);
        return result;
    } catch (error: any) {
        logger.error("❌ Cypher 쿼리 실행 오류:", error);
        throw error;
    } finally {
        await session.close();
    }
}

/**
 * 트랜잭션으로 여러 쿼리 실행
 */
export async function runTransaction(queries: Array<{ query: string; params?: any }>): Promise<void> {
    const driverInstance = getDriver();
    const session: Session = driverInstance.session();

    try {
        await session.writeTransaction(async (tx) => {
            for (const { query, params } of queries) {
                await tx.run(query, params);
            }
        });
        logger.info(`✅ 트랜잭션 완료: ${queries.length}개 쿼리`);
    } catch (error: any) {
        logger.error("❌ 트랜잭션 오류:", error);
        throw error;
    } finally {
        await session.close();
    }
}

/**
 * 드라이버 종료 (애플리케이션 종료 시 호출)
 */
export async function closeDriver(): Promise<void> {
    if (driver) {
        await driver.close();
        driver = null;
        logger.info("✅ Neo4j 드라이버 종료");
    }
}

