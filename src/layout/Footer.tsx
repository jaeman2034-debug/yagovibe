export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 flex items-center space-x-2">
                            <span>⚽</span>
                            <span>YAGO VIBE</span>
                        </h3>
                        <p className="text-gray-400 text-sm">
                            음성 기반 스마트 지도 서비스
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3">서비스</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li>🎙️ 음성 인식</li>
                            <li>🗺️ 실시간 지도</li>
                            <li>🏟️ 체육시설</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3">기능</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li>🤖 AI 어시스턴트</li>
                            <li>📊 데이터 분석</li>
                            <li>📱 음성 명령</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3">정보</h4>
                        <p className="text-gray-400 text-sm">
                            © 2025 YAGO VIBE Platform
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                            음성으로 쉽고 빠르게
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
                    <p>Built with ❤️ using React + TypeScript + Firebase</p>
                </div>
            </div>
        </footer>
    );
}
