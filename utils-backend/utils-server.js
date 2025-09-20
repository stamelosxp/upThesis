const fs = require("fs").promises;
const path = require("path");

function normalizeGreek(str) {
  if (!str) return "";
  return (
    String(str)
      .toLowerCase()
      .normalize("NFD")
      // remove combining diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // normalize common Greek tonos/diacritics to base letters
      .replace(/ά/g, "α")
      .replace(/έ/g, "ε")
      .replace(/ή/g, "η")
      .replace(/ί|ϊ|ΐ/g, "ι")
      .replace(/ό/g, "ο")
      .replace(/ύ|ϋ|ΰ/g, "υ")
      .replace(/ώ/g, "ω")
      // collapse multiple spaces and trim
      .replace(/\s+/g, " ")
      .trim()
  );
}

function formatDate(dateString) {
  if (!dateString) return "";
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return "";
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function humanAssignmentDuration(isofirst, isosecond) {
  if (!isofirst) return "-";
  const start = new Date(isofirst);
  if (isNaN(start)) return "-";
  let now = isosecond ? new Date(isosecond) : new Date();
  if (now < start) return "0 ημέρες";
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((now - start) / msPerDay);
  if (diffDays <= 31)
    return diffDays + " " + (diffDays === 1 ? "ημέρα" : "ημέρες");
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  const totalMonths = years * 12 + months;
  if (totalMonths < 12)
    return totalMonths + " " + (totalMonths === 1 ? "μήνα" : "μήνες");
  years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths % 12;
  const yearPart = years + " " + (years === 1 ? "έτος" : "έτη");
  return remMonths === 0
    ? yearPart
    : yearPart +
        " και " +
        remMonths +
        " " +
        (remMonths === 1 ? "μήνα" : "μήνες");
}

function normalizeUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
}

function greekRole(role) {
  switch (role) {
    case "student":
      return "Φοιτητής";
    case "professor":
      return "Καθηγητής";
    case "secretary":
      return "Γραμματεία";
    default:
      return "";
  }
}

async function fsUnlinkSafe(uploadedFilePath) {
  if (!uploadedFilePath) return;
  console.log(
    "Attempting to delete uploaded file due to failure:",
    uploadedFilePath
  );
  const fullPath = path.join(__dirname, "..", uploadedFilePath);
  try {
    await fs.unlink(fullPath);
    console.log("Deleted uploaded file due to failure:", uploadedFilePath);
  } catch (err) {
    if (err.code !== "ENOENT")
      console.error("Error deleting uploaded file:", err);
  }
}

function parseDateDDMMYYYY(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;

  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;

  // Months in JS Date are 0-based
  const date = new Date(yyyy, mm - 1, dd);

  // Validate (e.g., 32-13-2025 should fail)
  if (
    date.getFullYear() !== yyyy ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }

  return date;
}

module.exports = {
  normalizeGreek,
  formatDate,
  humanAssignmentDuration,
  normalizeUrl,
  greekRole,
  fsUnlinkSafe,
  parseDateDDMMYYYY,
};
