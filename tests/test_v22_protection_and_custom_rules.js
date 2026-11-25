// tests/test_v22_protection_and_custom_rules.js - v2.2.0 Protected Folders, Reorg Scope & Custom Rules E2E Suite
const assert = require("node:assert");
const { EcosystemClassifier } = require("../bookmark-organizer/core/classifier.js");
const { BookmarkProber } = require("../bookmark-organizer/core/prober.js");
const { SafetyManager } = require("../bookmark-organizer/core/safety.js");
const { MockChrome } = require("./helpers/mock_chrome.js");
const {
  extractUserFoldersFromTree,
  collectProtectedSubtreeIds,
  filterBookmarksForReorganize,
  loadActiveBookmarksFromChrome,
  reorganizeBookmarksInChrome
} = require("../bookmark-organizer/dashboard.js");

async function main() {
  console.log("========================================================================");
  console.log("▶ [SUITE-20] v2.2.0 Protected Folders, Reorg Scope & Custom Rules E2E");
  console.log("========================================================================");

  // Build realistic bookmark tree containing user's 「自建网站」 folder + nested subfolder + loose root bookmarks
  const mockTree = [
    {
      id: "0",
      title: "Root",
      children: [
        {
          id: "1",
          parentId: "0",
          index: 0,
          title: "Bookmarks Bar",
          children: [
            { id: "bm_loose_cf", parentId: "1", index: 0, title: "Cloudflare Dashboard", url: "https://dash.cloudflare.com" },
            { id: "bm_loose_self", parentId: "1", index: 1, title: "GeoScore Live", url: "https://geoscore.help/pricing" },
            { id: "bm_loose_pages", parentId: "1", index: 2, title: "BHM Landing Pages", url: "https://bhm-pro-ern.pages.dev/" },
            { id: "bm_loose_random", parentId: "1", index: 3, title: "Random Indie Blog", url: "https://indieblog.example.org/post-1" },
            {
              id: "folder_selfhosted",
              parentId: "1",
              index: 4,
              title: "自建网站",
              children: [
                { id: "bm_self_1", parentId: "folder_selfhosted", index: 0, title: "我的主页", url: "https://my-own-site.io" },
                { id: "bm_self_cf", parentId: "folder_selfhosted", index: 1, title: "自建站 DNS", url: "https://dash.cloudflare.com/dns" },
                {
                  id: "folder_selfhosted_sub",
                  parentId: "folder_selfhosted",
                  index: 2,
                  title: "后台管理",
                  children: [
                    { id: "bm_self_sub_1", parentId: "folder_selfhosted_sub", index: 0, title: "管理员面板", url: "https://admin.my-own-site.io" }
                  ]
                }
              ]
            },
            {
              id: "folder_other_work",
              parentId: "1",
              index: 5,
              title: "临时收集",
              children: [
                { id: "bm_work_gcp", parentId: "folder_other_work", index: 0, title: "GCP Console", url: "https://cloud.google.com/console" }
              ]
            }
          ]
        },
        {
          id: "2",
          parentId: "0",
          index: 1,
          title: "Other Bookmarks",
          children: []
        }
      ]
    }
  ];

  const mockChrome = new MockChrome(mockTree);
  mockChrome.installGlobal();
  try {
    const { tree, bookmarks } = await loadActiveBookmarksFromChrome();
    assert.strictEqual(bookmarks.length, 8, "Should load all 8 active bookmarks");

    // 1. User folder extraction (excludes Chrome roots)
    const userFolders = extractUserFoldersFromTree(tree, {});
    const folderIds = userFolders.map((f) => f.id);
    assert(folderIds.includes("folder_selfhosted"), "Must detect 「自建网站」 folder");
    assert(folderIds.includes("folder_selfhosted_sub"), "Must detect nested subfolder 「自建网站 / 后台管理」");
    const selfFolderMeta = userFolders.find((f) => f.id === "folder_selfhosted");
    assert.strictEqual(selfFolderMeta.count, 3, "「自建网站」 count must include nested bookmark (3 total)");
    console.log("  ✓ Test 1: extractUserFoldersFromTree detects user folders & nested counts cleanly");

    // 2. Scope = loose_only (Default Safe Mode) keeps ALL user folders 100% untouched
    const looseRes = filterBookmarksForReorganize(bookmarks, tree, { scope: "loose_only", protectedFolderIds: [] });
    assert.strictEqual(looseRes.eligibleBookmarks.length, 4, "loose_only must only target the 4 root bookmarks");
    assert.strictEqual(looseRes.protectedCount, 4, "loose_only must protect all 4 bookmarks inside user folders");
    assert(!looseRes.eligibleBookmarks.some((b) => b.id === "bm_self_1" || b.id === "bm_self_sub_1" || b.id === "bm_work_gcp"));
    console.log("  ✓ Test 2: loose_only default scope preserves 100% of user folders (0拆散)");

    // 3. Protected Folder Whitelist recursively locks 「自建网站」 + nested 「后台管理」 even in full_library mode
    const expandedProtected = collectProtectedSubtreeIds(tree, ["folder_selfhosted"]);
    assert(expandedProtected.has("folder_selfhosted") && expandedProtected.has("folder_selfhosted_sub"));
    const fullProtectedRes = filterBookmarksForReorganize(bookmarks, tree, {
      scope: "full_library",
      protectedFolderIds: ["folder_selfhosted"]
    });
    assert.strictEqual(fullProtectedRes.protectedCount, 3, "Locking 「自建网站」 must recursively protect all 3 bookmarks inside it");
    assert.strictEqual(fullProtectedRes.eligibleBookmarks.length, 5, "Remaining 5 bookmarks are eligible");
    assert(!fullProtectedRes.eligibleBookmarks.some((b) => b.id === "bm_self_1" || b.id === "bm_self_cf" || b.id === "bm_self_sub_1"));
    assert(fullProtectedRes.eligibleBookmarks.some((b) => b.id === "bm_work_gcp"), "Unlocked folder bookmarks remain eligible in full_library mode");
    console.log("  ✓ Test 3: Protected folder whitelist recursively shields parent + nested child folders in full_library mode");

    // 4. Custom Rules highest priority (beats Cloudflare pages.dev AND beats Uncategorized!) + path prefix support
    const customRules = [
      { id: "r_self", folderName: "自建网站", icon: "🚀", domains: ["geoscore.help", "*.pages.dev", "github.com/myorg"] }
    ];
    const classifier = new EcosystemClassifier(null, { lang: "zh", userCustomRules: customRules });
    const cPages = classifier.classify({ url: "https://bhm-pro-ern.pages.dev/", title: "BHM Landing" });
    assert.strictEqual(cPages.isCustomRule, true, "Custom *.pages.dev rule MUST override built-in Cloudflare pages.dev rule");
    assert.strictEqual(cPages.ecoFolderName, "自建网站");

    const cGeo = classifier.classify({ url: "https://geoscore.help/pricing", title: "GeoScore" });
    assert.strictEqual(cGeo.isCustomRule, true);
    assert.strictEqual(cGeo.ecoFolderName, "自建网站");

    const cPath = classifier.classify({ url: "https://github.com/myorg/repo", title: "My Repo" });
    assert.strictEqual(cPath.isCustomRule, true, "Custom domain/path rule must match");
    const cOtherGh = classifier.classify({ url: "https://github.com/other/repo", title: "Other Repo" });
    assert.strictEqual(cOtherGh.isCustomRule, undefined, "Non-matching GitHub path must not match custom rule");
    // Verify sanitizeCustomRules strips ?query/#hash/:port and rejects bare wildcards
    const cleanedRules = EcosystemClassifier.sanitizeCustomRules([
      { id: "r_url", folderName: "自建网站", domains: "https://bhm.geoscore.help:8443/app/?ref=1#top, *, *., *.pages.dev" }
    ]);
    assert.deepStrictEqual(cleanedRules[0].domains, ["bhm.geoscore.help/app", "*.pages.dev"], "Must strip query/hash/port and reject bare wildcards");

    console.log("  ✓ Test 4: Custom rules override built-in 16 Titans (*.pages.dev), sanitize URLs & support domain/path prefixes");

    // 5. Physical Chrome reorganization:
    //    - Scope = loose_only + includeUncategorized = false + Custom Rule 「自建网站」
    //    - Must reuse EXISTING 「自建网站」 folder (id=folder_selfhosted) instead of creating duplicate!
    //    - Must NOT move random indie blog into Uncategorized!
    //    - Must NOT touch any bookmark already inside 「自建网站」 or 「临时收集」!
    //    - Atomic Move Journal rollback restores 100% original positions!
    const sm = new SafetyManager();
    const looseClassified = classifier.classifyAll(looseRes.eligibleBookmarks);
    assert.strictEqual(looseClassified.totalCustomCount, 2, "2 loose bookmarks should match custom 「自建网站」 rule");

    const reorgResult = await reorganizeBookmarksInChrome(looseClassified, {
      safetyManagerInstance: sm,
      SafetyManagerClass: SafetyManager,
      EcosystemClassifierClass: EcosystemClassifier,
      throttleMs: 0,
      includeUncategorized: false
    });
    assert.strictEqual(reorgResult.failedCount, 0);
    assert.strictEqual(reorgResult.movedCount, 3, "Only 2 custom + 1 Cloudflare loose bookmark should move (random indie blog stays put!)");

    // Verify bm_loose_self & bm_loose_pages moved into EXISTING folder_selfhosted (no duplicate 「自建网站」 folder!)
    const barChildren = await new Promise((r) => chrome.bookmarks.getChildren("1", r));
    const selfFolders = barChildren.filter((c) => !c.url && c.title === "自建网站");
    assert.strictEqual(selfFolders.length, 1, "Must reuse existing 「自建网站」 folder without creating duplicates");
    assert.strictEqual(selfFolders[0].id, "folder_selfhosted");

    const selfChildren = await new Promise((r) => chrome.bookmarks.getChildren("folder_selfhosted", r));
    const selfChildIds = selfChildren.map((c) => c.id);
    assert(selfChildIds.includes("bm_self_1") && selfChildIds.includes("bm_self_cf"), "Original bookmarks in 「自建网站」 stay untouched");
    assert(selfChildIds.includes("bm_loose_self") && selfChildIds.includes("bm_loose_pages"), "Scattered self-hosted links routed directly into 「自建网站」");

    // Verify random loose bookmark stayed in root ("1") and NO Uncategorized folder was created!
    assert(barChildren.some((c) => c.id === "bm_loose_random"), "Unmatched bookmark must stay in root when includeUncategorized=false");
    assert(!barChildren.some((c) => !c.url && c.title.includes("未分类")), "Must NOT create Uncategorized folder when includeUncategorized=false");

    // Verify atomic rollback puts the 3 moved bookmarks back to Bookmarks Bar root
    const journals = await sm.getJournals();
    assert.strictEqual(journals.length, 1);
    const rb = await sm.rollbackJournal(journals[0].id, null, 0);
    assert.strictEqual(rb.success, true);
    assert.strictEqual(rb.count, 3);
    const afterBar = await new Promise((r) => chrome.bookmarks.getChildren("1", r));
    assert(afterBar.some((c) => c.id === "bm_loose_self") && afterBar.some((c) => c.id === "bm_loose_pages"));
    console.log("  ✓ Test 5: Reuses existing 「自建网站」 folder, keeps unmatched in place, skips user folders, atomic rollback 100%");

    // 6. P2 polish check: IPv6 unspecified address :: is shielded by BookmarkProber.isIntranetUrl
    assert.strictEqual(BookmarkProber.isIntranetUrl("http://[::]/"), true, "IPv6 unspecified :: must be shielded as intranet");
    console.log("  ✓ Test 6: IPv6 unspecified address http://[::]/ shielded as intranet");
  } finally {
    mockChrome.uninstallGlobal();
  }

  console.log("========================================================================");
  console.log("🎉 ALL v2.2.0 PROTECTION, SCOPE & CUSTOM RULES TESTS PASSED (6/6)!");
  console.log("========================================================================");
}

main().catch((err) => {
  console.error("❌ v2.2.0 Test Suite Failed:", err);
  process.exit(1);
});
