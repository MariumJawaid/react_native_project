// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDei9n8nZe5HeX-Ioh2yMFeWlXaxV5Y4bI",
  authDomain: "meta-hub-4b339.firebaseapp.com",
  projectId: "meta-hub-4b339",
  storageBucket: "meta-hub-4b339.firebasestorage.app",
  messagingSenderId: "190669611425",
  appId: "1:190669611425:web:a38e5e248b4de89622abe0"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);