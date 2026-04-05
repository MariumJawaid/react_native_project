// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZEjG3vA-VyVpMme0lzM5YTpo-36Xbsu0",
  authDomain: "alztwin-test.firebaseapp.com",
  databaseURL: "https://alztwin-test-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alztwin-test",
  storageBucket: "alztwin-test.firebasestorage.app",
  messagingSenderId: "739523529786",
  appId: "1:739523529786:web:a838db929e12aa18f6f903",
  measurementId: "G-0NS60D141H"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);