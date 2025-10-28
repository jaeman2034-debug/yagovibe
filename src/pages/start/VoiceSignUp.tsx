import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthProvider";
import { useSpeech } from "../../hooks/useSpeech";

export default function VoiceSignUp() {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [birth, setBirth] = useState("");
    const { speak, listen } = useSpeech();

    const handleStart = async () => {
        try {
            setStep(1);
            speak("이름을 말씀해주세요");
            const heardName = await listen();
            setName(heardName);

            setStep(2);
            speak(`${heardName}님, 생년월일을 말씀해주세요`);
            const heardBirth = await listen();
            setBirth(heardBirth);

            if (user) {
                await setDoc(doc(db, "users", user.uid), {
                    name: heardName,
                    birth: heardBirth,
                    createdAt: Date.now()
                });
                speak("회원가입이 완료되었습니다. 홈 화면으로 이동합니다.");
                window.location.href = "/home";
            }
        } catch (error) {
            console.error("회원가입 중 오류:", error);
            speak("죄송합니다. 다시 시도해주세요.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen text-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">🎙️ 음성으로 회원가입</h1>

                <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(step / 2) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                        {step === 0 && "시작 버튼을 눌러주세요"}
                        {step === 1 && `이름 입력 중... (${name || "대기중"})`}
                        {step === 2 && `생년월일 입력 중... (${birth || "대기중"})`}
                    </p>
                </div>

                <button
                    onClick={handleStart}
                    disabled={step > 0}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
                >
                    {step === 0 ? "시작하기" : "처리 중..."}
                </button>

                {name && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-green-800 font-medium">입력된 이름: {name}</p>
                    </div>
                )}

                {birth && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg">
                        <p className="text-green-800 font-medium">입력된 생년월일: {birth}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
