/**
 * Sets the `admin: true` custom claim on the Apex user's Firebase Auth account.
 *
 * The custom claim key remains `admin` for backward compatibility with
 * existing Firestore Security Rules and client-side checks.
 *
 * Prerequisites:
 *   1. Download a service account key from Firebase Console:
 *      Project Settings → Service accounts → Generate new private key
 *   2. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable:
 *      $env:GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"   (PowerShell)
 *      export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json" (bash)
 *
 * Usage:
 *   npm run set-apex -w packages/firebase
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";

const APEX_EMAIL = "apex@taurex.one";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error("Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.");
  console.error("");
  console.error("Set it to your Firebase service account key file:");
  console.error('  $env:GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credPath, "utf-8")) as ServiceAccount;

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(APEX_EMAIL);
  await auth.setCustomUserClaims(user.uid, { admin: true });

  console.log(`Apex claim set successfully for ${APEX_EMAIL} (uid: ${user.uid})`);

  const updatedUser = await auth.getUser(user.uid);
  console.log("Custom claims:", updatedUser.customClaims);
} catch (error: unknown) {
  if (error instanceof Error && "code" in error && (error as { code: string }).code === "auth/user-not-found") {
    console.error(`Error: No user found with email ${APEX_EMAIL}`);
    console.error("Make sure this user has signed up first.");
  } else {
    console.error("Error setting apex claim:", error);
  }
  process.exit(1);
}
