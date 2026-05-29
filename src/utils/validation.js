function normalizeText(value, maxLength) {
  const text = String(value || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  return typeof maxLength === "number" ? text.slice(0, maxLength + 1) : text;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function isValidPassword(value, minLength = 8, maxLength = 128) {
  return typeof value === "string" && value.length >= minLength && value.length <= maxLength;
}

function parsePositiveInteger(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

module.exports = {
  isPlainObject,
  isValidEmail,
  isValidPassword,
  normalizeText,
  parsePositiveInteger
};
