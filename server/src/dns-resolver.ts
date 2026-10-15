import dns from 'node:dns';

/**
 * Decommissioned: Fragile global dns.lookup monkey-patching has been replaced
 * with standard Node.js dns.setDefaultResultOrder('ipv4first').
 *
 * This file is retained as a non-intrusive utility module for backward compatibility.
 */
export function initResilientDns(): void {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Graceful fallback for older Node runtimes
  }
}

