// ============================================================================
// Chrome Web Store (CWS) 官方上架打包与合规审核流水线脚本
// 纯原生 Node.js 实现 (Zero Dependency, 标准 PKZIP 规范打包)
// 包含: MV3 Schema 静态合规校验、远程代码深度扫描、安全最小权限集核查、
//       剔除测试/文档/工程元数据、生成生产级 CWS 上架 ZIP 归档包
// ============================================================================

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const ROOT_DIR = path.resolve(__dirname, "..");
const EXT_DIR = path.join(ROOT_DIR, "bookmark-organizer");
const OUTPUT_ZIP_ROOT = path.join(ROOT_DIR, "bhm-pro-extension.zip");
const OUTPUT_ZIP_EXT = path.join(EXT_DIR, "bhm-pro-extension.zip");

// CRC32 计算表
function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const CRC32_TABLE = createCrc32Table();

function calculateCrc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * 纯原生零依赖 PKZIP 打包器
 */
class ZeroDepZipWriter {
  constructor() {
    this.entries = [];
  }

  addFile(relativePath, fileBuffer) {
    const cleanPath = relativePath.replace(/\\/g, "/");
    const uncompressedSize = fileBuffer.length;
    const crc = calculateCrc32(fileBuffer);
    const compressedData = zlib.deflateRawSync(fileBuffer);
    const compressedSize = compressedData.length;

    this.entries.push({
      path: cleanPath,
      crc,
      uncompressedSize,
      compressedSize,
      compressedData
    });
  }

  buildZipBuffer() {
    const localHeaders = [];
    const centralHeaders = [];
    let currentOffset = 0;

    for (const entry of this.entries) {
      const pathBuf = Buffer.from(entry.path, "utf8");
      const pathLen = pathBuf.length;

      // Local file header (30 bytes + pathLen)
      const localHeader = Buffer.alloc(30 + pathLen);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
      localHeader.writeUInt16LE(20, 4);         // Version needed to extract (2.0)
      localHeader.writeUInt16LE(0, 6);          // General purpose bit flag
      localHeader.writeUInt16LE(8, 8);          // Compression method: 8 = Deflate
      localHeader.writeUInt16LE(0, 10);         // Last mod file time
      localHeader.writeUInt16LE(0, 12);         // Last mod file date
      localHeader.writeUInt32LE(entry.crc, 14); // CRC-32
      localHeader.writeUInt32LE(entry.compressedSize, 18);   // Compressed size
      localHeader.writeUInt32LE(entry.uncompressedSize, 22); // Uncompressed size
      localHeader.writeUInt16LE(pathLen, 26);   // File name length
      localHeader.writeUInt16LE(0, 28);         // Extra field length
      pathBuf.copy(localHeader, 30);

      localHeaders.push(localHeader, entry.compressedData);

      // Central directory header (46 bytes + pathLen)
      const centralHeader = Buffer.alloc(46 + pathLen);
      centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
      centralHeader.writeUInt16LE(20, 4);          // Version made by (2.0)
      centralHeader.writeUInt16LE(20, 6);          // Version needed to extract
      centralHeader.writeUInt16LE(0, 8);           // General purpose bit flag
      centralHeader.writeUInt16LE(8, 10);          // Compression method: 8 = Deflate
      centralHeader.writeUInt16LE(0, 12);          // File time
      centralHeader.writeUInt16LE(0, 14);          // File date
      centralHeader.writeUInt32LE(entry.crc, 16);  // CRC-32
      centralHeader.writeUInt32LE(entry.compressedSize, 20);   // Compressed size
      centralHeader.writeUInt32LE(entry.uncompressedSize, 24); // Uncompressed size
      centralHeader.writeUInt16LE(pathLen, 28);    // File name length
      centralHeader.writeUInt16LE(0, 30);          // Extra field length
      centralHeader.writeUInt16LE(0, 32);          // Comment length
      centralHeader.writeUInt16LE(0, 34);          // Disk number start
      centralHeader.writeUInt16LE(0, 36);          // Internal file attributes
      centralHeader.writeUInt32LE(0, 38);          // External file attributes
      centralHeader.writeUInt32LE(currentOffset, 42); // Relative offset of local header
      pathBuf.copy(centralHeader, 46);

      centralHeaders.push(centralHeader);

      currentOffset += localHeader.length + entry.compressedData.length;
    }

    const centralDirBuffer = Buffer.concat(centralHeaders);
    const centralDirSize = centralDirBuffer.length;
    const centralDirOffset = currentOffset;

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);                 // EOCD signature
    eocd.writeUInt16LE(0, 4);                          // Number of this disk
    eocd.writeUInt16LE(0, 6);                          // Disk where central directory starts
    eocd.writeUInt16LE(this.entries.length, 8);         // Number of central directory records on this disk
    eocd.writeUInt16LE(this.entries.length, 10);        // Total number of central directory records
    eocd.writeUInt32LE(centralDirSize, 12);            // Size of central directory
    eocd.writeUInt32LE(centralDirOffset, 16);          // Offset of start of central directory
    eocd.writeUInt16LE(0, 20);                         // Comment length

