const admin = require("firebase-admin");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const {
  parseIcsBusyRanges,
  dedupeBusyRanges,
  detectConflicts,
  buildIcsForApartment,
  addDays,
} = require("./ical");

admin.initializeApp();
const db = admin.firestore();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function assertHostOwner(data, auth) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const hostId = String(data.hostId || "");
  if (!hostId) {
    throw new HttpsError("invalid-argument", "hostId is required.");
  }

  const userSnap = await db.collection("users").doc(auth.uid).get();
  const profile = userSnap.data();
  const isAdmin = auth.token?.admin === true;
  if (!isAdmin && profile?.hostId !== hostId) {
    throw new HttpsError("permission-denied", "Not allowed for this host.");
  }
  return hostId;
}

function isDateString(value) {
  return DATE_RE.test(String(value || ""));
}

function normalizeDay(value) {
  const str = String(value || "");
  if (!isDateString(str)) return "";
  return str;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return !(aEnd < bStart || bEnd < aStart);
}

function isStayRangeAvailable(apartment, checkIn, checkOut) {
  const calendar = apartment.calendar || {};
  const stayEnd = addDays(checkOut, -1);
  if (stayEnd < checkIn) return false;

  const manual = Array.isArray(calendar.manualBlocks) ? calendar.manualBlocks : [];
  const imported = Array.isArray(calendar.importedBusyRanges) ? calendar.importedBusyRanges : [];
  const conflicts = Array.isArray(calendar.conflicts) ? calendar.conflicts : [];

  const overlapsManual = manual.some((item) =>
    rangesOverlap(checkIn, stayEnd, item.startDate, item.endDate)
  );
  if (overlapsManual) return false;

  const overlapsImported = imported.some((item) =>
    rangesOverlap(checkIn, stayEnd, item.startDate, item.endDate)
  );
  if (overlapsImported) return false;

  const overlapsConflict = conflicts.some((item) =>
    item.status !== "resolved" &&
    rangesOverlap(checkIn, stayEnd, item.startDate, item.endDate)
  );
  return !overlapsConflict;
}

async function getEffectiveMinStay(hostId, apartment, checkIn) {
  const seasonsSnap = await db
    .collection("hosts")
    .doc(hostId)
    .collection("seasons")
    .get();
  const seasons = seasonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const matched = seasons.find((season) =>
    Array.isArray(season.dateRanges) &&
    season.dateRanges.some((range) => checkIn >= range.start && checkIn <= range.end)
  );
  if (matched && apartment.minStay && typeof apartment.minStay[matched.id] === "number") {
    return apartment.minStay[matched.id];
  }
  return apartment.minStayDefault || 1;
}

async function queueBookingDecisionEmail(hostId, bookingRequest) {
  const hostSnap = await db.collection("hosts").doc(hostId).get();
  const hostName = hostSnap.exists ? hostSnap.data()?.name || hostId : hostId;
  const isAccepted = bookingRequest.status === "accepted";
  const subject = isAccepted
    ? `Booking request accepted by ${hostName}`
    : `Booking request declined by ${hostName}`;
  const text = [
    `Hello ${bookingRequest.guestName},`,
    "",
    isAccepted
      ? `Your booking request for ${bookingRequest.apartmentName} (${bookingRequest.checkIn} to ${bookingRequest.checkOut}) has been accepted.`
      : `Your booking request for ${bookingRequest.apartmentName} (${bookingRequest.checkIn} to ${bookingRequest.checkOut}) has been declined.`,
    "",
    "Thank you for your request.",
  ].join("\n");

  const html = `<p>Hello ${bookingRequest.guestName},</p>
<p>${
    isAccepted
      ? `Your booking request for <strong>${bookingRequest.apartmentName}</strong> (${bookingRequest.checkIn} to ${bookingRequest.checkOut}) has been accepted.`
      : `Your booking request for <strong>${bookingRequest.apartmentName}</strong> (${bookingRequest.checkIn} to ${bookingRequest.checkOut}) has been declined.`
  }</p>
<p>Thank you for your request.</p>`;

  await db.collection("mail").add({
    to: [bookingRequest.guestEmail],
    message: {
      subject,
      text,
      html,
    },
  });
}

