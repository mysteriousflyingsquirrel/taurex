/**
 * Sets the `admin: true` custom claim on a Firebase Auth user.
 *
 * Prerequisites:
 *   1. Download a service account key from Firebase Console:
 *      Project Settings → Service accounts → Generate new private key
 *   2. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable:
 *      $env:GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"   (PowerShell)
 *      export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json" (bash)
 *
 * Usage:
 *   npm run set-admin -w firebase
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";

const ADMIN_EMAIL = "admin@taurex.one";

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
  const user = await auth.getUserByEmail(ADMIN_EMAIL);
  await auth.setCustomUserClaims(user.uid, { admin: true });

  console.log(`Admin claim set successfully for ${ADMIN_EMAIL} (uid: ${user.uid})`);

  const updatedUser = await auth.getUser(user.uid);
  console.log("Custom claims:", updatedUser.customClaims);
} catch (error: unknown) {
  if (error instanceof Error && "code" in error && (error as { code: string }).code === "auth/user-not-found") {
    console.error(`Error: No user found with email ${ADMIN_EMAIL}`);
    console.error("Make sure this user has signed up first.");
  } else {
    console.error("Error setting admin claim:", error);
  }
  process.exit(1);
}
