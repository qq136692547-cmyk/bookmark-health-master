const path = require("node:path");
const { fork } = require("node:child_process");
const { runProberTests } = require("./test_prober.js");
const { runClassifierTests } = require("./test_classifier.js");
const { runSafetyTests } = require("./test_safety.js");
const { runMv3ComplianceTests } = require("./test_mv3_compliance.js");
const { runLicenseTests } = require("./test_license.js");
const { runCrossFeatureTests } = require("./test_cross_features.js");
const { runE2EFullWorkloadTests } = require("./e2e_full_workload.js");

function runScriptFile(scriptName) {
  return () => new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, scriptName);
    const child = fork(scriptPath, [], { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test process ${scriptName} exited with non-zero exit code: ${code}`));
      }
    });
    child.on("error", (err) => reject(err));
  });
}

async function main() {
  const overallStart = Date.now();
  console.log("================================================================================");
  console.log("   Bookmark Health Master (BHM-PRO) 4-Tier E2E Automated Regression Suite   ");
  console.log("   Node.js Native Test Runner (Zero External Dependencies, Pure Local Engine)   ");
  console.log("================================================================================\n");

  const suites = [
    { id: "SUITE-01", name: "Prober, RFC1918 Shielding & Cloudflare DoH (Tier 1/2)", fn: runScriptFile("test_prober.js") },
    { id: "SUITE-02", name: "16 Titans & UGC Docs Isolation Engine (Tier 1/2)", fn: runScriptFile("test_classifier.js") },
    { id: "SUITE-03", name: "SafetyManager & Move Journal Rollback (Tier 1/2)", fn: runScriptFile("test_safety.js") },
    { id: "SUITE-04", name: "MV3 Lifecycle, Origin Stripping & Dynamic Permissions (Tier 1/2)", fn: runScriptFile("test_mv3_compliance.js") },
    { id: "SUITE-05", name: "Commercial Licensing & 2-Tier Pricing Ladder (Tier 1/2)", fn: runScriptFile("test_license.js") },
    { id: "SUITE-06", name: "Cross-Feature Combinations & Flow Control (Tier 3)", fn: runScriptFile("test_cross_features.js") },
    { id: "SUITE-07", name: "Real-World Workload Stress Corpus 1,500+ Bookmarks (Tier 4)", fn: runScriptFile("e2e_full_workload.js") },
    { id: "SUITE-08", name: "Empirical Move Journal Stress & Sync Throttling (Challenger)", fn: runScriptFile("challenger_stress_undo_and_throttling.js") },
    { id: "SUITE-09", name: "Proposed Rollback Algorithm & 500-Bookmark Fidelity", fn: runScriptFile("test_proposed_rollback_fix.js") },
    { id: "SUITE-10", name: "Rollback Sequence Reconciliation Investigation", fn: runScriptFile("test_investigate_rollback_order.js") },
    { id: "SUITE-11", name: "Batch 2 P1/P2 Hardening: Snapshot Restore, Atomic Host Lock & Zip Purity", fn: runScriptFile("test_batch2_p1_hardening.js") },
    { id: "SUITE-12", name: "Bilingual i18n (en/zh_CN), Prod Ed25519 Keygen/Webhook & Privacy Parity", fn: runScriptFile("test_step1_i18n_and_keygen.js") },
    { id: "SUITE-13", name: "Round 2 Adversarial Regression & Hardened Invariants", fn: runScriptFile("test_round2_adversarial.js") },
    { id: "SUITE-14", name: "Lemon Squeezy Webhook & Automated Issuance E2E Suite", fn: runScriptFile("test_lemon_squeezy_webhook_e2e.js") },
    { id: "SUITE-15", name: "Open Source Compliance & Repository Security Audit", fn: runScriptFile("verify_open_source_release.js") },
    { id: "SUITE-16", name: "Official Landing Page Bilingual i18n & Client-Side Localization", fn: runScriptFile("test_landing_i18n_e2e.js") }
  ];

  const results = [];
  let passedCount = 0;

  for (const s of suites) {
    const sStart = Date.now();
    try {
      await s.fn();
      const sDuration = Date.now() - sStart;
      results.push({ id: s.id, name: s.name, passed: true, duration: sDuration });
      passedCount++;
    } catch (e) {
      const sDuration = Date.now() - sStart;
      console.error(`\n❌ [${s.id}] ${s.name} FAILED after ${sDuration}ms:`, e);
      results.push({ id: s.id, name: s.name, passed: false, duration: sDuration, error: e.message });
    }
  }

  const totalDuration = Date.now() - overallStart;

  console.log("\n================================================================================");
  console.log("                            E2E TEST EXECUTION SUMMARY                          ");
  console.log("================================================================================");
  for (const r of results) {
    const statusIcon = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`  [${r.id}] ${statusIcon} (${r.duration}ms) - ${r.name}`);
  }
  console.log("--------------------------------------------------------------------------------");
  console.log(`  Total Suites: ${suites.length} | Passed: ${passedCount} | Failed: ${suites.length - passedCount}`);
  console.log(`  Total Execution Time: ${totalDuration}ms`);
  console.log("================================================================================");

  if (passedCount === suites.length) {
    console.log("\n🎉 ALL 4 TIERS OF E2E TESTS PASSED WITH 100% SUCCESS RATE! (Ready for CWS)");
    process.exit(0);
  } else {
    console.error(`\n💥 REGRESSION DETECTED: ${suites.length - passedCount} test suite(s) failed.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
