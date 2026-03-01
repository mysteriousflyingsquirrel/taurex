import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "../firestore";
import type {
  BookingRequest,
  BookingRequestStatus,
  CreateBookingRequestInput,
  DecideBookingRequestInput,
} from "../types";

const FUNCTIONS_REGION = "us-central1";
const CREATE_REQUEST_FUNCTION_NAME = "createBookingRequest";
const DECIDE_REQUEST_FUNCTION_NAME = "decideBookingRequest";

function bookingRequestsCol(hostId: string) {
  return collection(getDb(), "hosts", hostId, "bookingRequests");
}

function bookingRequestDoc(hostId: string, requestId: string) {
  return doc(getDb(), "hosts", hostId, "bookingRequests", requestId);
}

function getFns() {
  return getFunctions(getApp(), FUNCTIONS_REGION);
}

export async function fetchBookingRequests(
  hostId: string,
  status?: BookingRequestStatus
): Promise<BookingRequest[]> {
  const base = bookingRequestsCol(hostId);
  const q = status
    ? query(base, where("status", "==", status), orderBy("createdAt", "desc"))
    : query(base, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<BookingRequest, "id">),
  }));
}

export async function fetchBookingRequestById(
  hostId: string,
  requestId: string
): Promise<BookingRequest | undefined> {
  const snap = await getDoc(bookingRequestDoc(hostId, requestId));
  if (!snap.exists()) return undefined;
  return {
    id: snap.id,
    ...(snap.data() as Omit<BookingRequest, "id">),
  };
}

export async function createBookingRequest(
  input: CreateBookingRequestInput
): Promise<{ requestId: string }> {
  const callable = httpsCallable<
    CreateBookingRequestInput,
    { requestId: string }
  >(getFns(), CREATE_REQUEST_FUNCTION_NAME);
  const result = await callable(input);
  return result.data;
}

export async function decideBookingRequest(
  input: DecideBookingRequestInput
): Promise<BookingRequest> {
  const callable = httpsCallable<
    DecideBookingRequestInput,
    { bookingRequest: BookingRequest }
  >(getFns(), DECIDE_REQUEST_FUNCTION_NAME);
  const result = await callable(input);
  return result.data.bookingRequest;
}
