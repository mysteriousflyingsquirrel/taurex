function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateString(value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDays(dateStr, count) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return toDateString(d);
}

function parseDateToken(token) {
  const clean = String(token || "").trim();
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  if (/^\d{8}T/.test(clean)) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return "";
}

function parseIcsBusyRanges(icsText, sourceId) {
  const lines = String(icsText || "")
    .split(/\r?\n/)
    .map((line) => line.trim());

  const ranges = [];
  let inEvent = false;
  let uid = "";
  let dtStart = "";
  let dtEnd = "";
  let status = "";

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      uid = "";
      dtStart = "";
      dtEnd = "";
      status = "";
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent && status !== "CANCELLED" && dtStart) {
        const startDate = parseDateToken(dtStart);
        const endTokenDate = dtEnd ? parseDateToken(dtEnd) : startDate;
        const endDate = endTokenDate || startDate;
        ranges.push({
          source: "import",
          sourceId,
          startDate,
          endDate: endDate >= startDate ? endDate : startDate,
          note: uid || undefined,
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    if (line.startsWith("UID:")) uid = line.slice(4).trim();
    if (line.startsWith("STATUS:")) status = line.slice(7).trim().toUpperCase();
    if (line.startsWith("DTSTART")) dtStart = line.split(":").slice(1).join(":");
    if (line.startsWith("DTEND")) dtEnd = line.split(":").slice(1).join(":");
  }

  return ranges.filter((r) => r.startDate && r.endDate);
}

function dedupeBusyRanges(ranges) {
  const seen = new Set();
  const result = [];
  for (const item of ranges || []) {
    const key = `${item.source}|${item.sourceId}|${item.startDate}|${item.endDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function buildIcsForApartment(apartment) {
  const calendar = apartment?.calendar || {};
  const ranges = [...(calendar.manualBlocks || []), ...(calendar.importedBusyRanges || [])];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taurex//Apartment Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const item of ranges) {
    const uid = `${apartment.slug}-${item.source}-${item.sourceId}-${item.startDate}-${item.endDate}`.replace(
      /[^a-zA-Z0-9\-]/g,
      ""
    );
    const start = item.startDate.replace(/-/g, "");
    const endExclusive = addDays(item.endDate, 1).replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}@taurex.one`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${endExclusive}`);
    lines.push(`SUMMARY:${item.note || "Unavailable"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

module.exports = {
  toDateString,
  addDays,
  parseIcsBusyRanges,
  dedupeBusyRanges,
  buildIcsForApartment,
};