async function syncApartmentCalendar(hostId, apartmentSlug) {
  const aptRef = db.collection("hosts").doc(hostId).collection("apartments").doc(apartmentSlug);
  const privateRef = db.collection("hosts").doc(hostId).collection("apartmentCalendarsPrivate").doc(apartmentSlug);
  const snap = await aptRef.get();
  if (!snap.exists) throw new Error("Apartment not found");
  const apartment = snap.data();
  const calendar = apartment.calendar || {};
  const privateSnap = await privateRef.get();
  const privateCalendar = privateSnap.exists ? privateSnap.data() : {};
  const imports = Array.isArray(privateCalendar.imports) ? privateCalendar.imports : [];

  const fetched = [];
  for (const source of imports) {
    if (!source?.isActive || !source?.url) continue;
    try {
      const response = await fetch(source.url, { method: "GET" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const parsed = parseIcsBusyRanges(text, source.id);
      fetched.push(...parsed);
      source.lastStatus = "ok";
      source.lastSyncAt = new Date().toISOString();
      source.lastError = "";
    } catch (err) {
      source.lastStatus = "error";
      source.lastSyncAt = new Date().toISOString();
      source.lastError = err instanceof Error ? err.message : "Sync failed";
    }
  }

  const importedBusyRanges = dedupeBusyRanges(fetched);
  const conflicts = detectConflicts(calendar.manualBlocks || [], importedBusyRanges);
  const now = new Date().toISOString();
  await privateRef.set(
    {
      exportToken: privateCalendar.exportToken || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)),
      imports,
      conflictPolicy: "strict-no-overwrite",
      updatedAt: now,
    },
    { merge: true }
  );
  await aptRef.update({
    "calendar.importedBusyRanges": importedBusyRanges,
    "calendar.conflicts": conflicts,
    "calendar.lastAutoSyncAt": now,
    "calendar.lastInternalUpdateAt": now,
  });

  return { importedBusyRanges, conflicts, syncedAt: now };
}

