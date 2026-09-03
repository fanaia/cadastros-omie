const crypto = require("node:crypto");

function configurationError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 503;
  return error;
}
function resolveBindingKey(value) {
  const source = String(value === undefined ? process.env.INSTANCE_CREDENTIAL_ENCRYPTION_KEY || "" : value).trim();
  if (!source) throw configurationError("BINDING_PROTECTION_REQUIRED", "A proteção do vínculo entre módulos não está configurada.");
  return crypto.createHmac("sha256", source).update("cadastros-omie/resolver-binding/v1").digest();
}
function encryptBinding(value, keyValue) {
  const key = resolveBindingKey(keyValue);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(value), "utf8")), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
function decryptBinding(envelope, keyValue) {
  const key = resolveBindingKey(keyValue);
  const [version, iv, tag, encrypted] = String(envelope || "").split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw configurationError("BINDING_ENVELOPE_INVALID", "O vínculo protegido é inválido.");
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"));
  } catch {
    throw configurationError("BINDING_ENVELOPE_INVALID", "Não foi possível abrir o vínculo protegido.");
  }
}

module.exports = { decryptBinding, encryptBinding, resolveBindingKey };
