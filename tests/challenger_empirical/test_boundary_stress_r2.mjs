// ============================================================================
// Challenger 2: Adversarial Boundary & Stress Verification Suite
// Focus: Anti-False-Positive RFC1918/IPv6, DoH Failure Modes, UGC Docs Zero-Leakage
// ============================================================================

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { BookmarkProber } = require('../../bookmark-organizer/core/prober.js');
const { EcosystemClassifier } = require('../../bookmark-organizer/core/classifier.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function testSuite1_IntranetAndRFC1918() {
  console.log('\n================================================================');
  console.log('▶ [CHALLENGE 1] Anti-False-Positive & RFC1918 / IPv6 Boundary Stress');
  console.log('================================================================');

  const boundaryCases = [
    // IPv6 Loopback
    { url: 'http://[::1]/', isIntranet: true, desc: 'IPv6 loopback root [::1]' },
    { url: 'http://[::1]:8080/dashboard', isIntranet: true, desc: 'IPv6 loopback with port [::1]:8080' },
    { url: 'http://[::1]:3000/api', isIntranet: true, desc: 'IPv6 loopback dev server [::1]:3000' },

    // RFC1918 10.0.0.0/8
    { url: 'http://10.0.0.0/', isIntranet: true, desc: '10.0.0.0 (10/8 lower boundary)' },
    { url: 'http://10.255.255.255/', isIntranet: true, desc: '10.255.255.255 (10/8 upper boundary)' },
    { url: 'http://9.255.255.255/', isIntranet: false, desc: '9.255.255.255 (outside 10/8 lower bound)' },
    { url: 'http://11.0.0.0/', isIntranet: false, desc: '11.0.0.0 (outside 10/8 upper bound)' },

    // RFC1918 172.16.0.0/12
    { url: 'http://172.16.0.0/', isIntranet: true, desc: '172.16.0.0 (172.16/12 lower boundary)' },
    { url: 'http://172.31.255.255/', isIntranet: true, desc: '172.31.255.255 (172.16/12 upper boundary)' },
    { url: 'http://172.20.10.5:8000/', isIntranet: true, desc: '172.20.10.5 (172.16/12 internal host)' },
    { url: 'http://172.15.255.255/', isIntranet: false, desc: '172.15.255.255 (outside 172.16/12 lower bound)' },
    { url: 'http://172.32.0.0/', isIntranet: false, desc: '172.32.0.0 (outside 172.16/12 upper bound)' },

    // RFC1918 192.168.0.0/16
    { url: 'http://192.168.0.0/', isIntranet: true, desc: '192.168.0.0 (192.168/16 lower boundary)' },
    { url: 'http://192.168.255.255/', isIntranet: true, desc: '192.168.255.255 (192.168/16 upper boundary)' },
    { url: 'http://192.167.255.255/', isIntranet: false, desc: '192.167.255.255 (outside 192.168/16 lower bound)' },
    { url: 'http://192.169.0.0/', isIntranet: false, desc: '192.169.0.0 (outside 192.168/16 upper bound)' },

    // Localhost & 127.0.0.0/8
    { url: 'http://localhost:5173/', isIntranet: true, desc: 'localhost:5173 vite server' },
    { url: 'http://127.0.0.1:8000/', isIntranet: true, desc: '127.0.0.1:8000 local server' },
    { url: 'http://127.255.255.254:9000/', isIntranet: true, desc: '127.255.255.254 loopback boundary' },

    // TLDs (.local, .internal, .lan, etc.)
    { url: 'http://printer.local/', isIntranet: true, desc: 'printer.local mDNS' },
    { url: 'http://sub.corp.local:8080/app', isIntranet: true, desc: 'sub.corp.local internal service' },
    { url: 'http://service.internal:9000/health', isIntranet: true, desc: 'service.internal cluster endpoint' },
    { url: 'http://vault.cluster.internal/', isIntranet: true, desc: 'vault.cluster.internal k8s endpoint' },
    { url: 'http://router.lan/admin', isIntranet: true, desc: 'router.lan network gateway' },
    { url: 'http://nas.home:5000/', isIntranet: true, desc: 'nas.home private storage' },
    { url: 'http://gitlab.corp/', isIntranet: true, desc: 'gitlab.corp enterprise intranet' },
    { url: 'http://wiki/', isIntranet: true, desc: 'http://wiki/ short hostname' }
  ];

  for (const tc of boundaryCases) {
    const isIntra = BookmarkProber.isIntranetUrl(tc.url);
    assert(isIntra === tc.isIntranet, `${tc.desc} -> isIntranetUrl expected ${tc.isIntranet}, got ${isIntra}`);
  }

  // Probe behavior test: None must EVER be marked DEAD
  const prober = new BookmarkProber();
  const intranetSubset = boundaryCases.filter(b => b.isIntranet);
  const probeResults = [];

  for (const tc of intranetSubset) {
    const res = await prober.probeUrl(tc.url);
    assert(res.status !== 'DEAD', `Zero false-dead: ${tc.desc} was NOT marked DEAD (status: ${res.status})`);
    assert(res.status === 'SKIPPED_INTERNAL' && res.intranetProtected === true,
      `Safe shielding: ${tc.desc} returned SKIPPED_INTERNAL with intranetProtected`);
    probeResults.push(res);
  }

  // Health Score zero-penalty check
  const healthScore = BookmarkProber.calculateHealthScore(probeResults);
  assert(healthScore === 100, `Intranet bookmarks zero score penalty: calculated health score is 100 (got ${healthScore})`);
}

