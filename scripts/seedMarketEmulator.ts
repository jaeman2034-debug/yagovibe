import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  projectId: "yago-vibe-spt",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedProducts = async () => {
  const products = [
    {
      name: "테스트 축구공",
      price: "15000",
      category: "축구",
      desc: "AI 테스트용 축구공입니다",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/test-ball.jpg?alt=media",
      createdAt: serverTimestamp(),
    },
    {
      name: "테스트 축구화",
      price: "35000",
      category: "축구",
      desc: "AI 음성 검색용 축구화입니다",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/test-shoes.jpg?alt=media",
      createdAt: serverTimestamp(),
    },
    {
      name: "테스트 농구공",
      price: "20000",
      category: "농구",
      desc: "AI 리포트용 농구공입니다",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/test-basket.jpg?alt=media",
      createdAt: serverTimestamp(),
    },
  ];

  for (const product of products) {
    await addDoc(collection(db, "marketProducts"), product);
  }
  console.log("✅ 테스트 데이터 추가 완료!");
};

seedProducts();
