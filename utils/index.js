const CHROME_DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CHROME_MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

function getUserAgent() {
  return CHROME_DESKTOP_UA;
}

function getCookiesFromHeaders(headers) {
  if (!headers) return "";
  let raw = headers["set-cookie"] || headers["Set-Cookie"] || "";
  if (!raw) return "";
  if (!Array.isArray(raw)) raw = [raw];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

function serializeData(obj) {
  if (typeof obj === "string") return obj;
  return new URLSearchParams(obj).toString();
}

module.exports = {
  getUserAgent,
  getCookiesFromHeaders,
  serializeData,
  CHROME_DESKTOP_UA,
  CHROME_MOBILE_UA
};
