const admin = require("firebase-admin");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const {
  parseIcsBusyRanges,
  dedupeBusyRanges,
  detectConflicts,
  buildIcsForApartment,
} = require("./ical");

admin.initializeApp();
const db = admin.firestore();

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