async function testSuite2_DoHFailureModesMatrix() {
  console.log('\n================================================================');
  console.log('▶ [CHALLENGE 2] Cloudflare DoH Failure Modes Matrix Stress');
  console.log('================================================================');

  const origFetch = global.fetch;

  const failureModes = [
    {
      name: 'DNS NXDOMAIN (Status 3: Non-Existent Domain)',
      dohResponse: { ok: true, json: async () => ({ Status: 3, Answer: [] }) },
      expectedDoH: 'NXDOMAIN',
      expectedProbe: 'DEAD',
      mustBeDead: true
    },
    {
      name: 'DNS SERVFAIL (Status 2: Server Failure / DNSSEC Error)',
      dohResponse: { ok: true, json: async () => ({ Status: 2, Answer: [] }) },
      expectedDoH: 'RESOLVED',
      expectedProbe: 'UNREACHABLE_OR_PROTECTED',
      mustBeDead: false
    },
    {
      name: 'DNS REFUSED (Status 5: Query Refused by Upstream)',
      dohResponse: { ok: true, json: async () => ({ Status: 5, Answer: [] }) },
      expectedDoH: 'RESOLVED',
      expectedProbe: 'UNREACHABLE_OR_PROTECTED',
      mustBeDead: false
    },
    {
      name: 'DNS FormErr (Status 1: Format Error)',
      dohResponse: { ok: true, json: async () => ({ Status: 1, Answer: [] }) },
      expectedDoH: 'RESOLVED',
      expectedProbe: 'UNREACHABLE_OR_PROTECTED',
      mustBeDead: false
    },
    {
      name: 'DNS Resolved NOERROR with Valid A Record',
      dohResponse: { ok: true, json: async () => ({ Status: 0, Answer: [{ name: 'test.com', type: 1, data: '104.21.2.3' }] }) },
      expectedDoH: 'RESOLVED',
      expectedProbe: 'UNREACHABLE_OR_PROTECTED',
      mustBeDead: false
    },
    {
      name: 'DoH HTTP 502/503 Service Unavailable',
      dohResponse: { ok: false, status: 503 },
      expectedDoH: 'RESOLVED',
      expectedProbe: 'UNREACHABLE_OR_PROTECTED',
      mustBeDead: false
    },
    {
      name: 'DoH Request Abort / Connection Timeout (AbortError)',
      dohError: new Error('The user aborted a request.'),
      expectedDoH: 'ERROR',
      expectedProbe: 'UNREACHABLE_OR_PROTECTED',
      mustBeDead: false
    },
    {
      name: 'DoH TLS / Socket Handshake Failure (ECONNRESET)',
      dohError: new Error('connect ECONNRESET 1.1.1.1:443'),
      expectedDoH: 'ERROR',
      expectedProbe: 'UNREACHABLE_OR_PROTECTED',
      mustBeDead: false
    }
  ];

  try {
    for (const fm of failureModes) {
      global.fetch = async (url) => {
        if (url.includes('cloudflare-dns.com')) {
          if (fm.dohError) throw fm.dohError;
          return fm.dohResponse;
        }
        // Simulated HTTP probe failure (triggers Stage 3 DoH check)
        throw new Error('ETIMEDOUT: Connection timed out');
      };

      const dohStatus = await BookmarkProber.verifyWithDoH('sample-test-domain.org');
      assert(dohStatus === fm.expectedDoH, `DoH status for ${fm.name} -> expected ${fm.expectedDoH}, got ${dohStatus}`);

      const prober = new BookmarkProber({ timeoutMs: 30 });
      const probeRes = await prober.probeUrl('https://sample-test-domain.org/index.html');
      assert(probeRes.status === fm.expectedProbe, `Probe status for ${fm.name} -> expected ${fm.expectedProbe}, got ${probeRes.status}`);

      if (fm.mustBeDead) {
        assert(probeRes.status === 'DEAD', `Confirmed DEAD only on authentic NXDOMAIN: ${fm.name}`);
      } else {
        assert(probeRes.status !== 'DEAD', `Safe protection (NOT DEAD) on ${fm.name}`);
      }
    }
  } finally {
    global.fetch = origFetch;
  }
}

