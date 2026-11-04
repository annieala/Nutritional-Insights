// Firebase Configuration
// Using Firebase Compat SDK (works with CDN)

const firebaseConfig = {
  apiKey:window.APP_CONFIG.firebaseApiKey,
  authDomain: "nutrition-6b542.firebaseapp.com",
  projectId: "nutrition-6b542",
  storageBucket: "nutrition-6b542.firebasestorage.app",
  messagingSenderId: "211310590588",
  appId: "1:211310590588:web:6eed4561145ac72b5ae7f9",
  measurementId: "G-5KR07KY798"
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

