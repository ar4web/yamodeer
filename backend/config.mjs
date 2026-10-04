export const LOCAL_API_HOST = "127.0.0.1";

export const resolveLocalApiBinding = (requestedHost) => ({
  host: LOCAL_API_HOST,
  ignoredHostOverride:
    typeof requestedHost === "string" && requestedHost.length > 0 && requestedHost !== LOCAL_API_HOST
});

export const parseApiPort = (value = "8787") => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError("API_PORT must be an integer between 1 and 65535.");
  }
  return port;
};
