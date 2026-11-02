import { connect } from "node:tls";

/**
 * SHA-256 fingerprint of the agent endpoint's TLS certificate, recorded in the run bundle (doc §4.3). Inside
 * the CVM the harness talks TLS to the endpoint, so the transcript provably came from the server holding
 * this certificate. Plain-http endpoints (local tests) return "none".
 */
export function tlsFingerprint(endpoint: string, timeoutMs = 10_000): Promise<string> {
  const u = new URL(endpoint);
  if (u.protocol !== "https:") return Promise.resolve("none");
  return new Promise((resolve, reject) => {
    const socket = connect({ host: u.hostname, port: Number(u.port || 443), servername: u.hostname }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.fingerprint256) reject(new Error("no peer certificate"));
      else resolve(cert.fingerprint256.replaceAll(":", "").toLowerCase());
    });
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error("TLS fingerprint timeout"));
    });
    socket.on("error", reject);
  });
}
