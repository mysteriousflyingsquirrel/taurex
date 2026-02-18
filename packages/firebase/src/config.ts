import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";

export function initFirebase(config: FirebaseOptions) {
  if (getApps().length === 0) {
    initializeApp(config);
  }
}
