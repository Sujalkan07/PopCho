import dns from 'node:dns';

// Authentic CloudFront global edge IPs for api.themoviedb.org
const TMDB_DEFAULT_IPS = [
  '3.175.86.103',
  '3.175.86.37',
  '3.175.86.67',
  '3.175.86.50',
];

let activeTmdbIps = [...TMDB_DEFAULT_IPS];
let ipIndex = 0;

/**
 * Periodically updates TMDB IPs via DNS-over-HTTPS (DoH) to keep IP addresses fresh
 * and bypass any local network / ISP DNS cache poisoning or IPv6 blackholes.
 */
async function refreshTmdbIpsOverHttps(): Promise<void> {
  try {
    const res = await fetch('https://dns.google/resolve?name=api.themoviedb.org&type=A', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { Answer?: Array<{ type: number; data: string }> };
    if (data.Answer && Array.isArray(data.Answer)) {
      const ips = data.Answer.filter((a) => a.type === 1 && a.data).map((a) => a.data);
      if (ips.length > 0) {
        activeTmdbIps = ips;
      }
    }
  } catch {
    // Fail silently, retaining verified working fallback IPs
  }
}

/**
 * Installs transparent DNS resolver hook that safely routes api.themoviedb.org
 * to authentic CloudFront edge IPs.
 */
export function initResilientDns(): void {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Ignore if not supported in environment
  }

  const originalLookup = dns.lookup;

  // Custom DNS lookup handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dns as any).lookup = function (hostname: string, options: any, callback: any) {
    const cb = typeof options === 'function' ? options : callback;
    const opt = typeof options === 'object' && options !== null ? options : {};

    if (hostname === 'api.themoviedb.org') {
      const chosenIp = activeTmdbIps[(ipIndex++) % activeTmdbIps.length];
      if (opt.all) {
        return cb(null, [{ address: chosenIp, family: 4 }]);
      }
      return cb(null, chosenIp, 4);
    }

    return originalLookup(hostname, options, callback);
  };

  // Schedule background refresh every 30 minutes
  refreshTmdbIpsOverHttps();
  setInterval(refreshTmdbIpsOverHttps, 30 * 60 * 1000).unref();
}

initResilientDns();
