import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { getFirebaseStorage } from "../storage";
import { getDb } from "../firestore";
import type { ApartmentImage } from "../types";
import { resizeImage } from "../utils/resizeImage";

const THUMB_MAX_WIDTH = 768;
const FULL_MAX_WIDTH = 1920;

function extensionFromFile(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "bin";
  return name.slice(dot + 1).toLowerCase();
}

export async function uploadHostLogo(
  hostId: string,
  file: File,
): Promise<string> {
  const ext = extensionFromFile(file);
  const path = `branding/${hostId}/logo.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(getDb(), "hosts", hostId), { logoUrl: url });
  return url;
}

export async function uploadHostBanner(
  hostId: string,
  file: File,
): Promise<string> {
  const ext = extensionFromFile(file);
  const path = `branding/${hostId}/banner.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(getDb(), "hosts", hostId), { bannerUrl: url });
  return url;
}

export async function removeHostLogo(hostId: string): Promise<void> {
  await updateDoc(doc(getDb(), "hosts", hostId), { logoUrl: deleteField() });
}

export async function removeHostBanner(hostId: string): Promise<void> {
  await updateDoc(doc(getDb(), "hosts", hostId), { bannerUrl: deleteField() });
}

export async function deleteStorageFile(path: string): Promise<void> {
  const storageRef = ref(getFirebaseStorage(), path);
  await deleteObject(storageRef);
}

/**
 * Upload an apartment image in two resolutions (thumbnail + full-res).
 * Returns an ApartmentImage with both download URLs.
 * The caller is responsible for updating the apartment Firestore document.
 */
export async function uploadApartmentImage(
  hostId: string,
  slug: string,
  file: File,
): Promise<ApartmentImage> {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  const [thumbBlob, fullBlob] = await Promise.all([
    resizeImage(file, THUMB_MAX_WIDTH),
    resizeImage(file, FULL_MAX_WIDTH),
  ]);

  const storage = getFirebaseStorage();
  const thumbRef = ref(storage, `thumbnails/${hostId}/${slug}/${filename}`);
  const fullRef = ref(storage, `images/${hostId}/${slug}/${filename}`);

  await Promise.all([
    uploadBytes(thumbRef, thumbBlob, { contentType: "image/webp" }),
    uploadBytes(fullRef, fullBlob, { contentType: "image/webp" }),
  ]);

  const [src, srcBig] = await Promise.all([
    getDownloadURL(thumbRef),
    getDownloadURL(fullRef),
  ]);

  return { src, srcBig, alt: "" };
}

/**
 * Remove an apartment image from both storage paths.
 * The caller is responsible for updating the apartment Firestore document.
 */
export async function removeApartmentImage(
  hostId: string,
  slug: string,
  filename: string,
): Promise<void> {
  const storage = getFirebaseStorage();
  const thumbRef = ref(storage, `thumbnails/${hostId}/${slug}/${filename}`);
  const fullRef = ref(storage, `images/${hostId}/${slug}/${filename}`);

  await Promise.all([
    deleteObject(thumbRef).catch(() => {}),
    deleteObject(fullRef).catch(() => {}),
  ]);
}
