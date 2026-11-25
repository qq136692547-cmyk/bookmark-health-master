// ============================================================================
// Bookmark Health Master (BHM-PRO) 本地 Canvas 诊断战报海报生成器 (HealthCardGenerator)
// 100% 浏览器沙箱 Canvas 2D 离线渲染，零远程上报，生成 1200x630 极客体检卡片
// ============================================================================

class HealthCardGenerator {
  /**
   * 计算极客段位与游戏化称号
   */
  static getGeekRank(stats, lang = "zh") {
    const total = stats.totalBookmarks || 0;
    const dead = stats.deadCount || 0;
    const health = stats.healthScore || 100;
    const techRatio = stats.techRatio || 0;

    const isEn = lang === "en";

    if (total > 0 && (dead / total) >= 0.20) {
      return {
        title: isEn ? "Digital Ruin Archaeologist" : "赛博废墟考古学家",
        badge: "ARCHAEOLOGIST",
        desc: isEn ? "Master of excavating forgotten 404 links and web relics" : "擅长挖掘被遗忘的 404 远古死链与网络遗迹",
        color: "#F43F5E"
      };
    }
    if (total >= 3000) {
      return {
        title: isEn ? "Grandmaster Hoarder" : "松鼠症晚期数字囤积者",
        badge: "HOARDER",
        desc: isEn ? "Legendary hoarder of endless tabs and knowledge repositories" : "坐拥数千未整理链接的资深信息藏书家",
        color: "#F59E0B"
      };
    }
    if (techRatio >= 0.35) {
      return {
        title: isEn ? "Cloud-Native Architect" : "硬核云原生架构师",
        badge: "ARCHITECT",
        desc: isEn ? "High-density cloud infrastructure and code ecosystem clusters" : "高密度云原生开发设施与顶级技术生态聚集者",
        color: "#3B82F6"
      };
    }
    if (health >= 90) {
      return {
        title: isEn ? "Zero-Entropy Guardian" : "零熵增秩序守护者",
        badge: "GUARDIAN",
        desc: isEn ? "Immaculate bookmark hygiene with near-zero broken links" : "极度克制的高自律极客，拥有近乎零死链的整洁书签",
        color: "#10B981"
      };
    }

    return {
      title: isEn ? "Digital Pioneer" : "数字探索先锋",
      badge: "PIONEER",
      desc: isEn ? "Actively structuring and purifying personal browsing universe" : "正在重构与提纯个人数字资产的探索者",
      color: "#8B5CF6"
    };
  }