async function testSuite3_UgcDocsBoundaryAndZeroLeakage() {
  console.log('\n================================================================');
  console.log('▶ [CHALLENGE 3] UGC Collaborative Docs Boundary & Zero-Leakage Stress');
  console.log('================================================================');

  const classifier = new EcosystemClassifier();

  const trickyUgcUrls = [
    // Google Docs & Drive
    { url: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing', sub: 'google_docs' },
    { url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0', sub: 'google_docs' },
    { url: 'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit', sub: 'google_docs' },
    { url: 'https://docs.google.com/forms/d/e/1FAIpQLSc/viewform', sub: 'google_docs' },
    { url: 'https://sheets.google.com/spreadsheets/d/e/2PACX-1vT/pubhtml', sub: 'google_docs' },
    { url: 'https://slides.google.com/presentation/d/e/2PACX/pub', sub: 'google_docs' },
    { url: 'https://drive.google.com/drive/u/0/folders/1ABC_XYZ123', sub: 'google_docs' },
    { url: 'https://drive.google.com/file/d/1xyz789/view', sub: 'google_docs' },

    // Feishu & Lark suite
    { url: 'https://mycompany.feishu.cn/docx/doxcnabcdef1234567890', sub: 'feishu_lark' },
    { url: 'https://org.feishu.cn/wiki/wikcnabcdef1234567890', sub: 'feishu_lark' },
    { url: 'https://team.feishu.cn/base/bascna1b2c3d4e5f6g7h8', sub: 'feishu_lark' },
    { url: 'https://tenant.feishu.cn/sheets/shtcn1234567890', sub: 'feishu_lark' },
    { url: 'https://tenant.feishu.cn/file/fldcn1234567890', sub: 'feishu_lark' },
    { url: 'https://tenant.feishu.cn/record/reccn1234567890', sub: 'feishu_lark' },
    { url: 'https://tenant.feishu.cn/minutes/obcn1234567890', sub: 'feishu_lark' },
    { url: 'https://tenant.feishu.cn/docs/doccn1234567890', sub: 'feishu_lark' },
    { url: 'https://global-corp.larksuite.com/docx/doxcn1234567890', sub: 'feishu_lark' },
    { url: 'https://myteam.larksuite.com/wiki/wikcn1234567890', sub: 'feishu_lark' },
    { url: 'https://myteam.larksuite.com/base/bascn1234567890', sub: 'feishu_lark' },
    { url: 'https://myteam.larksuite.com/sheets/shtcn1234567890', sub: 'feishu_lark' },

    // Yuque & Notion
    { url: 'https://yuque.com/username/project/doc1', sub: 'yuque' },
    { url: 'https://team.yuque.com/books/share/doc-slug-123', sub: 'yuque' },
    { url: 'https://www.yuque.com/dashboard/notes', sub: 'yuque' },
    { url: 'https://notion.so/myworkspace/Meeting-Notes-1234567890abcdef1234567890abcdef', sub: 'notion' },
    { url: 'https://myteam.notion.site/Public-Roadmap-1234567890abcdef1234567890abcdef', sub: 'notion' },
    { url: 'https://www.notion.so/templates/project-tracker', sub: 'notion' },

    // QQ Docs & Shimo & Wolai & Office365 UGC
    { url: 'https://docs.qq.com/doc/DVnpVZ0l3R2l0WlFn', sub: 'docs_portal' },
    { url: 'https://docs.qq.com/sheet/DVnpVZ0l3R2l0WlFn', sub: 'docs_portal' },
    { url: 'https://docs.qq.com/slide/DVnpVZ0l3R2l0WlFn', sub: 'docs_portal' },
    { url: 'https://docs.qq.com/d/DVnpVZ0l3R2l0WlFn', sub: 'docs_portal' },
    { url: 'https://shimo.im/docs/KkYYWwVV123', sub: 'docs_portal' },
    { url: 'https://wolai.com/workspace123456', sub: 'docs_portal' },
    { url: 'https://mytenant.sharepoint.com/:w:/r/personal/doc.docx', sub: 'docs_portal' },
    { url: 'https://onedrive.live.com/:x:/r/workbook.xlsx', sub: 'docs_portal' }
  ];

  const officialSites = [
    { url: 'https://cloud.google.com/compute/docs', expectedEco: 'google', desc: 'Google Cloud official portal' },
    { url: 'https://developers.google.com/workspace/guides', expectedEco: 'google', desc: 'Google Workspace dev guides' },
    { url: 'https://gemini.google.com/app', expectedEco: 'google', desc: 'Google Gemini consumer app' },
    { url: 'https://console.cloud.google.com/iam-admin', expectedEco: 'google', desc: 'Google Cloud console' },
    { url: 'https://feishu.cn/', expectedEco: 'bytedance', desc: 'Feishu official homepage' },
    { url: 'https://www.feishu.cn/product/workplace', expectedEco: 'bytedance', desc: 'Feishu product landing page' },
    { url: 'https://open.feishu.cn/document/', expectedEco: 'bytedance', desc: 'Feishu open platform API docs' },
    { url: 'https://volcengine.com/product/ecs', expectedEco: 'bytedance', desc: 'Volcengine cloud console' },
    { url: 'https://doubao.com/chat', expectedEco: 'bytedance', desc: 'Doubao consumer AI' },
    { url: 'https://coze.cn/space/explore', expectedEco: 'bytedance', desc: 'Coze bot builder' },
    { url: 'https://aliyun.com/product/ecs', expectedEco: 'alibaba', desc: 'Aliyun cloud portal' },
    { url: 'https://console.aliyun.com/', expectedEco: 'alibaba', desc: 'Aliyun enterprise console' },
    { url: 'https://qwen.ai/chat', expectedEco: 'alibaba', desc: 'Qwen AI consumer portal' }
  ];

  // Individual classification verification
  for (const item of trickyUgcUrls) {
    const res = classifier.classify({ url: item.url, title: 'Collaborative Document' });
    assert(res.ecoId === 'ugc_docs', `UGC Routing: ${item.url} -> ecoId === 'ugc_docs' (got: ${res.ecoId})`);
    assert(res.isUgcDoc === true, `UGC Flag: ${item.url} -> isUgcDoc === true`);
    assert(res.subcategoryId === item.sub, `UGC Subcategory: ${item.url} -> subcategory ${item.sub} (got: ${res.subcategoryId})`);
  }

  for (const item of officialSites) {
    const res = classifier.classify({ url: item.url, title: item.desc });
    assert(res.ecoId === item.expectedEco, `Official Routing: ${item.desc} -> ecoId === '${item.expectedEco}' (got: ${res.ecoId})`);
    assert(res.isUgcDoc === false, `Official Non-UGC: ${item.desc} -> isUgcDoc === false`);
  }

  // Batch classifyAll Leakage & Contamination Stress
  const allCorpus = [
    ...trickyUgcUrls.map((u, idx) => ({ id: `ugc_${idx}`, url: u.url, title: `Doc ${idx}` })),
    ...officialSites.map((o, idx) => ({ id: `off_${idx}`, url: o.url, title: o.desc }))
  ];

  const batchOutput = classifier.classifyAll(allCorpus);

  const ugcFolderItems = Object.values(batchOutput.ecosystemGroups['ugc_docs']?.subcategories || {}).flatMap(s => s.items);
  const googleFolderItems = Object.values(batchOutput.ecosystemGroups['google']?.subcategories || {}).flatMap(s => s.items);
  const byteFolderItems = Object.values(batchOutput.ecosystemGroups['bytedance']?.subcategories || {}).flatMap(s => s.items);
  const aliFolderItems = Object.values(batchOutput.ecosystemGroups['alibaba']?.subcategories || {}).flatMap(s => s.items);

  assert(ugcFolderItems.length === trickyUgcUrls.length,
    `UGC 100% Ingestion: ${ugcFolderItems.length}/${trickyUgcUrls.length} items present in ugc_docs folder`);

  const leakedIntoGoogle = googleFolderItems.filter(i => trickyUgcUrls.some(u => u.url === i.url));
  const leakedIntoByte = byteFolderItems.filter(i => trickyUgcUrls.some(u => u.url === i.url));
  const leakedIntoAli = aliFolderItems.filter(i => trickyUgcUrls.some(u => u.url === i.url));

  assert(leakedIntoGoogle.length === 0, `Zero Leakage into Google: ${leakedIntoGoogle.length} leaked UGC items`);
  assert(leakedIntoByte.length === 0, `Zero Leakage into ByteDance: ${leakedIntoByte.length} leaked UGC items`);
  assert(leakedIntoAli.length === 0, `Zero Leakage into Alibaba: ${leakedIntoAli.length} leaked UGC items`);
}

async function runAllBoundaryChallenges() {
  const start = Date.now();
  console.log('================================================================');
  console.log('   CHALLENGER 2: ADVERSARIAL EDGE-CASE & BOUNDARY HARNESS RUN   ');
  console.log('================================================================');

  await testSuite1_IntranetAndRFC1918();
  await testSuite2_DoHFailureModesMatrix();
  await testSuite3_UgcDocsBoundaryAndZeroLeakage();

  const duration = Date.now() - start;
  console.log('\n================================================================');
  console.log('                    CHALLENGER 2 HARNESS SUMMARY                ');
  console.log('================================================================');
  console.log(`  Total Invariants Tested: ${totalTests}`);
  console.log(`  Passed Invariants:       ${passedTests} (✅)`);
  console.log(`  Failed Invariants:       ${failedTests} (❌)`);
  console.log(`  Execution Duration:      ${duration}ms`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error(`\n💥 CHALLENGER VERDICT: REQUEST_CHANGES (${failedTests} invariant failures)`);
    process.exit(1);
  } else {
    console.log(`\n🎉 CHALLENGER VERDICT: ALL ADVERSARIAL BOUNDARIES & INVARIANTS SATISFIED!`);
    process.exit(0);
  }
}

runAllBoundaryChallenges();
