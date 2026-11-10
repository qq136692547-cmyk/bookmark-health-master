// tests/challenger_empirical/test_rate_limiter.mjs
import { performance } from 'node:perf_hooks';

console.log('=== EMPIRICAL STRESS TEST 2: CONCURRENCY & RATE LIMITER (500 GITHUB BOOKMARKS) ===\n');

// 1. Exact implementation from MV3_ARCHITECTURE.md (Section 3.1.3)
class ArchitectureDomainRateLimiter {
  constructor() {
    this.globalRunning = 0;
    this.maxGlobalConcurrency = 12;
    this.domainActiveMap = new Map();
    this.maxPerDomainConcurrency = 2;
    this.domainDelayMs = 150;
    this.queue = [];
  }

  async schedule(url, fn) {
    const domain = this.extractDomain(url);
    await this.acquire(domain);
    try {
      return await fn();
    } finally {
      this.release(domain);
    }
  }

  extractDomain(urlStr) {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return 'unknown-host';
    }
  }

  acquire(domain) {
    return new Promise((resolve) => {
      const checkAndRun = () => {
        const domainActive = this.domainActiveMap.get(domain) || 0;
        if (this.globalRunning < this.maxGlobalConcurrency && domainActive < this.maxPerDomainConcurrency) {
          this.globalRunning++;
          this.domainActiveMap.set(domain, domainActive + 1);
          resolve();
        } else {
          this.queue.push(checkAndRun);
        }
      };
      checkAndRun();
    });
  }

  release(domain) {
    setTimeout(() => {
      this.globalRunning--;
      const domainActive = this.domainActiveMap.get(domain) || 1;
      if (domainActive <= 1) {
        this.domainActiveMap.delete(domain);
      } else {
        this.domainActiveMap.set(domain, domainActive - 1);
      }

      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }, this.domainDelayMs);
  }
}

// Simulated network probe function
let totalHttpRequests = 0;
let githubRequests = 0;
let github429Count = 0;
const githubRequestTimes = [];

// Simulate a server with a rate limit: returns 429 if > 25 requests in 10 seconds
const serverWindow = [];
const RATE_LIMIT_THRESHOLD = 25; // standard rate limit for unauthenticated IPs

async function mockProbe(url) {
  totalHttpRequests++;
  const isGithub = url.includes('github.com');
  const now = performance.now();

  if (isGithub) {
    githubRequests++;
    githubRequestTimes.push(now);

    // Clean old timestamps (> 10s)
    while (serverWindow.length > 0 && serverWindow[0] < now - 10000) {
      serverWindow.shift();
    }
    serverWindow.push(now);

    if (serverWindow.length > RATE_LIMIT_THRESHOLD) {
      github429Count++;
      // Return 429 Too Many Requests
      return { status: 429, body: 'Too Many Requests' };
    }
  }

  // Simulate standard network latency (50ms - 100ms)
  await new Promise(r => setTimeout(r, 60));
  return { status: 200, body: 'OK' };
}

// RUN BENCHMARK: 500 bookmarks to github.com
async function runTest() {
  const limiter = new ArchitectureDomainRateLimiter();
  const startTime = performance.now();

  console.log('Scheduling 500 bookmarks for github.com...');
  const promises = [];
  for (let i = 1; i <= 500; i++) {
    promises.push(
      limiter.schedule(`https://github.com/torvalds/linux/commit/${i}`, () => 
        mockProbe(`https://github.com/torvalds/linux/commit/${i}`)
      )
    );
  }

  // Also schedule 20 bookmarks for google.com
  console.log('Scheduling 20 bookmarks for google.com...');
  for (let i = 1; i <= 20; i++) {
    promises.push(
      limiter.schedule(`https://google.com/search?q=${i}`, () => 
        mockProbe(`https://google.com/search?q=${i}`)
      )
    );
  }

  const results = await Promise.all(promises);
  const totalDurationMs = performance.now() - startTime;

  console.log(`\n--- BENCHMARK RESULTS ---`);
  console.log(`Total duration: ${(totalDurationMs / 1000).toFixed(2)} seconds`);
  console.log(`Total HTTP requests dispatched: ${totalHttpRequests}`);
  console.log(`GitHub requests dispatched: ${githubRequests}`);
  console.log(`GitHub HTTP 429 Too Many Requests errors: ${github429Count} (${((github429Count / githubRequests) * 100).toFixed(1)}% error rate!)`);
  
  // Calculate average GitHub request rate
  const githubRate = (githubRequests / (totalDurationMs / 1000)).toFixed(2);
  console.log(`Average GitHub dispatch rate: ${githubRate} req/sec`);
  
  // Peak rate calculation over any 1-second sliding window
  let maxPerSecond = 0;
  for (let i = 0; i < githubRequestTimes.length; i++) {
    const t = githubRequestTimes[i];
    const windowCount = githubRequestTimes.filter(time => time >= t && time < t + 1000).length;
    if (windowCount > maxPerSecond) maxPerSecond = windowCount;
  }
  console.log(`Peak GitHub rate in any 1-second window: ${maxPerSecond} req/sec`);

  console.log('\n--- VULNERABILITY ANALYSIS ---');
  if (github429Count > 0) {
    console.log(`[VULNERABILITY CONFIRMED]: The architecture allows continuous flooding during HTTP 429!`);
    console.log(`Out of 500 requests, ${github429Count} requests were pummeled into the server despite receiving HTTP 429!`);
    console.log(`Reason: DeadlinkProbeEngine silently classifies 429 as ANTI_BOT_PROTECTED without notifying DomainRateLimiter to back off or sleep!`);
  }
}

runTest();
