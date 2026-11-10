// ============================================================================
// 16 大全球与中国科技巨头官方全生态权威分类图谱与规则库 (16 Titans Ecosystem Registry)
// ============================================================================

const ECOSYSTEM_RULES = [
  // 1. 谷歌官方全生态
  {
    id: "google",
    name: "谷歌官方全生态",
    enName: "Google Ecosystem",
    folderName: "🌐 谷歌官方全生态 (Google Ecosystem)",
    icon: "🌐",
    color: "#4285F4",
    officialDomains: [
      "google.com",
      "google.cn",
      "google.com.hk",
      "google.co.jp",
      "google.co.uk",
      "youtube.com",
      "youtu.be",
      "gmail.com",
      "blogger.com",
      "deepmind.google",
      "withgoogle.com",
      "android.com",
      "googleusercontent.com"
    ],
    subcategories: [
      {
        id: "core_portals",
        name: "核心门户与入口",
        enName: "Core Portals & Search",
        domainWhitelist: ["google.com", "google.com.hk", "google.cn", "translate.google.com", "translate.google.cn"],
        titleRegex: /(搜索|主页|翻译|webhp)/i,
        isDefault: true
      },
      {
        id: "workspace",
        name: "Google Workspace 效率办公",
        enName: "Google Workspace & Productivity",
        domainWhitelist: ["drive.google.com", "docs.google.com", "sheets.google.com", "slides.google.com", "mail.google.com", "calendar.google.com", "meet.google.com", "keep.google.com"],
        titleRegex: /(drive|云端硬盘|docs|文档|sheets|表格|slides|幻灯片|gmail|邮箱|vids|视频生成)/i
      },
      {
        id: "ai_research",
        name: "Google AI & 前沿研究",
        enName: "Google AI & Frontier Research",
        domainWhitelist: ["gemini.google.com", "aistudio.google.com", "notebooklm.google.com", "deepmind.google", "colab.research.google.com", "flow.google.com", "stitch.withgoogle.com"],
        titleRegex: /(gemini|ai studio|notebooklm|deepmind|colab|flow|stitch|antigravity)/i
      },
      {
        id: "dev_cloud",
        name: "开发者、云平台与技术生态",
        enName: "Developers, Cloud & Platform",
        domainWhitelist: ["cloud.google.com", "console.cloud.google.com", "developers.google.com", "firebase.google.com", "adsense.google.com", "search.google.com"],
        titleRegex: /(cloud|gcp|开发者|adsense|search console|站长|firebase|apis|console)/i
      },
      {
        id: "content_hardware",
        name: "内容生态与应用商店",
        enName: "Content & Web Store",
        domainWhitelist: ["youtube.com", "play.google.com", "chrome.google.com", "chromewebstore.google.com", "blogger.com"],
        titleRegex: /(youtube|油管|play|应用市场|webstore|网上应用店|blogger)/i
      }
    ]
  },

  // 2. 华为官方全生态
  {
    id: "huawei",
    name: "华为官方全生态",
    enName: "Huawei Ecosystem",
    folderName: "🔴 华为官方全生态 (Huawei Ecosystem)",
    icon: "🔴",
    color: "#CF0A2C",
    officialDomains: [
      "huawei.com",
      "huaweicloud.com",
      "harmonyos.com",
      "vmall.com",
      "petalmaps.com"
    ],
    subcategories: [
      {
        id: "consumer_portals",
        name: "官方门户与消费者业务",
        enName: "Official Portal & Consumer",
        domainWhitelist: ["huawei.com", "consumer.huawei.com", "vmall.com", "appgallery.huawei.com"],
        titleRegex: /(官网|商城|vmall|消费者|appgallery|应用市场)/i,
        isDefault: true
      },
      {
        id: "cloud_enterprise",
        name: "华为云与企业数字化",
        enName: "Huawei Cloud & Enterprise",
        domainWhitelist: ["huaweicloud.com", "activity.huaweicloud.com", "console.huaweicloud.com", "beian.huaweicloud.com"],
        titleRegex: /(华为云|云服务器|828|icp备案|开发者空间|企业上云)/i
      },
      {
        id: "harmonyos",
        name: "鸿蒙生态 HarmonyOS",
        enName: "HarmonyOS Developer Ecosystem",
        domainWhitelist: ["harmonyos.com", "developer.huawei.com"],
        titleRegex: /(harmony|鸿蒙|deveco|开发者联盟|第一课|模拟训练|人才认证|开发者学堂)/i
      },
      {
        id: "ai_chip",
        name: "全栈 AI 与底层芯片架构",
        enName: "Full-Stack AI & Chip Architecture",
        domainWhitelist: ["ascend.huawei.com", "mindspore.cn", "modelarts.huaweicloud.com"],
        titleRegex: /(昇腾|ascend|昇思|mindspore|modelarts|芯片|大模型)/i
      }
    ]
  },

  // 3. 微软官方全生态
  {
    id: "microsoft",
    name: "微软官方全生态",
    enName: "Microsoft Ecosystem",
    folderName: "🪟 微软官方全生态 (Microsoft Ecosystem)",
    icon: "🪟",
    color: "#00A4EF",
    officialDomains: [
      "microsoft.com",
      "azure.com",
      "github.com",
      "live.com",
      "office.com",
      "bing.com",
      "linkedin.com",
      "skype.com"
    ],
    subcategories: [
      {
        id: "m365_portals",
        name: "Office 365 效率办公",
        enName: "Office 365 & Productivity",
        domainWhitelist: ["office.com", "microsoft365.com", "live.com", "bing.com"],
        titleRegex: /(office|word|excel|powerpoint|onedrive|outlook|bing|必应)/i,
        isDefault: true
      },
      {
        id: "copilot_ai",
        name: "Microsoft Copilot & AI",
        enName: "Microsoft Copilot & AI",
        domainWhitelist: ["copilot.microsoft.com"],
        titleRegex: /(copilot|副驾驶|azure ai)/i
      },
      {
        id: "azure_dev",
        name: "Azure 云与企业级架构",
        enName: "Azure Cloud & Architecture",
        domainWhitelist: ["azure.com", "portal.azure.com", "learn.microsoft.com"],
        titleRegex: /(azure|portal|learn|devops)/i
      },
      {
        id: "github_dev",
        name: "GitHub 开发者生态",
        enName: "GitHub Developer Ecosystem",
        domainWhitelist: ["github.com"],
        titleRegex: /(github|repo|gist)/i
      }
    ]
  },

  // 4. 苹果官方全生态
  {
    id: "apple",
    name: "苹果官方全生态",
    enName: "Apple Ecosystem",
    folderName: "🍎 苹果官方全生态 (Apple Ecosystem)",
    icon: "🍎",
    color: "#A2AAAD",
    officialDomains: [
      "apple.com",
      "apple.com.cn",
      "icloud.com",
      "swift.org"
    ],
    subcategories: [
      {
        id: "hardware_store",
        name: "官方商城与核心硬件",
        enName: "Apple Store & Hardware",
        domainWhitelist: ["apple.com", "apple.com.cn"],
        titleRegex: /(apple|官网|iphone|mac|ipad|watch|vision)/i,
        isDefault: true
      },
      {
        id: "icloud_services",
        name: "iCloud 云服务与软件生态",
        enName: "iCloud & Software Services",
        domainWhitelist: ["icloud.com"],
        titleRegex: /(icloud|备忘录|照片|钥匙串)/i
      },
      {
        id: "developer_swift",
        name: "Apple Developer 与开发者中心",
        enName: "Apple Developer & Swift",
        domainWhitelist: ["developer.apple.com", "swift.org"],
        titleRegex: /(developer|swift|xcode|app store connect|testflight)/i
      }
    ]
  },

  // 5. 腾讯官方全生态
  {
    id: "tencent",
    name: "腾讯官方全生态",
    enName: "Tencent Ecosystem",
    folderName: "🐧 腾讯官方全生态 (Tencent Ecosystem)",
    icon: "🐧",
    color: "#0052D9",
    officialDomains: [
      "qq.com",
      "tencent.com",
      "weixin.qq.com",
      "wechat.com",
      "tenpay.com"
    ],
    subcategories: [
      {
        id: "wechat_social",
        name: "微信与社交矩阵",
        enName: "WeChat & Social Network",
        domainWhitelist: ["weixin.qq.com", "mp.weixin.qq.com", "chatapi.weixin.qq.com", "qq.com"],
        titleRegex: /(微信|公众号|小程序|公众平台|智能对话|qq)/i,
        isDefault: true
      },
      {
        id: "office_saas",
        name: "办公协作与企业服务",
        enName: "Office SaaS & Collaboration",
        domainWhitelist: ["work.weixin.qq.com", "docs.qq.com", "meeting.tencent.com"],
        titleRegex: /(企业微信|腾讯文档|腾讯会议|协同)/i
      },
      {
        id: "cloud_ai_infra",
        name: "腾讯云与技术中台",
        enName: "Tencent Cloud & AI Platform",
        domainWhitelist: ["cloud.tencent.com", "console.cloud.tencent.com", "hunyuan.tencent.com"],
        titleRegex: /(腾讯云|混元|tokenhub|轻量服务器|云产品)/i
      }
    ]
  },

  // 6. 阿里官方全生态
  {
    id: "alibaba",
    name: "阿里官方全生态",
    enName: "Alibaba Ecosystem",
    folderName: "🟧 阿里官方全生态 (Alibaba Ecosystem)",
    icon: "🟧",
    color: "#FF6A00",
    officialDomains: [
      "aliyun.com",
      "alibaba.com",
      "taobao.com",
      "tmall.com",
      "dingtalk.com",
      "yuque.com",
      "qwen.ai",
      "alipay.com"
    ],
    subcategories: [
      {
        id: "cloud_infra",
        name: "阿里云与基础设施",
        enName: "Alibaba Cloud & Infrastructure",
        domainWhitelist: ["aliyun.com", "console.aliyun.com"],
        titleRegex: /(阿里云|云产品|基础设施|计算)/i,
        isDefault: true
      },
      {
        id: "qwen_ai",
        name: "AI与大模型生态",
        enName: "Qwen AI & LLM Ecosystem",
        domainWhitelist: ["bailian.console.aliyun.com", "qwen.ai", "chat.qwen.ai", "platform.agentscope.io"],
        titleRegex: /(百炼|通义|qwen|大模型|agentscope)/i
      },
      {
        id: "commerce_collab",
        name: "组织协同与商业中台",
        enName: "Commerce & Collaboration",
        domainWhitelist: ["dingtalk.com", "yuque.com", "taobao.com", "tmall.com", "alibaba.com", "alipay.com"],
        titleRegex: /(钉钉|语雀|淘宝|天猫|支付宝|商业)/i
      }
    ]
  },

  // 7. 字节跳动官方全生态
  {
    id: "bytedance",
    name: "字节跳动全生态",
    enName: "ByteDance Ecosystem",
    folderName: "⬛ 字节跳动全生态 (ByteDance Ecosystem)",
    icon: "⬛",
    color: "#3370FF",
    officialDomains: [
      "bytedance.com",
      "feishu.cn",
      "volcengine.com",
      "doubao.com",
      "coze.cn",
      "coze.com",
      "oceanengine.com",
      "douyin.com",
      "tiktok.com",
      "jianying.com"
    ],
    subcategories: [
      {
        id: "feishu_suite",
        name: "飞书数字办公套件",
        enName: "Feishu Digital Workplace",
        domainWhitelist: ["feishu.cn", "open.feishu.cn"],
        titleRegex: /(飞书|多维表格|开放平台|工作台)/i,
        isDefault: true
      },
      {
        id: "volc_ai_engine",
        name: "火山引擎与智能体 AI",
        enName: "Volcano Engine & AI Agents",
        domainWhitelist: ["volcengine.com", "doubao.com", "coze.cn", "coze.com"],
        titleRegex: /(火山引擎|方舟|豆包|扣子|coze|智能体)/i
      },
      {
        id: "content_creative",
        name: "内容与商业化生态",
        enName: "Content & Commercialization",
        domainWhitelist: ["oceanengine.com", "douyin.com", "tiktok.com", "jianying.com", "dramaland.com"],
        titleRegex: /(巨量引擎|抖音|tiktok|剪映|小云雀|红果短剧)/i
      }
    ]
  },

  // 8. 亚马逊官方全生态 (Amazon & AWS)
  {
    id: "amazon",
    name: "亚马逊官方全生态",
    enName: "Amazon & AWS Ecosystem",
    folderName: "📦 亚马逊官方全生态 (Amazon & AWS Ecosystem)",
    icon: "📦",
    color: "#FF9900",
    officialDomains: [
      "amazon.com",
      "amazon.cn",
      "amazon.co.jp",
      "amazon.co.uk",
      "amazon.de",
      "aws.amazon.com",
      "amazonaws.com",
      "twitch.tv",
      "audible.com",
      "goodreads.com",
      "primevideo.com",
      "sellercentral.amazon.com"
    ],
    subcategories: [
      {
        id: "aws_cloud",
        name: "AWS 云计算与基础设施",
        enName: "AWS Cloud & Infrastructure",
        domainWhitelist: ["aws.amazon.com", "console.aws.amazon.com", "amazonaws.com", "cloudfront.net"],
        titleRegex: /(aws|amazon web services|ec2|s3|iam|lambda|cloudformation|route 53|dynamodb|console\.aws)/i
      },
      {
        id: "ai_bedrock",
        name: "AWS Bedrock 与 AI 平台",
        enName: "AWS Bedrock & AI Platform",
        domainWhitelist: ["aws.amazon.com", "sagemaker.aws", "alexa.amazon.com"],
        titleRegex: /(bedrock|sagemaker|q developer|amazon q|titan|alexa)/i
      },
      {
        id: "ecommerce_seller",
        name: "亚马逊电商与跨境卖家",
        enName: "Amazon Store & Global Selling",
        domainWhitelist: ["sellercentral.amazon.com", "advertising.amazon.com", "amazon.com", "amazon.cn", "amazon.co.jp"],
        titleRegex: /(seller central|卖家|advertising|亚马逊商城|prime|buy box)/i,
        isDefault: true
      },
      {
        id: "media_content",
        name: "流媒体与数字内容",
        enName: "Streaming & Digital Content",
        domainWhitelist: ["twitch.tv", "primevideo.com", "audible.com", "goodreads.com", "kindle.amazon.com"],
        titleRegex: /(twitch|prime video|audible|goodreads|kindle)/i
      }
    ]
  },

  // 9. Meta 官方全生态
  {
    id: "meta",
    name: "Meta 官方全生态",
    enName: "Meta Ecosystem",
    folderName: "♾️ Meta 官方全生态 (Meta Ecosystem)",
    icon: "♾️",
    color: "#0668E1",
    officialDomains: [
      "meta.com",
      "meta.ai",
      "llama.com",
      "facebook.com",
      "instagram.com",
      "whatsapp.com",
      "threads.net",
      "messenger.com",
      "oculus.com"
    ],
    subcategories: [
      {
        id: "social_core",
        name: "社交网络核心门户",
        enName: "Social Network Portals",
        domainWhitelist: ["facebook.com", "instagram.com", "threads.net", "messenger.com"],
        titleRegex: /(facebook|instagram|threads|messenger|社交|主页)/i,
        isDefault: true
      },
      {
        id: "meta_ai",
        name: "Meta AI 与 Llama 开源生态",
        enName: "Meta AI & Llama Ecosystem",
        domainWhitelist: ["meta.ai", "llama.com", "ai.meta.com"],
        titleRegex: /(meta ai|llama|pytorch|fair|开源模型)/i
      },
      {
        id: "messaging_biz",
        name: "WhatsApp 与即时通讯",
        enName: "WhatsApp & Business Messaging",
        domainWhitelist: ["whatsapp.com", "web.whatsapp.com"],
        titleRegex: /(whatsapp|商户消息)/i
      },
      {
        id: "dev_business",
        name: "开发者平台与商业套件",
        enName: "Developer Platform & Business Suite",
        domainWhitelist: ["developers.facebook.com", "business.facebook.com", "adsmanager.facebook.com", "meta.com"],
        titleRegex: /(developer|graph api|business suite|ads manager|广告管理|oculus|quest)/i
      }
    ]
  },

  // 10. OpenAI 官方全生态
  {
    id: "openai",
    name: "OpenAI 官方全生态",
    enName: "OpenAI Ecosystem",
    folderName: "🧠 OpenAI 官方全生态 (OpenAI Ecosystem)",
    icon: "🧠",
    color: "#10A37F",
    officialDomains: [
      "openai.com",
      "chatgpt.com",
      "sora.com"
    ],
    subcategories: [
      {
        id: "chatgpt_consumer",
        name: "ChatGPT 消费级入口",
        enName: "ChatGPT Consumer Portal",
        domainWhitelist: ["chatgpt.com", "chat.openai.com"],
        titleRegex: /(chatgpt|chat\.openai|gpt-4|gpt-4o|gpts|o1|o3)/i,
        isDefault: true
      },
      {
        id: "api_platform",
        name: "OpenAI Platform 开发者平台",
        enName: "OpenAI Developer Platform",
        domainWhitelist: ["platform.openai.com"],
        titleRegex: /(platform|api key|playground|usage|billing|docs\.openai|assistants)/i
      },
      {
        id: "frontier_creative",
        name: "Sora 与多模态前沿",
        enName: "Sora & Multimodal Frontier",
        domainWhitelist: ["sora.com", "labs.openai.com"],
        titleRegex: /(sora|labs|dall-e|video generation)/i
      },
      {
        id: "research_company",
        name: "官方研究与动态",
        enName: "Research & Company News",
        domainWhitelist: ["openai.com"],
        titleRegex: /(research|about|safety|careers|company)/i
      }
    ]
  },

  // 11. 英伟达官方全生态
  {
    id: "nvidia",
    name: "英伟达官方全生态",
    enName: "NVIDIA Ecosystem",
    folderName: "💚 英伟达官方全生态 (NVIDIA Ecosystem)",
    icon: "💚",
    color: "#76B900",
    officialDomains: [
      "nvidia.com",
      "nvidia.cn",
      "geforce.com",
      "geforce.cn"
    ],
    subcategories: [
      {
        id: "developer_cuda",
        name: "开发者与 CUDA 生态",
        enName: "Developer & CUDA Ecosystem",
        domainWhitelist: ["developer.nvidia.com", "developer.download.nvidia.com"],
        titleRegex: /(developer|cuda|cudnn|tensorrt|driver|sdk|toolkit)/i,
        isDefault: true
      },
      {
        id: "cloud_ngc",
        name: "NGC 算力云与 NIM 微服务",
        enName: "NGC Cloud & NIM Microservices",
        domainWhitelist: ["ngc.nvidia.com", "build.nvidia.com"],
        titleRegex: /(ngc|nim|catalog|dgx|cloud|container)/i
      },
      {
        id: "enterprise_ai",
        name: "企业级 AI 与 Omniverse",
        enName: "Enterprise AI & Omniverse",
        domainWhitelist: ["nvidia.com", "nvidia.cn"],
        titleRegex: /(omniverse|enterprise|h100|b200|blackwell|drive|robotics)/i
      },
      {
        id: "geforce_gaming",
        name: "GeForce 游戏与显卡硬件",
        enName: "GeForce Gaming & Hardware",
        domainWhitelist: ["geforce.com", "geforce.cn"],
        titleRegex: /(geforce|rtx|shield|gaming|driver download)/i
      }
    ]
  },

  // 12. 百度官方全生态
  {
    id: "baidu",
    name: "百度官方全生态",
    enName: "Baidu Ecosystem",
    folderName: "🐾 百度官方全生态 (Baidu Ecosystem)",
    icon: "🐾",
    color: "#2932E1",
    officialDomains: [
      "baidu.com",
      "hao123.com",
      "paddlepaddle.org.cn",
      "baidubce.com"
    ],
    subcategories: [
      {
        id: "search_portals",
        name: "百度搜索与核心消费级入口",
        enName: "Baidu Search & Consumer Portals",
        domainWhitelist: ["baidu.com", "tieba.baidu.com", "pan.baidu.com", "baike.baidu.com", "map.baidu.com"],
        titleRegex: /(百度|贴吧|网盘|百科|地图|hao123)/i,
        isDefault: true
      },
      {
        id: "ai_qianfan",
        name: "文心一言与千帆大模型",
        enName: "ERNIE Bot & Qianfan LLM",
        domainWhitelist: ["yiyan.baidu.com", "qianfan.cloud.baidu.com", "paddlepaddle.org.cn", "aistudio.baidu.com"],
        titleRegex: /(文心|yiyan|千帆|飞桨|paddle|aistudio|ernie)/i
      },
      {
        id: "baidu_cloud",
        name: "百度智能云与企业服务",
        enName: "Baidu AI Cloud & Enterprise",
        domainWhitelist: ["cloud.baidu.com", "console.bce.baidu.com", "baidubce.com"],
        titleRegex: /(智能云|bce|云服务器|对象存储|cdn|智能客服)/i
      },
      {
        id: "dev_open",
        name: "开发者开放平台与商业营销",
        enName: "Open Platform & Marketing",
        domainWhitelist: ["open.baidu.com", "e.baidu.com", "ziyuan.baidu.com"],
        titleRegex: /(开放平台|搜索资源|营销|推广|站长)/i
      }
    ]
  },

  // 13. 小米官方全生态
  {
    id: "xiaomi",
    name: "小米官方全生态",
    enName: "Xiaomi Ecosystem",
    folderName: "📱 小米官方全生态 (Xiaomi Ecosystem)",
    icon: "📱",
    color: "#FF6900",
    officialDomains: [
      "mi.com",
      "xiaomi.com",
      "xiaomiev.com",
      "miui.com"
    ],
    subcategories: [
      {
        id: "hyperos_dev",
        name: "澎湃OS与开发者服务",
        enName: "HyperOS & Developer Services",
        domainWhitelist: ["dev.mi.com", "hyperos.mi.com", "miui.com"],
        titleRegex: /(澎湃|hyperos|miui|开发者|应用分发|开放平台)/i,
        isDefault: true
      },
      {
        id: "iot_smarthome",
        name: "米家与 IoT 开放平台",
        enName: "Mijia & IoT Open Platform",
        domainWhitelist: ["iot.mi.com", "home.mi.com"],
        titleRegex: /(米家|iot|智能硬件|物联)/i
      },
      {
        id: "cloud_services",
        name: "小米云服务与账号",
        enName: "Xiaomi Cloud & Account",
        domainWhitelist: ["i.mi.com", "account.xiaomi.com"],
        titleRegex: /(云服务|小米账号|查找设备)/i
      },
      {
        id: "ecommerce_auto",
        name: "小米商城与智能汽车",
        enName: "Xiaomi Mall & EV Motors",
        domainWhitelist: ["mi.com", "xiaomiev.com", "xiaomi.com"],
        titleRegex: /(商城|su7|汽车|xiaomiev|米粉)/i
      }
    ]
  },

  // 14. Anthropic 官方全生态
  {
    id: "anthropic",
    name: "Anthropic 官方全生态",
    enName: "Anthropic Claude Ecosystem",
    folderName: "🎭 Anthropic 官方全生态 (Anthropic Claude Ecosystem)",
    icon: "🎭",
    color: "#D97706",
    officialDomains: [
      "anthropic.com",
      "claude.ai"
    ],
    subcategories: [
      {
        id: "claude_web",
        name: "Claude 对话助手核心入口",
        enName: "Claude Chatbot Consumer Portal",
        domainWhitelist: ["claude.ai"],
        titleRegex: /(claude|sonnet|opus|haiku|artifacts|projects)/i,
        isDefault: true
      },
      {
        id: "api_console",
        name: "Anthropic Console 开发者平台",
        enName: "Anthropic Console Platform",
        domainWhitelist: ["console.anthropic.com"],
        titleRegex: /(console|api key|workbench|workbench\.anthropic|evaluations)/i
      },
      {
        id: "research_safety",
        name: "前沿研究与模型对齐",
        enName: "Frontier Research & AI Safety",
        domainWhitelist: ["anthropic.com"],
        titleRegex: /(research|constitutional|alignment|safety|careers)/i
      }
    ]
  },

  // 15. Cloudflare 官方全生态
  {
    id: "cloudflare",
    name: "Cloudflare 官方全生态",
    enName: "Cloudflare Ecosystem",
    folderName: "☁️ Cloudflare 官方全生态 (Cloudflare Ecosystem)",
    icon: "☁️",
    color: "#F38020",
    officialDomains: [
      "cloudflare.com",
      "workers.dev",
      "pages.dev"
    ],
    subcategories: [
      {
        id: "core_dashboard",
        name: "全局控制台与 DNS 管理",
        enName: "Global Dashboard & DNS",
        domainWhitelist: ["dash.cloudflare.com", "cloudflare.com"],
        titleRegex: /(dashboard|dash|dns|ssl|waf|analytics)/i,
        isDefault: true
      },
      {
        id: "workers_pages",
        name: "Workers & Pages 边缘无服务器",
        enName: "Workers & Pages Serverless",
        domainWhitelist: ["workers.dev", "pages.dev"],
        titleRegex: /(worker|pages|kv|d1|r2|vectorize|queues)/i
      },
      {
        id: "zerotrust_security",
        name: "Zero Trust 零信任安全",
        enName: "Zero Trust Security",
        domainWhitelist: ["one.dash.cloudflare.com"],
        titleRegex: /(zero trust|warp|tunnels|access|gateway)/i
      },
      {
        id: "dev_docs",
        name: "开发者文档与社区",
        enName: "Developer Docs & Community",
        domainWhitelist: ["developers.cloudflare.com", "community.cloudflare.com"],
        titleRegex: /(developer|docs|community|api documentation)/i
      }
    ]
  },

  // 16. 京东官方全生态
  {
    id: "jd",
    name: "京东官方全生态",
    enName: "JD Ecosystem",
    folderName: "🔴 京东官方全生态 (JD Ecosystem)",
    icon: "🔴",
    color: "#E1251B",
    officialDomains: [
      "jd.com",
      "jdcloud.com",
      "jdl.com",
      "jdpay.com"
    ],
    subcategories: [
      {
        id: "retail_portals",
        name: "京东商城与核心零售",
        enName: "JD Retail & Shopping Mall",
        domainWhitelist: ["jd.com", "item.jd.com", "home.jd.com"],
        titleRegex: /(京东商城|购物车|订单|plus)/i,
        isDefault: true
      },
      {
        id: "jd_cloud",
        name: "京东云与技术中台",
        enName: "JD Cloud & Tech Platform",
        domainWhitelist: ["jdcloud.com", "console.jdcloud.com"],
        titleRegex: /(京东云|言犀|云主机|数据库|大模型)/i
      },
      {
        id: "seller_open",
        name: "商家后台与开放平台",
        enName: "Seller Center & Open Platform",
        domainWhitelist: ["shop.jd.com", "open.jd.com"],
        titleRegex: /(京麦|商家|开放平台|api|服务市场)/i
      },
      {
        id: "fin_logistics",
        name: "京东物流与金融科技",
        enName: "JD Logistics & FinTech",
        domainWhitelist: ["jdl.com", "jdpay.com"],
        titleRegex: /(物流|快递|京东金融|支付)/i
      }
    ]
  },

  // 17. 协同文档与云端知识库 (UGC 多租户隔离专属分类)
  {
    id: "ugc_docs",
    name: "协同文档与云端知识库",
    enName: "Docs & Knowledge Base",
    folderName: "📄 协同文档与云端知识库 (Docs & Knowledge Base)",
    icon: "📄",
    color: "#10B981",
    isUgcContainer: true,
    officialDomains: [
      "docs.google.com",
      "sheets.google.com",
      "slides.google.com",
      "drive.google.com",
      "feishu.cn",
      "larksuite.com",
      "yuque.com",
      "notion.so",
      "notion.site",
      "docs.qq.com",
      "shimo.im",
      "wolai.com"
    ],
    subcategories: [
      {
        id: "google_docs",
        name: "Google Docs 在线文档",
        enName: "Google Docs & Drive",
        domainWhitelist: ["docs.google.com", "sheets.google.com", "slides.google.com"],
        titleRegex: /(docs|sheets|slides|google文档|谷歌表格|谷歌幻灯片)/i
      },
      {
        id: "feishu_lark",
        name: "飞书/Lark 云文档与多维表格",
        enName: "Feishu / Lark Docs & Base",
        domainWhitelist: ["feishu.cn", "larksuite.com"],
        titleRegex: /(feishu|飞书|lark|多维表格|云文档|知识库)/i
      },
      {
        id: "yuque",
        name: "语雀知识库与数字花园",
        enName: "Yuque Knowledge Base",
        domainWhitelist: ["yuque.com"],
        titleRegex: /(语雀|yuque|数字花园)/i
      },
      {
        id: "notion",
        name: "Notion 工作区与个人笔记",
        enName: "Notion Workspace & Notes",
        domainWhitelist: ["notion.so", "notion.site"],
        titleRegex: /(notion|workspace)/i
      },
      {
        id: "docs_portal",
        name: "在线文档与协同知识库",
        enName: "Collaborative Docs & Wiki",
        domainWhitelist: ["docs.qq.com", "shimo.im", "wolai.com"],
        titleRegex: /(腾讯文档|石墨文档|我来|wolai|shimo)/i,
        isDefault: true
      }
    ]
  }
];

// 导出为现代模块（兼容 Browser Extension 与 Node 环境）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ECOSYSTEM_RULES };
} else {
  (typeof window !== "undefined" ? window : global).ECOSYSTEM_RULES = ECOSYSTEM_RULES;
}