exports.syncApartmentCalendars = onSchedule("every 10 minutes", async () => {
  const hostSnaps = await db.collection("hosts").get();
  for (const host of hostSnaps.docs) {
    const apartments = await host.ref.collection("apartments").get();
    for (const apt of apartments.docs) {
      try {
        await syncApartmentCalendar(host.id, apt.id);
      } catch (err) {
        logger.error("calendar sync failed", {
          hostId: host.id,
          apartmentSlug: apt.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
});

exports.refreshApartmentCalendarImport = onCall(async (request) => {
  const data = request.data || {};
  const hostId = await assertHostOwner(data, request.auth);
  const apartmentSlug = String(data.apartmentSlug || data.slug || "");
  if (!apartmentSlug) {
    throw new HttpsError("invalid-argument", "apartmentSlug is required.");
  }
  return syncApartmentCalendar(hostId, apartmentSlug);
});

exports.createBookingRequest = onCall(async (request) => {
  const data = request.data || {};
  const hostId = String(data.hostId || "").trim();
  const apartmentSlug = String(data.apartmentSlug || "").trim();
  const checkIn = normalizeDay(data.checkIn);
  const checkOut = normalizeDay(data.checkOut);
  const guestName = String(data.guestName || "").trim();
  const guestEmail = String(data.guestEmail || "").trim().toLowerCase();
  const guestMessage = String(data.guestMessage || "").trim();
  const guestCount = Number(data.guestCount || 0);
  const approxTotal = Number(data.approxTotal || 0);

  if (!hostId || !apartmentSlug) {
    throw new HttpsError("invalid-argument", "hostId and apartmentSlug are required.");
  }
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    throw new HttpsError("invalid-argument", "Invalid booking date range.");
  }
  if (!guestName || !guestEmail) {
    throw new HttpsError("invalid-argument", "Guest name and email are required.");
  }
  if (!Number.isFinite(guestCount) || guestCount < 1) {
    throw new HttpsError("invalid-argument", "Guest count must be at least 1.");
  }
  const apartmentRef = db
    .collection("hosts")
    .doc(hostId)
    .collection("apartments")
    .doc(apartmentSlug);
  const apartmentSnap = await apartmentRef.get();
  if (!apartmentSnap.exists) {
    throw new HttpsError("not-found", "Apartment not found.");
  }

  const apartment = apartmentSnap.data();
  if (guestCount > Number(apartment?.facts?.guests || 0)) {
    throw new HttpsError("invalid-argument", "Guest count exceeds apartment capacity.");
  }
  if (!isStayRangeAvailable(apartment, checkIn, checkOut)) {
    throw new HttpsError("failed-precondition", "Selected dates are not available.");
  }

  const nights = Math.round(
    (new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000
  );
  const minStay = await getEffectiveMinStay(hostId, apartment, checkIn);
  if (nights < minStay) {
    throw new HttpsError("failed-precondition", `Minimum stay is ${minStay} nights.`);
  }

  const now = new Date().toISOString();
  const bookingRef = db.collection("hosts").doc(hostId).collection("bookingRequests").doc();
  await bookingRef.set({
    apartmentSlug,
    apartmentName: apartment.name || apartmentSlug,
    checkIn,
    checkOut,
    nights,
    guestCount,
    guestName,
    guestEmail,
    guestMessage: guestMessage || "",
    approxTotal: Number.isFinite(approxTotal) && approxTotal >= 0 ? approxTotal : 0,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  return { requestId: bookingRef.id };
});

exports.decideBookingRequest = onCall(async (request) => {
  const data = request.data || {};
  const hostId = await assertHostOwner(data, request.auth);
  const requestId = String(data.requestId || "").trim();
  const decision = String(data.decision || "").trim();
  const decisionNote = String(data.decisionNote || "").trim();

  if (!requestId) {
    throw new HttpsError("invalid-argument", "requestId is required.");
  }
  if (decision !== "accepted" && decision !== "declined") {
    throw new HttpsError("invalid-argument", "decision must be accepted or declined.");
  }

  const requestRef = db.collection("hosts").doc(hostId).collection("bookingRequests").doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) {
    throw new HttpsError("not-found", "Booking request not found.");
  }

  const existing = reqSnap.data();
  if (existing.status !== "pending") {
    throw new HttpsError("failed-precondition", "Booking request was already processed.");
  }

  if (decision === "accepted") {
    await syncApartmentCalendar(hostId, existing.apartmentSlug);
  }

  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const latestReq = await tx.get(requestRef);
    if (!latestReq.exists) throw new HttpsError("not-found", "Booking request not found.");
    const latestReqData = latestReq.data();
    if (latestReqData.status !== "pending") {
      throw new HttpsError("failed-precondition", "Booking request was already processed.");
    }

    const apartmentRef = db
      .collection("hosts")
      .doc(hostId)
      .collection("apartments")
      .doc(latestReqData.apartmentSlug);
    const aptSnap = await tx.get(apartmentRef);
    if (!aptSnap.exists) throw new HttpsError("not-found", "Apartment not found.");
    const apartment = aptSnap.data();

    if (decision === "accepted") {
      if (!isStayRangeAvailable(apartment, latestReqData.checkIn, latestReqData.checkOut)) {
        throw new HttpsError("failed-precondition", "Dates are no longer available.");
      }
      const calendar = apartment.calendar || {};
      const manualBlocks = Array.isArray(calendar.manualBlocks) ? calendar.manualBlocks : [];
      const blockId = `booking-${requestId}`;
      const filteredBlocks = manualBlocks.filter((item) => item.id !== blockId);
      filteredBlocks.push({
        id: blockId,
        startDate: latestReqData.checkIn,
        endDate: addDays(latestReqData.checkOut, -1),
        note: `booking-request:${requestId}`,
      });
      tx.update(apartmentRef, {
        "calendar.manualBlocks": filteredBlocks,
        "calendar.lastInternalUpdateAt": now,
      });
    }

    tx.update(requestRef, {
      status: decision,
      updatedAt: now,
      decidedAt: now,
      decidedByUid: request.auth.uid,
      decisionNote: decisionNote || "",
    });
  });

  const updatedSnap = await requestRef.get();
  const bookingRequest = { id: updatedSnap.id, ...updatedSnap.data() };
  await queueBookingDecisionEmail(hostId, bookingRequest);

  return { bookingRequest };
});

exports.exportApartmentIcs = onRequest(async (req, res) => {
  const hostId = String(req.query.hostId || "");
  const apartmentSlug = String(req.query.apartmentSlug || "");
  const token = String(req.query.token || "");
  if (!hostId || !apartmentSlug || !token) {
    res.status(400).send("Missing hostId, apartmentSlug, or token.");
    return;
  }

  const snap = await db.collection("hosts").doc(hostId).collection("apartments").doc(apartmentSlug).get();
  if (!snap.exists) {
    res.status(404).send("Apartment not found.");
    return;
  }
  const apartment = { id: snap.id, ...snap.data() };
  const privateSnap = await db
    .collection("hosts")
    .doc(hostId)
    .collection("apartmentCalendarsPrivate")
    .doc(apartmentSlug)
    .get();
  const exportToken = privateSnap.data()?.exportToken;
  if (!exportToken || exportToken !== token) {
    res.status(403).send("Invalid export token.");
    return;
  }

  const body = buildIcsForApartment(apartment);
  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.set("Cache-Control", "private, max-age=60");
  res.send(body);
});
