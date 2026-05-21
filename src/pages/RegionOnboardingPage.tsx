import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function RegionOnboardingPage() {
  const navigate = useNavigate();

  const regions = [
    "서울","경기","인천","부산","대구","광주","대전","울산",
    "세종","강원","충북","충남","전북","전남","경북","경남","제주"
  ];

  const selectRegion = async (region:string) => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요합니다");
      return;
    }

    try {
      // 🔥 Firestore 저장
      await setDoc(
        doc(db,"users",user.uid),
        {
          region,
          onboardingCompleted: true,
          updatedAt: new Date()
        },
        { merge:true }
      );

      // 🔥 Firebase 상태 동기화 기다림
      await new Promise(r => setTimeout(r, 400));

      // 🔥 홈 이동 (replace)
      if (!window.location.pathname.startsWith("/sports")) {
        console.log("🔥 NAVIGATE HOME TRIGGERED [RegionOnboardingPage:after-save]", window.location.pathname);
      navigate("/home", { replace:true });
      }

    } catch(e){
      console.error("Region save error:", e);
      alert("지역 저장 실패");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white p-6">
      <div className="w-full max-w-none md:max-w-3xl border rounded-2xl p-8 shadow-sm">

        <h1 className="text-2xl font-bold mb-6">
          주로 활동하는 지역을 선택해주세요
        </h1>

        <div className="grid grid-cols-2 gap-3">
          {regions.map(r=>(
            <button
              key={r}
              onClick={()=>selectRegion(r)}
              className="border rounded-xl py-3 hover:bg-gray-50 transition"
            >
              {r}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
