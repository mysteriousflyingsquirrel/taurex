import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { getFirebaseStorage } from "../storage";
import { getDb } from "../firestore";

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
