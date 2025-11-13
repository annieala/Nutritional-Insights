// Firebase Configuration
// Using Firebase Compat SDK (works with CDN)

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
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
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