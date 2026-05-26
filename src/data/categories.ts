export const categoryDefinitions = [
  {
    name: "项目实战",
    slug: "projects",
    description: "可用于练手、作品集、业务模拟和端到端实践的项目型内容。",
  },
  {
    name: "求职",
    slug: "career",
    description: "校招、社招、简历、面试、学习路线和求职经验。",
  },
  {
    name: "前端技术",
    slug: "frontend",
    description: "HTML、CSS、JavaScript、Vue、React、工程化和前端面试方向。",
  },
  {
    name: "后端技术",
    slug: "backend",
    description: "Java、Go、Rust、C++、服务端架构、源码、工程实践和基础设施。",
  },
  {
    name: "AI/数据",
    slug: "ai-data",
    description: "Python、机器学习、深度学习、数据分析和大模型相关内容。",
  },
  {
    name: "算法",
    slug: "algorithm",
    description: "LeetCode、竞赛、刷题路线、数据结构和算法训练。",
  },
  {
    name: "计算机基础",
    slug: "cs-basics",
    description: "网络、操作系统、数据库、Linux、图形学和系统基础。",
  },
  {
    name: "嵌入式",
    slug: "embedded",
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
    name: "编程入门",
    slug: "programming-basics",
    description: "编程入门、通用开发技能和跨语言基础能力。",
  },
  {
    name: "其他",
    slug: "other",
    description: "暂未归入核心分类，但对学习决策有参考价值的内容。",
  },
] as const;

export type CategoryName = (typeof categoryDefinitions)[number]["name"];
