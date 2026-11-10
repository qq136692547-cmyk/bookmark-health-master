const assert = require("node:assert");
const { EcosystemClassifier } = require("../bookmark-organizer/core/classifier.js");
const { ECOSYSTEM_RULES } = require("../bookmark-organizer/core/ecosystem_rules.js");

function runClassifierTests() {
  console.log("▶ [Test Suite] 16 Titans & UGC Docs EcosystemClassifier Engine Tests");

  const classifier = new EcosystemClassifier();

  // --------------------------------------------------------------------------
  // Part 1: 16 Titans Official Ecosystem Classification
  // --------------------------------------------------------------------------

  // Test 1: Google Ecosystem
  const googleItem = classifier.classify({
    url: "https://cloud.google.com/?hl=zh-cn",
    title: "Google Cloud (GCP) 控制台"
  });
  console.log(`  ✓ Google Cloud classified: ${googleItem.isEcosystem} -> ${googleItem.ecoName} [${googleItem.subcategoryName}]`);
  assert.strictEqual(googleItem.isEcosystem, true);
  assert.strictEqual(googleItem.ecoId, "google");

  // Test 2: Huawei Ecosystem
  const huaweiItem = classifier.classify({
    url: "https://developer.huawei.com/consumer/cn/harmonyos/",
    title: "HarmonyOS 开发者官网"
  });
  console.log(`  ✓ Huawei HarmonyOS classified: ${huaweiItem.isEcosystem} -> ${huaweiItem.ecoName} [${huaweiItem.subcategoryName}]`);
  assert.strictEqual(huaweiItem.isEcosystem, true);
  assert.strictEqual(huaweiItem.ecoId, "huawei");

  // Test 3: ByteDance / JianYing
  const byteItem = classifier.classify({
    url: "https://xyq.jianying.com/",
    title: "小云雀 AI - 剪映官方生态"
  });
  console.log(`  ✓ ByteDance JianYing classified: ${byteItem.isEcosystem} -> ${byteItem.ecoName} [${byteItem.subcategoryName}]`);
  assert.strictEqual(byteItem.isEcosystem, true);
  assert.strictEqual(byteItem.ecoId, "bytedance");

  // Test 4: Amazon / AWS
  const awsItem = classifier.classify({
    url: "https://aws.amazon.com/cn/console/",
    title: "AWS 云管理控制台"
  });
  console.log(`  ✓ Amazon AWS classified: ${awsItem.isEcosystem} -> ${awsItem.ecoName} [${awsItem.subcategoryName}]`);
  assert.strictEqual(awsItem.isEcosystem, true);
  assert.strictEqual(awsItem.ecoId, "amazon");

  // Test 5: Meta / Llama
  const metaItem = classifier.classify({
    url: "https://meta.ai",
    title: "Meta AI 助手"
  });
  console.log(`  ✓ Meta classified: ${metaItem.isEcosystem} -> ${metaItem.ecoName} [${metaItem.subcategoryName}]`);
  assert.strictEqual(metaItem.isEcosystem, true);
  assert.strictEqual(metaItem.ecoId, "meta");

  // Test 6: OpenAI / ChatGPT
  const openaiItem = classifier.classify({
    url: "https://chatgpt.com",
    title: "ChatGPT 核心入口"
  });
  console.log(`  ✓ OpenAI classified: ${openaiItem.isEcosystem} -> ${openaiItem.ecoName} [${openaiItem.subcategoryName}]`);
  assert.strictEqual(openaiItem.isEcosystem, true);
  assert.strictEqual(openaiItem.ecoId, "openai");

  // Test 7: NVIDIA / CUDA
  const nvidiaItem = classifier.classify({
    url: "https://developer.nvidia.com/cuda-zone",
    title: "CUDA Zone 开发者中心"
  });
  console.log(`  ✓ NVIDIA classified: ${nvidiaItem.isEcosystem} -> ${nvidiaItem.ecoName} [${nvidiaItem.subcategoryName}]`);
  assert.strictEqual(nvidiaItem.isEcosystem, true);
  assert.strictEqual(nvidiaItem.ecoId, "nvidia");

  // Test 8: Baidu
  const baiduItem = classifier.classify({
    url: "https://yiyan.baidu.com",
    title: "文心一言"
  });
  console.log(`  ✓ Baidu classified: ${baiduItem.isEcosystem} -> ${baiduItem.ecoName} [${baiduItem.subcategoryName}]`);
  assert.strictEqual(baiduItem.isEcosystem, true);
  assert.strictEqual(baiduItem.ecoId, "baidu");

  // Test 9: Xiaomi
  const xiaomiItem = classifier.classify({
    url: "https://dev.mi.com",
    title: "小米澎湃OS 开发者平台"
  });
  console.log(`  ✓ Xiaomi classified: ${xiaomiItem.isEcosystem} -> ${xiaomiItem.ecoName} [${xiaomiItem.subcategoryName}]`);
  assert.strictEqual(xiaomiItem.isEcosystem, true);
  assert.strictEqual(xiaomiItem.ecoId, "xiaomi");

  // Test 10: Anthropic Claude
  const anthropicItem = classifier.classify({
    url: "https://claude.ai",
    title: "Claude 3.5 Sonnet"
  });
  console.log(`  ✓ Anthropic classified: ${anthropicItem.isEcosystem} -> ${anthropicItem.ecoName} [${anthropicItem.subcategoryName}]`);
  assert.strictEqual(anthropicItem.isEcosystem, true);
  assert.strictEqual(anthropicItem.ecoId, "anthropic");

  // Test 11: Cloudflare
  const cfItem = classifier.classify({
    url: "https://dash.cloudflare.com",
    title: "Cloudflare 控制台"
  });
  console.log(`  ✓ Cloudflare classified: ${cfItem.isEcosystem} -> ${cfItem.ecoName} [${cfItem.subcategoryName}]`);
  assert.strictEqual(cfItem.isEcosystem, true);
  assert.strictEqual(cfItem.ecoId, "cloudflare");

  // Test 12: JD
  const jdItem = classifier.classify({
    url: "https://console.jdcloud.com",
    title: "京东云控制台"
  });
  console.log(`  ✓ JD classified: ${jdItem.isEcosystem} -> ${jdItem.ecoName} [${jdItem.subcategoryName}]`);
  assert.strictEqual(jdItem.isEcosystem, true);
  assert.strictEqual(jdItem.ecoId, "jd");

  // Test 13: GitHub Microsoft Org vs Third-party Repo Isolation
  const msGithub = classifier.classify({
    url: "https://github.com/microsoft/vscode",
    title: "VS Code Official"
  });
  console.log(`  ✓ Microsoft official GitHub classified: ${msGithub.isEcosystem} -> ${msGithub.ecoId}`);
  assert.strictEqual(msGithub.isEcosystem, true);
  assert.strictEqual(msGithub.ecoId, "microsoft");

  const thirdPartyGithub = classifier.classify({
    url: "https://github.com/someone/cool-tool",
    title: "Cool Third Party Tool"
  });
  console.log(`  ✓ Third party GitHub repo isolated: ${thirdPartyGithub.isEcosystem} (Expected false)`);
  assert.strictEqual(thirdPartyGithub.isEcosystem, false);

  // Test 14: Non-ecosystem general website
  const neutralItem = classifier.classify({
    url: "https://stackoverflow.com/questions/12345",
    title: "Stack Overflow Programming Q&A"
  });
  console.log(`  ✓ Neutral website isolated: ${neutralItem.isEcosystem} (Expected false)`);
  assert.strictEqual(neutralItem.isEcosystem, false);

  // --------------------------------------------------------------------------
  // Part 2: UGC Collaborative Docs Isolation & Prevention of Ecosystem Contamination
  // --------------------------------------------------------------------------

  // Test 15: Google Docs Isolation (Must NOT fall into Google Ecosystem)
  const gDoc = classifier.classify({
    url: "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
    title: "Q3 Project Design Doc"
  });
  console.log(`  ✓ Google Docs isolated to UGC: ecoId=${gDoc.ecoId}, isUgcContainer=${gDoc.isUgcContainer}`);
  assert.strictEqual(gDoc.isEcosystem, true);
  assert.strictEqual(gDoc.ecoId, "ugc_docs");
  assert.strictEqual(gDoc.isUgcContainer, true);
  assert.notStrictEqual(gDoc.ecoId, "google");

  // Test 16: Google Sheets Isolation
  const gSheet = classifier.classify({
    url: "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit#gid=0",
    title: "Financial Budget 2026"
  });
  console.log(`  ✓ Google Sheets isolated to UGC: ecoId=${gSheet.ecoId}`);
  assert.strictEqual(gSheet.ecoId, "ugc_docs");
  assert.strictEqual(gSheet.isUgcContainer, true);

  // Test 17: Feishu Docx Isolation (Must NOT fall into ByteDance Ecosystem)
  const feishuDoc = classifier.classify({
    url: "https://feishu.cn/docx/doxcn99999999999999999999",
    title: "团队周报协同文档"
  });
  console.log(`  ✓ Feishu docx isolated to UGC: ecoId=${feishuDoc.ecoId}`);
  assert.strictEqual(feishuDoc.ecoId, "ugc_docs");
  assert.strictEqual(feishuDoc.isUgcContainer, true);
  assert.notStrictEqual(feishuDoc.ecoId, "bytedance");

  // Test 18: Feishu Wiki & Base Isolation
  const feishuWiki = classifier.classify({
    url: "https://myteam.feishu.cn/wiki/wikcn1234567890",
    title: "知识库主页"
  });
  const feishuBase = classifier.classify({
    url: "https://feishu.cn/base/bascn1234567890",
    title: "多维表格数据库"
  });
  console.log(`  ✓ Feishu wiki & base isolated: wiki=${feishuWiki.ecoId}, base=${feishuBase.ecoId}`);
  assert.strictEqual(feishuWiki.ecoId, "ugc_docs");
  assert.strictEqual(feishuBase.ecoId, "ugc_docs");

  // Test 19: Larksuite Global Tenant Docs
  const larkDoc = classifier.classify({
    url: "https://larksuite.com/docx/doxus999888777",
    title: "Global Team Architecture Notes"
  });
  console.log(`  ✓ Larksuite docx isolated: ecoId=${larkDoc.ecoId}`);
  assert.strictEqual(larkDoc.ecoId, "ugc_docs");

  // Test 20: Yuque Docs Isolation (Must NOT fall into Alibaba Ecosystem)
  const yuqueDoc = classifier.classify({
    url: "https://team.yuque.com/org/workspace/note123",
    title: "语雀团队知识库架构"
  });
  console.log(`  ✓ Yuque docs isolated to UGC: ecoId=${yuqueDoc.ecoId}`);
  assert.strictEqual(yuqueDoc.ecoId, "ugc_docs");
  assert.notStrictEqual(yuqueDoc.ecoId, "alibaba");

  // Test 21: QQ Docs Isolation (Must NOT fall into Tencent Ecosystem)
  const qqDoc = classifier.classify({
    url: "https://docs.qq.com/doc/p/abcdef123456",
    title: "腾讯文档在线表单"
  });
  console.log(`  ✓ QQ Docs isolated to UGC: ecoId=${qqDoc.ecoId}`);
  assert.strictEqual(qqDoc.ecoId, "ugc_docs");
  assert.notStrictEqual(qqDoc.ecoId, "tencent");

  // --------------------------------------------------------------------------
  // Part 3: Batch Classification (classifyAll) Without Crashing
  // --------------------------------------------------------------------------
  const ugcMetaRule = {
    id: "ugc_docs",
    name: "协同文档与云端知识库",
    enName: "Docs & Knowledge Base",
    folderName: "📄 协同文档与云端知识库 (Docs & Knowledge Base)",
    icon: "📄",
    color: "#10B981",
    officialDomains: ["docs.google.com", "feishu.cn", "larksuite.com", "yuque.com", "docs.qq.com"],
    subcategories: [
      { id: "docs_portal", name: "在线文档与协同知识库", domainWhitelist: [], isDefault: true }
    ]
  };

  const safeRules = [...ECOSYSTEM_RULES];
  if (!safeRules.some(r => r.id === "ugc_docs")) {
    safeRules.push(ugcMetaRule);
  }

  const safeClassifier = new EcosystemClassifier(safeRules);
  const testBatch = [
    { url: "https://cloud.google.com", title: "Google Cloud" },
    { url: "https://docs.google.com/document/d/123", title: "Google Doc" },
    { url: "https://feishu.cn/docx/456", title: "Feishu Doc" },
    { url: "https://aws.amazon.com", title: "AWS Console" },
    { url: "https://myteam.yuque.com/docs/789", title: "Yuque Doc" },
    { url: "https://news.ycombinator.com", title: "Hacker News" }
  ];

  const batchResult = safeClassifier.classifyAll(testBatch);
  console.log(`  ✓ classifyAll completed safely: ${batchResult.totalEcosystemCount} ecosystem items, ${batchResult.nonEcosystemItems.length} neutral items`);
  assert(batchResult.ecosystemGroups["ugc_docs"] !== undefined, "ugc_docs group must exist");
  assert.strictEqual(batchResult.ecosystemGroups["ugc_docs"].totalCount, 3, "All 3 UGC docs must be categorized under ugc_docs");
  assert.strictEqual(batchResult.ecosystemGroups["google"].totalCount, 1, "Only Google Cloud must be under google group");
  assert.strictEqual(batchResult.nonEcosystemItems.length, 1, "Hacker News must be in nonEcosystemItems");

  // --------------------------------------------------------------------------
  // Part 4: P0-7 URL Normalization & Query/Hash Parameter Preservation
  // --------------------------------------------------------------------------
  console.log("▶ [Test Suite] Part 4: P0-7 URL Normalization & Deduplication Parameter Preservation");

  // Test 22: normalizeUrl preserves query parameters and hashes while normalizing hosts and paths
  const normUrlWithQuery = EcosystemClassifier.normalizeUrl("https://www.google.com/search?q=1#sectionA");
  console.log(`  ✓ URL with query & hash normalized: ${normUrlWithQuery}`);
  assert.strictEqual(normUrlWithQuery, "https://google.com/search?q=1#sectionA", "Must preserve search query and hash");

  const normQ1 = EcosystemClassifier.normalizeUrl("https://a.com?x=1");
  const normQ2 = EcosystemClassifier.normalizeUrl("https://a.com?x=2");
  console.log(`  ✓ Different query params distinguished: "${normQ1}" vs "${normQ2}"`);
  assert.notStrictEqual(normQ1, normQ2, "Distinct query parameters MUST produce distinct normalized URLs");

  const normHash1 = EcosystemClassifier.normalizeUrl("https://site.org/docs#syntax");
  const normHash2 = EcosystemClassifier.normalizeUrl("https://site.org/docs#examples");
  console.log(`  ✓ Different hash fragments distinguished: "${normHash1}" vs "${normHash2}"`);
  assert.notStrictEqual(normHash1, normHash2, "Distinct hash fragments MUST produce distinct normalized URLs");

  // Test trailing slashes and www stripping
  const normTrailingSlash = EcosystemClassifier.normalizeUrl("https://www.example.com/test/");
  const normNoTrailingSlash = EcosystemClassifier.normalizeUrl("https://example.com/test");
  assert.strictEqual(normTrailingSlash, "https://example.com/test");
  assert.strictEqual(normNoTrailingSlash, "https://example.com/test");
  assert.strictEqual(normTrailingSlash, normNoTrailingSlash, "Trailing slash on non-root paths should be normalized");

  const normRoot1 = EcosystemClassifier.normalizeUrl("https://example.com");
  const normRoot2 = EcosystemClassifier.normalizeUrl("https://example.com/");
  assert.strictEqual(normRoot1, "https://example.com/");
  assert.strictEqual(normRoot2, "https://example.com/");
  assert.strictEqual(normRoot1, normRoot2, "Root path should be normalized to /");

  // Test 23: Deduplication in classifyAll / classifyBookmarks preserves distinct query/hash bookmarks
  const dedupeBatch = [
    { id: "bm_p1", url: "https://a.com?x=1", title: "Site A Param 1" },
    { id: "bm_p2", url: "https://a.com?x=2", title: "Site A Param 2" },
    { id: "bm_p1_dup", url: "https://www.a.com?x=1", title: "Site A Param 1 Duplicate" },
    { id: "bm_h1", url: "https://b.org/doc#sec1", title: "Doc Sec 1" },
    { id: "bm_h2", url: "https://b.org/doc#sec2", title: "Doc Sec 2" }
  ];

  const dedupeResult = safeClassifier.classifyBookmarks(dedupeBatch);
  console.log(`  ✓ Deduplication batch result: total neutral items=${dedupeResult.nonEcosystemItems.length}, dedupedCount=${dedupeResult.dedupedCount}`);
  assert.strictEqual(dedupeResult.nonEcosystemItems.length, 4, "Must retain 4 items: ?x=1, ?x=2, #sec1, #sec2 (duplicate ?x=1 removed)");
  const retainedUrls = dedupeResult.nonEcosystemItems.map(it => it.url);
  assert(retainedUrls.includes("https://a.com?x=1"), "https://a.com?x=1 must be retained");
  assert(retainedUrls.includes("https://a.com?x=2"), "https://a.com?x=2 must be retained");
  assert(retainedUrls.includes("https://b.org/doc#sec1"), "https://b.org/doc#sec1 must be retained");
  assert(retainedUrls.includes("https://b.org/doc#sec2"), "https://b.org/doc#sec2 must be retained");

  // --------------------------------------------------------------------------
  // Part 5: P0-5 Non-Giant Domain Bucketing / Orphan Elimination
  // --------------------------------------------------------------------------
  console.log("▶ [Test Suite] Part 5: P0-5 Non-Giant Domain Bucketing / Orphan Elimination");

  const nonEcoBatch = [
    { id: "bm_gh", url: "https://github.com/torvalds/linux", title: "Linux Kernel Source" },
    { id: "bm_so1", url: "https://stackoverflow.com/questions/12345", title: "SO Question 1" },
    { id: "bm_so2", url: "https://stackoverflow.com/tags", title: "SO Tags List" },
    { id: "bm_hn", url: "https://news.ycombinator.com/news", title: "Hacker News Frontpage" },
    { id: "bm_v2", url: "https://www.v2ex.com/t/123456", title: "V2EX Community Topic" }
  ];

  const nonEcoResult = safeClassifier.classifyBookmarks(nonEcoBatch);
  console.log(`  ✓ Non-ecosystem batch classified: total count=${nonEcoResult.totalUncategorizedCount}`);

  // Assert uncategorized dedicated category
  assert(nonEcoResult.uncategorizedGroup !== undefined, "uncategorizedGroup must exist");
  assert.strictEqual(nonEcoResult.uncategorizedGroup.meta.folderName, "📁 未分类 (按主域名建夹)", "Must have dedicated folder name");
  assert.strictEqual(nonEcoResult.totalUncategorizedCount, 5, "All 5 non-ecosystem bookmarks must be counted");

  // Assert domain subcategories
  const subcats = nonEcoResult.uncategorizedGroup.subcategories;
  assert(subcats["github.com"] !== undefined, "github.com subcategory must exist");
  assert.strictEqual(subcats["github.com"].items.length, 1, "github.com must contain 1 item");

  assert(subcats["stackoverflow.com"] !== undefined, "stackoverflow.com subcategory must exist");
  assert.strictEqual(subcats["stackoverflow.com"].items.length, 2, "stackoverflow.com must contain 2 items");

  assert(subcats["ycombinator.com"] !== undefined, "ycombinator.com subcategory must exist");
  assert.strictEqual(subcats["ycombinator.com"].items.length, 1, "ycombinator.com must contain 1 item");

  assert(subcats["v2ex.com"] !== undefined, "v2ex.com subcategory must exist");
  assert.strictEqual(subcats["v2ex.com"].items.length, 1, "v2ex.com must contain 1 item");

  // Assert 0 orphan bookmarks: each item has classification
  for (const item of nonEcoResult.nonEcosystemItems) {
    assert(item.classification !== undefined, "Each item must have classification");
    assert.strictEqual(item.classification.ecoFolderName, "📁 未分类 (按主域名建夹)");
    assert(item.classification.subcategoryId.length > 0, "Subcategory ID must be non-empty");
  }
  console.log("  ✓ 0 orphan bookmarks verified: all non-ecosystem items bucketed into domain subfolders");

  console.log("✅ 16 Titans & UGC Docs EcosystemClassifier tests passed!\n");
}

module.exports = { runClassifierTests };

if (require.main === module) {
  runClassifierTests();
}
