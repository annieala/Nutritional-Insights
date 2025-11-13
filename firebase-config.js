// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCFumPPE-H6pPzr9XSkfIgEowEMzjOzneI",
  authDomain: "nutritional-insights.firebaseapp.com",
  projectId: "nutritional-insights",
  storageBucket: "nutritional-insights.firebasestorage.app",
  messagingSenderId: "895096134155",
  appId: "1:895096134155:web:8c940148fbd4650f08450e",
  measurementId: "G-DMRHS421JY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = firebase.firestore();

// Enable persistence for offline support
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
      console.warn('Persistence not supported by browser');
    }
  });

// Export for use in other files
window.firebaseApp = {
  config: firebaseConfig,
  auth: auth,
  db: db
};

console.log('Firebase initialized successfully');