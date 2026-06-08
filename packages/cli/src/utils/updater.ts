import { CYBERCODER_VERSION } from '@cybermind/shared';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CACHE_FILE = path.join(os.homedir(), '.cyber', 'update-cache.json');
const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

interface UpdateCache {
  lastCheck: number;
  latestVersion: string | null;
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export async function checkForUpdates(): Promise<{ updateAvailable: boolean; latestVersion: string | null }> {
  try {
    let cache: UpdateCache = { lastCheck: 0, latestVersion: null };
    
    if (fs.existsSync(CACHE_FILE)) {
      try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      } catch (e) {}
    }

    // If cache is still valid, use it
    if (Date.now() - cache.lastCheck < CHECK_INTERVAL && cache.latestVersion) {
      const isNewer = compareVersions(cache.latestVersion, CYBERCODER_VERSION) > 0;
      return { updateAvailable: isNewer, latestVersion: cache.latestVersion };
    }

    // Otherwise fetch from NPM
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://registry.npmjs.org/cybercoder-cli/latest', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const latestVersion = data.version;
      
      // Save to cache
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        lastCheck: Date.now(),
        latestVersion
      }));

      const isNewer = compareVersions(latestVersion, CYBERCODER_VERSION) > 0;
      return { updateAvailable: isNewer, latestVersion };
    }
  } catch (err) {
    // Silently ignore network errors to not interrupt CLI startup
  }

  return { updateAvailable: false, latestVersion: null };
}