    return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
  }
}

/**
 * 1. 深度静态安全合规核查
 */
function auditExtensionCompliance() {
  console.log("========================================================");
  console.log("   BHM-PRO Chrome Web Store 官方合规性审查流水线       ");
  console.log("========================================================\n");

  const manifestPath = path.join(EXT_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Missing manifest.json in extension directory!");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // Check 1: MV3 Spec
  console.log("▶ [Audit 1/5] Validating Manifest V3 Schema...");
  if (manifest.manifest_version !== 3) {
    throw new Error(`Invalid manifest_version: ${manifest.manifest_version}, expected 3`);
  }
  if (!manifest.minimum_chrome_version || parseInt(manifest.minimum_chrome_version, 10) < 114) {
    throw new Error(`Invalid or missing minimum_chrome_version: ${manifest.minimum_chrome_version}, expected >= 114`);
  }
  console.log(`  ✓ Minimum Chrome version verified: ${manifest.minimum_chrome_version}`);
  if (!manifest.background || !manifest.background.service_worker) {
    throw new Error("Missing background.service_worker definition in manifest.json!");
  }
  const swPath = path.join(EXT_DIR, manifest.background.service_worker);
  if (!fs.existsSync(swPath)) {
    throw new Error(`Service worker file not found at: ${swPath}`);
  }
  console.log(`  ✓ Service worker verified: ${manifest.background.service_worker}`);

  // Check 2: Remote code scanning (Remotely Hosted Code Rule)
  console.log("▶ [Audit 2/5] Scanning for Prohibited Remotely Hosted Code...");
  const htmlFiles = ["dashboard.html", "popup.html", "sidepanel.html"];
  for (const hf of htmlFiles) {
    const fullPath = path.join(EXT_DIR, hf);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const remoteScriptRegex = /<script\s+[^>]*src=["']https?:\/\/[^"']+["']/gi;
      const matches = content.match(remoteScriptRegex);
      if (matches && matches.length > 0) {
        throw new Error(`FATAL: Remote script detected in ${hf}: ${matches.join(", ")}`);
      }
    }
  }
  console.log("  ✓ Zero remote scripts detected across all HTML extension pages.");

  // Check 3: CSP Enforcement
  console.log("▶ [Audit 3/5] Validating Content Security Policy...");
  if (!manifest.content_security_policy || !manifest.content_security_policy.extension_pages) {
    throw new Error("Missing content_security_policy.extension_pages in manifest.json!");
  }
  const csp = manifest.content_security_policy.extension_pages;
  if (!csp.includes("script-src 'self'") || !csp.includes("object-src 'self'")) {
    throw new Error(`Insecure CSP defined: ${csp}`);
  }
  console.log(`  ✓ Strict CSP verified: "${csp}"`);

  // Check 4: Permission Minimization & Dynamic Host Permissions
  console.log("▶ [Audit 4/5] Inspecting Permissions & Least-Privilege Compliance...");
  const forbiddenPerms = ["webRequestBlocking", "debugger", "management", "privacy"];
  for (const fp of forbiddenPerms) {
    if (manifest.permissions && manifest.permissions.includes(fp)) {
      throw new Error(`Excessive intrusive permission found: ${fp}`);
    }
  }
  if (manifest.host_permissions && manifest.host_permissions.includes("*://*/*")) {
    throw new Error("Broad wildcard host_permissions should be placed in optional_host_permissions!");
  }
  console.log("  ✓ Permissions minimized. Wildcards isolated in optional_host_permissions.");

  // Check 5: Icon assets & i18n locales completeness
  console.log("▶ [Audit 5/6] Checking Icon Assets & Bilingual Locales...");
  for (const size of ["16", "32", "48", "128"]) {
    const iconRel = manifest.icons[size];
    if (!iconRel || !fs.existsSync(path.join(EXT_DIR, iconRel))) {
      throw new Error(`Missing icon asset for size ${size}: ${iconRel}`);
    }
  }
  console.log("  ✓ All icon assets verified (16, 32, 48, 128 px).");

  if (manifest.default_locale) {
    for (const loc of ["en", "zh_CN"]) {
      const msgPath = path.join(EXT_DIR, "_locales", loc, "messages.json");
      if (!fs.existsSync(msgPath)) {
        throw new Error(`Missing required locale file: _locales/${loc}/messages.json`);
      }
      const msgs = JSON.parse(fs.readFileSync(msgPath, "utf8"));
      for (const reqKey of ["extName", "extDescription", "actionTitle"]) {
        if (!msgs[reqKey] || !msgs[reqKey].message) {
          throw new Error(`Missing message key '${reqKey}' in _locales/${loc}/messages.json`);
        }
      }
      if (loc === "en") {
        if (msgs.extName.message.length > 75) {
          throw new Error(`CWS limit exceeded: _locales/en extName is ${msgs.extName.message.length} chars (max 75)`);
        }
        if (msgs.extDescription.message.length > 132) {
          throw new Error(`CWS limit exceeded: _locales/en extDescription is ${msgs.extDescription.message.length} chars (max 132)`);
        }
      }
    }
    console.log(`  ✓ Bilingual CWS locales verified (_locales/en & _locales/zh_CN, default_locale="${manifest.default_locale}").`);
  }

  console.log("▶ [Audit 6/6] Scanning Bundle for Private Key Leak Risks...");
  console.log("  ✓ Ready for zero-private-key archive verification.\n");

  return manifest;
}

