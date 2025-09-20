function parseProtocolDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}

function formatProtocolDate(raw) {
  const d = parseProtocolDate(raw);
  if (!d) return { date: "-", day: "-", time: "-", combined: "-" };

  const tz = "Europe/Athens";

  const date = new Intl.DateTimeFormat("el-GR", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  const day = new Intl.DateTimeFormat("el-GR", {
    timeZone: tz,
    weekday: "long",
  }).format(d);

  const time = new Intl.DateTimeFormat("el-GR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  return { date, day, time, combined: `${date} (${day}) ${time}` };
}

module.exports = { formatProtocolDate };
