import { Component } from "react";
import type { ReactNode } from "react";
import { captureException } from "@/lib/sentry";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: any) {
        console.error("🚨 ErrorBoundary Caught:", error, info);

        // Sentry에 에러 전송
        captureException(error, {
            componentStack: info.componentStack,
            errorBoundary: true,
            timestamp: new Date().toISOString(),
        });

        // 에러 로깅
        if (typeof window !== 'undefined') {
            console.error("Error Details:", {
                message: error.message,
                stack: error.stack,
                componentStack: info.componentStack,
                timestamp: new Date().toISOString()
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <main className="mx-auto flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 px-4 py-6 text-center max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                    <section className="w-full rounded-2xl bg-white p-8 shadow-lg">
                        <h1 className="mb-4 text-3xl font-bold text-red-600">⚠️ 오류가 발생했습니다</h1>
                        <p className="mb-6 text-gray-600">
                            예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.
                        </p>

                        {this.state.error && (
                            <details className="mb-6 p-3 bg-gray-100 rounded text-left text-sm">
                                <summary className="cursor-pointer font-medium text-gray-700">
                                    오류 상세 정보
                                </summary>
                                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold"
                            >
                                🔄 페이지 새로고침
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-semibold"
                            >
                                🏠 홈으로 이동
                            </button>
                        </div>
                    </section>
                </main>
            );
        }

        return this.props.children;
    }
}