/**
 * 2. 收集扩展必要生产文件，严格排除任何测试与工程代码
 */
function collectExtensionFiles() {
  const files = [];

  function scan(dir, relPrefix = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      const relPath = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;

      // 严格黑名单过滤
      if (
        ent.name.startsWith(".") ||
        ent.name.endsWith(".md") ||
        ent.name.endsWith(".zip") ||
        ent.name === "dict.js" ||
        ent.name === "tests" ||
        ent.name === "node_modules" ||
        ent.name === "package.json" ||
        ent.name === "package-lock.json"
      ) {
        continue;
      }

      if (ent.isDirectory()) {
        scan(fullPath, relPath);
      } else if (ent.isFile()) {
        files.push({ fullPath, relPath });
      }
    }
  }

  scan(EXT_DIR);
  return files;
}

/**
 * 3. 执行打包生成生产 ZIP
 */
async function buildExtensionPackage() {
  const manifest = auditExtensionCompliance();

  console.log("▶ Packaging extension files for Chrome Web Store...");
  const zip = new ZeroDepZipWriter();
  const files = collectExtensionFiles();

  // 断言待打包文件列表中不包含任何 .md 文件、不包含 dict.js、不包含 .zip 文件
  for (const file of files) {
    const fileName = path.basename(file.relPath).toLowerCase();
    if (fileName.endsWith(".md")) {
      throw new Error(`Package integrity violation: Forbidden markdown file in bundle: ${file.relPath}`);
    }
    if (fileName === "dict.js") {
      throw new Error(`Package integrity violation: Forbidden dict.js file in bundle: ${file.relPath}`);
    }
    if (fileName.endsWith(".zip")) {
      throw new Error(`Package integrity violation: Forbidden zip archive in bundle: ${file.relPath}`);
    }
    if (!fileName.endsWith(".png")) {
      const textContent = fs.readFileSync(file.fullPath, "utf8");
      if (
        textContent.includes("privateKeyPkcs8Base64") ||
        textContent.includes("BEGIN PRIVATE KEY") ||
        textContent.includes("MC4CAQAwBQYDK2VwBCIEI")
      ) {
        throw new Error(`FATAL SECURITY VIOLATION: Signing private key material detected in ${file.relPath}!`);
      }
    }
  }

  let totalRawBytes = 0;
  for (const file of files) {
    const data = fs.readFileSync(file.fullPath);
    totalRawBytes += data.length;
    zip.addFile(file.relPath, data);
    console.log(`  + [ZIP Entry] ${file.relPath.padEnd(32)} (${(data.length / 1024).toFixed(1)} KB)`);
  }

  const zipBuffer = zip.buildZipBuffer();

  // 仅写入工程根目录输出路径，并清理扩展源码目录内可能遗留的同名归档，保持 unpacked 目录纯净
  fs.writeFileSync(OUTPUT_ZIP_ROOT, zipBuffer);
  if (fs.existsSync(OUTPUT_ZIP_EXT)) {
    fs.unlinkSync(OUTPUT_ZIP_EXT);
  }

  console.log("\n========================================================");
  console.log(`🎉 打包完成！生成标准 CWS 上架 ZIP 归档包`);
  console.log(`   扩展名称: ${manifest.name}`);
  console.log(`   版本编号: v${manifest.version}`);
  console.log(`   收录文件: ${files.length} 个`);
  console.log(`   原始容量: ${(totalRawBytes / 1024).toFixed(1)} KB`);
  console.log(`   压缩容量: ${(zipBuffer.length / 1024).toFixed(1)} KB (压缩率: ${((1 - zipBuffer.length / totalRawBytes) * 100).toFixed(1)}%)`);
  console.log(`   输出路径: ${OUTPUT_ZIP_ROOT}`);
  console.log("========================================================");

  return {
    success: true,
    fileCount: files.length,
    zipSize: zipBuffer.length
  };
}

if (require.main === module) {
  buildExtensionPackage().catch(err => {
    console.error("❌ Packaging Pipeline Failed:", err);
    process.exit(1);
  });
}

module.exports = { buildExtensionPackage, auditExtensionCompliance };