  /**
   * 渲染 1200x630 高清海报至 Canvas
   */
  static async renderCard(stats = {}, options = {}) {
    const width = 1200;
    const height = 630;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");

    const lang = options.lang || (typeof BHM_I18N !== "undefined" ? BHM_I18N.currentLang : "zh");
    const isEn = lang === "en";
    const rank = HealthCardGenerator.getGeekRank(stats, lang);

    // 1. 深邃赛博暗黑背景
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#080C14");
    bgGradient.addColorStop(0.5, "#0D1321");
    bgGradient.addColorStop(1, "#070B12");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. 科技网格背景
    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. 装饰性光晕
    const glow1 = ctx.createRadialGradient(250, 150, 10, 250, 150, 300);
    glow1.addColorStop(0, "rgba(245, 158, 11, 0.12)");
    glow1.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(950, 450, 10, 950, 450, 300);
    glow2.addColorStop(0, "rgba(59, 130, 246, 0.12)");
    glow2.addColorStop(1, "rgba(59, 130, 246, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // 4. 外层装饰边框
    ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 四角亮色标记
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(18, 18, 16, 4);
    ctx.fillRect(18, 18, 4, 16);
    ctx.fillRect(width - 34, 18, 16, 4);
    ctx.fillRect(width - 22, 18, 4, 16);
    ctx.fillRect(18, height - 22, 16, 4);
    ctx.fillRect(18, height - 34, 4, 16);
    ctx.fillRect(width - 34, height - 22, 16, 4);
    ctx.fillRect(width - 22, height - 34, 4, 16);

    // 5. 顶部 Header
    ctx.font = "bold 13px 'SF Pro Display', -apple-system, monospace";
    ctx.fillStyle = "#F59E0B";
    ctx.fillText("● BHM-PRO v2.1.4 · LOCAL-FIRST DIGITAL ASSET AUDIT REPORT", 50, 60);

    ctx.font = "bold 26px 'SF Pro Display', -apple-system, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(isEn ? "Chrome Bookmarks Health & Architecture Audit" : "Chrome 原生书签资产体检与科技生态重构战报", 50, 96);

    // 6. 左侧：健康评分环 (Circular Health Gauge)
    const centerX = 160;
    const centerY = 240;
    const radius = 80;
    const healthScore = stats.healthScore || 100;

    // 底环
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 14;
    ctx.stroke();

    // 进度弧
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (healthScore / 100));
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    let gaugeColor = "#10B981";
    if (healthScore < 60) gaugeColor = "#F43F5E";
    else if (healthScore < 85) gaugeColor = "#F59E0B";
    ctx.strokeStyle = gaugeColor;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();

    // 中间分数
    ctx.font = "bold 44px 'SF Pro Display', monospace";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(String(healthScore), centerX, centerY + 12);

    ctx.font = "bold 12px 'SF Pro Display', sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(isEn ? "HEALTH SCORE" : "综合健康评分", centerX, centerY + 34);
    ctx.textAlign = "left";

    // 7. 左侧下方：极客称号徽章
    const rankX = 280;
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
    ctx.fillRect(rankX, 160, 420, 150);
    ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
    ctx.strokeRect(rankX, 160, 420, 150);

    // 徽章药丸
    ctx.fillStyle = rank.color;
    ctx.fillRect(rankX + 20, 180, 8, 22);

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = rank.color;
    ctx.fillText(`GEEK RANK: ${rank.badge}`, rankX + 36, 195);

    ctx.font = "bold 22px 'SF Pro Display', -apple-system, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(rank.title, rankX + 20, 235);

    ctx.font = "13px 'SF Pro Display', -apple-system, sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(rank.desc, rankX + 20, 265);

    // 8. 右侧：四大核心数据战绩卡片
    const cards = [
      {
        icon: "📚",
        val: stats.totalBookmarks || 0,
        label: isEn ? "Total Scanned Nodes" : "扫描书签总数",
        sub: isEn ? "Pure local parse" : "100% 本地极速解析"
      },
      {
        icon: "🪦",
        val: stats.deadCount || 0,
        label: isEn ? "404 Dead Link Graves" : "失效死链墓碑 (404/停用)",
        sub: isEn ? "Anti-Cloudflare DoH verified" : "双阶段 DoH 交叉确诊"
      },
      {
        icon: "🌐",
        val: stats.ecoCount || 0,
        label: isEn ? "Tech Titans Ecosystems" : "大厂生态聚合节点",
        sub: isEn ? "16 Titans Auto-clustered" : "16大科技巨头物理归拢"
      },
      {
        icon: "🛡️",
        val: stats.collabDocsCount || 0,
        label: isEn ? "Shielded Collab Docs" : "安全隔离协同文档",
        sub: isEn ? "Figma / Feishu / Docs" : "防误删沙箱白名单保护"
      }
    ];

    const gridStartX = 730;
    const gridStartY = 160;
    const cardW = 210;
    const cardH = 95;
    const gap = 16;

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = gridStartX + col * (cardW + gap);
      const cy = gridStartY + row * (cardH + gap);

      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = "rgba(51, 65, 85, 0.7)";
      ctx.strokeRect(cx, cy, cardW, cardH);

      ctx.font = "18px 'SF Pro Display', sans-serif";
      ctx.fillText(c.icon, cx + 14, cy + 30);

      ctx.font = "bold 22px monospace";
      ctx.fillStyle = "#F8FAFC";
      ctx.fillText(String(c.val), cx + 46, cy + 32);

      ctx.font = "bold 11px 'SF Pro Display', sans-serif";
      ctx.fillStyle = "#CBD5E1";
      ctx.fillText(c.label, cx + 14, cy + 60);

      ctx.font = "10px 'SF Pro Display', sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.fillText(c.sub, cx + 14, cy + 78);
    });

    // 9. 中下方横幅：时间与痛点折算 (Pain & Time Calculation)
    const deadLinks = stats.deadCount || 0;
    const dupCount = stats.dupCount || 0;
    const clusterCount = stats.ecoCount || 0;
    const savedMins = Math.ceil((deadLinks * 12 + dupCount * 8 + clusterCount * 15) / 60) || 15;

    ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
    ctx.fillRect(50, 390, width - 100, 75);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
    ctx.strokeRect(50, 390, width - 100, 75);

    ctx.font = "bold 14px 'SF Pro Display', sans-serif";
    ctx.fillStyle = "#FBBF24";
    ctx.fillText(
      isEn
        ? `⏱️ Estimated Developer Time Saved: ~${savedMins} Minutes with 1-Click Atomic Rollback Protection`
        : `⏱️ 预计节省开发耗时: 约 ${savedMins} 分钟 · 支持时光机原子级无损原位回滚保护`,
      70, 422
    );

    ctx.font = "12px 'SF Pro Display', sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(
      isEn
        ? "All scans, diagnoses, and snapshots performed strictly inside browser sandbox with zero telemetry."
        : "所有死链探测、生态聚类与快照构建均在本地浏览器沙箱独立完成，绝不向任何云端上传个人私人生态数据。",
      70, 448
    );

    // 10. 底部 Footer：安全背书与防伪验真
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.fillRect(20, height - 70, width - 40, 50);

    ctx.font = "11px monospace";
    ctx.fillStyle = "#10B981";
    ctx.fillText("🔒 ZERO-TELEMETRY CERTIFIED", 50, height - 40);

    ctx.fillStyle = "#64748B";
    ctx.fillText("·", 230, height - 40);

    ctx.fillStyle = "#94A3B8";
    ctx.fillText("Chrome Web Store Extension ID: nomieaphhhhhikklfhmhhjcdgicaikgn", 245, height - 40);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#38BDF8";
    ctx.textAlign = "right";
    ctx.fillText("https://bhm-pro-ern.pages.dev/", width - 50, height - 40);
    ctx.textAlign = "left";

    return canvas;
  }

  /**
   * 触发下载并本地解锁 50 条试用额度
   */
  static async exportAndUnlockTrial(stats = {}, filename = "BHM-PRO-Health-Report.png") {
    const canvas = await HealthCardGenerator.renderCard(stats);
    const dataUrl = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 本地写入微激励配额 (Honor-System Local Unlock)
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.set({
          bhm_viral_trial_redeemed: true,
          bhm_viral_bonus_quota: 50
        }, resolve);
      });
    }

    return { success: true, bonusGranted: 50 };
  }
}

// 导出全局命名空间
if (typeof window !== "undefined") {
  window.HealthCardGenerator = HealthCardGenerator;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = HealthCardGenerator;
}
