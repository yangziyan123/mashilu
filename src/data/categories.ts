export const categoryDefinitions = [
  {
    name: "Java 后端",
    slug: "java",
    description: "Java 基础、Spring、架构、项目实战和后端面试方向。",
  },
  {
    name: "前端",
    slug: "frontend",
    description: "HTML、CSS、JavaScript、Vue、React、工程化和前端面试方向。",
  },
  {
    name: "算法/数据结构",
    slug: "algorithm",
    description: "LeetCode、竞赛、刷题路线、数据结构和算法训练。",
  },
  {
    name: "Python/AI/数据",
    slug: "python-ai-data",
    description: "Python、机器学习、深度学习、数据分析和大模型相关内容。",
  },
  {
    name: "计算机基础/系统",
    slug: "cs-systems",
    description: "网络、操作系统、数据库、Linux、图形学和系统基础。",
  },
  {
    name: "学习路线/求职",
    slug: "career",
    description: "学习路线、校招、简历、面试节奏和求职经验。",
  },
  {
    name: "语言/后端工程",
    slug: "backend-engineering",
    description: "Go、Rust、C++、系统编程、工程实践和后端基础设施。",
  },
  {
    name: "嵌入式/硬件",
    slug: "embedded-hardware",
    description: "嵌入式、物联网、硬件、Linux 驱动和边缘 AI 工程。",
  },
  {
    name: "移动端",
    slug: "mobile",
    description: "Android、Flutter、Dart 和移动端工程实践。",
  },
  {
    name: "网络安全",
    slug: "security",
    description: "安全基础、攻防实践、漏洞分析和安全学习路线。",
  },
  {
    name: "编程入门/通用",
    slug: "programming-basics",
    description: "编程入门、通用开发技能和跨语言基础能力。",
  },
  {
    name: "其他/扩展",
    slug: "others",
    description: "暂未归入核心分类，但对学习决策有参考价值的内容。",
  },
] as const;

export type CategoryName = (typeof categoryDefinitions)[number]["name"];
