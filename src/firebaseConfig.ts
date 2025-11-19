import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// TODO: Replace the placeholder values below with your Firebase project's config.
// You can find the config in Firebase Console → Project settings → General → Your apps.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);


