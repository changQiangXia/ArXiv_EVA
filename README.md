# ⚡ NERV Research - ArXiv Tracker

> 前沿论文追踪与 NLP 分析系统 // v2.0

![ArXiv Tracker Screenshot](https://github.com/changQiangXia/ArXiv_EVA/blob/main/screenshot.PNG)

一个基于 **Node.js + Express** 的 ArXiv 论文追踪服务，采用庵野秀明/EVA 风格 UI 设计，支持论文数据抓取、NLP 预处理、热度分析和阅读管理。

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 📡 **ArXiv 同步** | 一键获取最新论文，支持 AI/CV/NLP 等多个领域 |
| 🧠 **NLP 分析** | 自动提取关键词、生成一句话摘要、研究类型分类 |
| 🔥 **热度指数** | 基于 LLM/GPT/Transformer 等热门关键词评分 |
| ⏱️ **阅读预估** | 智能估算论文阅读时间 |
| 📂 **分类浏览** | 按 cs.AI、cs.CV、cs.LG 等分类筛选 |
| ✅ **阅读管理** | 标记已读、收藏论文、添加笔记 |
| 🔍 **全文搜索** | 支持标题、作者、关键词搜索 |
| 📊 **数据统计** | 总论文数、今日新增、阅读进度可视化 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** v18+ （建议 v20+）
- **npm** 或 **yarn**

### 安装步骤

```bash
# 1. 进入项目目录
cd todo-api

# 2. 安装依赖
npm install

# 3. 启动服务器
node server.js
```

启动成功后，访问 http://localhost:3000/

---

## 📁 项目结构

```
todo-api/
├── server.js              # 主服务器文件
├── arxiv-tracker.js       # ArXiv 抓取 + NLP 处理模块
├── package.json           # 项目配置
├── package-lock.json      # 依赖锁定
├── README.md             # 本文件
├── screenshot.png        # 项目截图
└── node_modules/         # 依赖包
    ├── express/          # Web 框架
    └── xml2js/           # XML 解析器
```

---

## 📡 API 接口文档

### 1. 同步 ArXiv 数据

```http
POST /api/sync
Content-Type: application/json

{
  "category": "cs.AI",
  "maxResults": 10
}
```

**说明**: 从 ArXiv API 获取论文，进行 NLP 处理后存入内存数据库。

### 2. 获取论文列表

```http
GET /api/papers?category=cs.AI&sortBy=hype&limit=10&offset=0
```

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 分类代码，如 cs.AI、cs.CV |
| sortBy | string | 排序方式：published/hype/readTime |
| isRead | boolean | 是否已读 |
| isBookmarked | boolean | 是否收藏 |
| search | string | 搜索关键词 |
| limit | number | 返回数量 |
| offset | number | 分页偏移 |

### 3. 获取单篇论文

```http
GET /api/papers/:id
```

### 4. 更新论文状态

```http
PUT /api/papers/:id
Content-Type: application/json

{
  "isRead": true,
  "isBookmarked": false,
  "notes": "重要论文"
}
```

### 5. 删除论文

```http
DELETE /api/papers/:id
```

### 6. 获取统计数据

```http
GET /api/stats
```

### 7. 获取分类列表

```http
GET /api/categories
```

---

## 🔧 核心技术实现

### 1. ArXiv 数据抓取

```javascript
// arxiv-tracker.js
async function fetchArxivPapers(options) {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${category}`;
  // 使用 Node.js 内置 https 模块请求
  // 使用 xml2js 解析返回的 Atom XML
}
```

**要点**:

- ArXiv 提供官方 API，返回 Atom XML 格式
- 使用 xml2js 库解析 XML 为 JSON
- 支持按分类、日期排序

### 2. NLP 预处理

```javascript
// 关键词提取（TF 算法）
function extractKeywords(text, topK = 5) {
  // 1. 分词（按空格和标点）
  // 2. 过滤停用词（the, is, and 等）
  // 3. 统计词频
  // 4. 返回 Top K
}

// 热度评分
function calculateHypeScore(paper) {
  // 热门关键词：llm, gpt, transformer, diffusion...
  // 匹配越多分数越高（0-100）
}
```

**要点**:

- 所有 NLP 处理在服务端完成
- 关键词提取使用简单的 TF（词频）算法
- 热度评分基于预定义的热门 AI 关键词表

### 3. 数据存储

使用内存数组存储（适合学习和演示）:

```javascript
let papers = [];        // 论文数组
let paperIdCounter = 1; // 自增 ID
```

**要点**:

- 内存存储，重启后数据清空
- 如需持久化，可替换为 MongoDB/SQLite

### 4. 前端 EVA 风格 UI

```css
/* AT 力场背景 - 六边形网格 */
.at-field {
  background-image: 
    linear-gradient(30deg, var(--eva-grid) 12%, ...),
    linear-gradient(150deg, ...);
  background-size: 80px 140px;
  animation: atFieldPulse 4s ease-in-out infinite;
}

/* EVA 配色 */
:root {
  --eva-purple: #9D4EDD;
  --eva-green: #CCFF00;
  --eva-orange: #FF6B35;
  --eva-red: #E63946;
  --eva-dark: #0D0221;
}
```

**要点**:

- 使用 CSS 变量统一管理配色
- 六边形网格用多个线性渐变叠加实现
- 使用 Orbitron 和 Share Tech Mono 字体

### 5. 服务端架构

```
请求 → Express 路由 → arxiv-tracker.js → 返回 JSON
                ↓
         ┌──────┴──────┐
         ↓             ↓
    fetchArxiv    processPaperNLP
    (抓取数据)      (NLP处理)
```

---

## 🎨 扩展思路

1. **添加真实数据库**: 使用 SQLite/MongoDB 替代内存存储
2. **定时自动同步**: 使用 node-cron 每小时自动抓取新论文
3. **接入 OpenAI API**: 使用 GPT-4 生成中文论文摘要
4. **邮件提醒**: 当有新论文时发送邮件通知
5. **部署到服务器**: 使用 PM2/Docker 部署到云端

---

## 📚 学习资源

- [Express.js 官方文档](https://expressjs.com/)
- [ArXiv API 文档](https://info.arxiv.org/help/api/)
- [Node.js https 模块](https://nodejs.org/api/https.html)
- [CSS Grid 教程](https://css-tricks.com/snippets/css/complete-guide-grid/)

---

## 🛠️ 常见问题

**Q: ArXiv API 请求失败？**

ArXiv 有请求频率限制（建议间隔 3 秒）。如果频繁请求会返回 403，请稍后再试。

**Q: 数据重启后消失？**

当前使用内存存储。如需持久化，请参考"添加真实数据库"部分。

---

## 📜 License

MIT License - 仅供学习交流使用

---

> 如果说 EVA 是人类的希望，那这个系统就是 AI 研究者的 AT 力场。

**Made with love by NERV Research Division**
