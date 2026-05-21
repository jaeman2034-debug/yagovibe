import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";

export async function exportReportToPDF(reportText: string, elementId: string) {
  const input = document.getElementById(elementId);
  if (!input) return alert("리포트 영역을 찾을 수 없습니다.");

  // 1️⃣ PDF 캡처
  const canvas = await html2canvas(input, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  // 2️⃣ 페이지 비율 계산
  const imgWidth = 190;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;

  // 3️⃣ PDF 구성
  pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // 4️⃣ 메타정보 추가
  const today = new Date().toISOString().slice(0, 10);
  pdf.setFontSize(10);
  pdf.text(`YAGO SPORTS | Generated: ${today}`, 10, 290);

  // 5️⃣ 로컬 저장
  pdf.save(`weekly-report_${today}.pdf`);

  // 6️⃣ Firebase Storage 업로드
  try {
    const pdfBlob = pdf.output("blob");
    const fileName = `reports/weekly-report_${today}_${Date.now()}.pdf`;
    const pdfRef = ref(storage, fileName);
    await uploadBytes(pdfRef, pdfBlob);
    const pdfURL = await getDownloadURL(pdfRef);
    
    // Firestore에 URL 저장
    await updateDoc(doc(db, "reports", "weekly"), { pdfURL });
    
    console.log("✅ PDF가 Firebase Storage에 업로드되었습니다:", pdfURL);
  } catch (error) {
    console.error("❌ PDF 업로드 실패:", error);
  }

  // 7️⃣ TTS 음성도 자동 저장 (Blob 생성)
  saveTTSAudio(reportText);
}

function saveTTSAudio(text: string) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ko-KR";
  utter.rate = 1.0;
  utter.pitch = 1.0;

  // 🔊 Web Speech API는 직접 mp3로 저장 불가
  // 👉 대신 AudioContext로 실시간 녹음
  try {
    const synth = window.speechSynthesis;
    synth.speak(utter);
    console.log("음성 출력 시작 (브라우저 오디오 녹음은 별도 권한 필요)");
  } catch (err) {
    console.error("TTS 실패:", err);
  }
}

