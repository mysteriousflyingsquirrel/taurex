const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {
  parseIcsBusyRanges,
  dedupeBusyRanges,
  buildIcsForApartment,
} = require("./ical");

admin.initializeApp();
const db = admin.firestore();

async function assertHostOwner(data, context) {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }
  const hostId = String(data.hostId || "");
  if (!hostId) {
    throw new functions.https.HttpsError("invalid-argument", "hostId is required.");
  }

  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  const profile = userSnap.data();
  const isAdmin = context.auth.token?.admin === true;
  if (!isAdmin && profile?.hostId !== hostId) {
    throw new functions.https.HttpsError("permission-denied", "Not allowed for this host.");
  }
  return hostId;
}

async function syncApartmentCalendar(hostId, apartmentSlug) {
  const aptRef = db.collection("hosts").doc(hostId).collection("apartments").doc(apartmentSlug);
  const snap = await aptRef.get();
  if (!snap.exists) throw new Error("Apartment not found");
  const apartment = snap.data();
  const calendar = apartment.calendar || {};
  const imports = Array.isArray(calendar.imports) ? calendar.imports : [];

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
  const now = new Date().toISOString();
  await aptRef.update({
    "calendar.imports": imports,
    "calendar.importedBusyRanges": importedBusyRanges,
    "calendar.lastAutoSyncAt": now,
    "calendar.lastInternalUpdateAt": now,
  });

  return { importedBusyRanges, syncedAt: now };
}

exports.syncApartmentCalendars = functions.pubsub
  .schedule("every 10 minutes")
  .onRun(async () => {
    const hostSnaps = await db.collection("hosts").get();
    for (const host of hostSnaps.docs) {
      const apartments = await host.ref.collection("apartments").get();
      for (const apt of apartments.docs) {
        try {
          await syncApartmentCalendar(host.id, apt.id);
        } catch (err) {
          functions.logger.error("calendar sync failed", {
            hostId: host.id,
            apartmentSlug: apt.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    return null;
  });

exports.refreshApartmentCalendarImport = functions.https.onCall(async (data, context) => {
  const hostId = await assertHostOwner(data, context);
  const apartmentSlug = String(data.apartmentSlug || "");
  if (!apartmentSlug) {
    throw new functions.https.HttpsError("invalid-argument", "apartmentSlug is required.");
  }
  return syncApartmentCalendar(hostId, apartmentSlug);
});

exports.exportApartmentIcs = functions.https.onRequest(async (req, res) => {
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
  const exportToken = apartment.calendar?.exportToken;
  if (!exportToken || exportToken !== token) {
    res.status(403).send("Invalid export token.");
    return;
  }

  const body = buildIcsForApartment(apartment);
  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.set("Cache-Control", "private, max-age=60");
  res.send(body);
});
