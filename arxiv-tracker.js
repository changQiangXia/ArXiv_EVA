/**
 * ArXiv 论文追踪与 NLP 处理模块
 * NERV Research Division - Paper Tracking System
 */

const https = require('https');
const xml2js = require('xml2js');

// 论文数据存储（内存数据库）
let papers = [];
let paperIdCounter = 1;

// ArXiv 分类映射
const CATEGORIES = {
  'cs.AI': '人工智能',
  'cs.CV': '计算机视觉',
  'cs.LG': '机器学习',
  'cs.CL': '计算语言学',
  'cs.RO': '机器人学',
  'cs.SE': '软件工程',
  'cs.DB': '数据库',
  'cs.DC': '分布式计算',
  'cs.GT': '博弈论',
  'cs.HC': '人机交互',
  'cs.IR': '信息检索',
  'cs.IT': '信息论',
  'cs.MA': '多智能体系统',
  'cs.MM': '多媒体',
  'cs.NE': '神经网络',
  'cs.NI': '网络与互联网',
  'cs.OS': '操作系统',
  'cs.PF': '性能',
  'cs.PL': '编程语言',
  'cs.SC': '科学计算',
  'cs.SD': '声音',
  'cs.SE': '软件工程',
  'cs.SY': '系统与控制',
  'stat.ML': '统计机器学习',
  'physics.comp-ph': '计算物理',
  'q-bio.QM': '定量方法',
  'q-fin.ST': '统计金融',
  'eess.AS': '音频处理',
  'eess.IV': '图像/视频处理',
  'eess.SP': '信号处理',
  'eess.SY': '系统工程',
  'math.NA': '数值分析',
  'math.OC': '优化控制'
};

/**
 * 从 ArXiv API 获取最新论文
 */
async function fetchArxivPapers(options = {}) {
  const {
    category = 'cs.AI',
    maxResults = 10,
    sortBy = 'submittedDate',
    sortOrder = 'descending'
  } = options;

  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(`cat:${category}`);
    const url = `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

    console.log(`[NERV] 正在从 ArXiv 获取数据: ${category}`);

    const req = https.get(url, {
      headers: {
        'User-Agent': 'NERV-Research-Tracker/1.0 (Research Purpose)'
      },
      timeout: 30000
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        xml2js.parseString(data, { explicitArray: false }, (err, result) => {
          if (err) {
            reject(new Error('XML 解析失败: ' + err.message));
            return;
          }

          if (!result.feed || !result.feed.entry) {
            resolve([]);
            return;
          }

          const entries = Array.isArray(result.feed.entry) 
            ? result.feed.entry 
            : [result.feed.entry];

          const papers = entries.map(entry => parseArxivEntry(entry));
          resolve(papers);
        });
      });
    });

    req.on('error', (err) => {
      reject(new Error('请求失败: ' + err.message));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

/**
 * 解析 ArXiv Entry
 */
function parseArxivEntry(entry) {
  const id = entry.id.split('/').pop().split('v')[0];
  
  return {
    arxivId: id,
    title: cleanText(entry.title),
    summary: cleanText(entry.summary),
    authors: parseAuthors(entry.author),
    categories: parseCategories(entry.category),
    published: entry.published,
    updated: entry.updated,
    pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
    absUrl: `https://arxiv.org/abs/${id}`,
    primaryCategory: entry['arxiv:primary_category']?.$.term || 
                     (Array.isArray(entry.category) ? entry.category[0].$.term : entry.category?.$.term)
  };
}

/**
 * 解析作者列表
 */
function parseAuthors(authorData) {
  if (!authorData) return [];
  
  const authors = Array.isArray(authorData) ? authorData : [authorData];
  return authors.map(a => a.name).filter(Boolean);
}

/**
 * 解析分类
 */
function parseCategories(categoryData) {
  if (!categoryData) return [];
  
  const categories = Array.isArray(categoryData) ? categoryData : [categoryData];
  return categories.map(c => ({
    code: c.$.term,
    name: CATEGORIES[c.$.term] || c.$.term
  }));
}

/**
 * 清理文本
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

// ==================== NLP 处理模块 ====================

/**
 * 提取关键词（简单 TF 算法）
 */
function extractKeywords(text, topK = 5) {
  // 停用词表
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if',
    'because', 'although', 'though', 'while', 'where', 'when', 'that',
    'which', 'who', 'whom', 'whose', 'what', 'this', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
    'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine',
    'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself',
    'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
    'we', 'our', 'this', 'paper', 'propose', 'method', 'approach',
    'based', 'using', 'used', 'show', 'results', 'experimental',
    'experiments', 'demonstrate', 'proposed', 'novel', 'new'
  ]);

  // 分词并统计
  const words = text.toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const freq = {};
  words.forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([word, count]) => ({ word, count }));
}

/**
 * 生成一句话摘要
 */
function generateOneLiner(summary) {
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length === 0) return summary.slice(0, 150) + '...';
  
  // 找包含关键信息的句子
  const firstSentence = sentences[0].trim();
  
  // 如果第一句太长，截断
  if (firstSentence.length > 200) {
    return firstSentence.slice(0, 200) + '...';
  }
  
  return firstSentence;
}

/**
 * 评估研究热度（基于关键词）
 */
function calculateHypeScore(paper) {
  const hypeKeywords = [
    'llm', 'gpt', 'transformer', 'attention', 'diffusion', 'generative',
    'multimodal', 'large language', 'foundation model', 'chatgpt',
    'clip', 'stable diffusion', 'gpt-4', 'rag', 'retrieval augmented',
    'agent', 'autonomous', 'reinforcement learning', 'deep learning',
    'neural', 'ai', 'artificial intelligence', 'machine learning'
  ];
  
  const text = (paper.title + ' ' + paper.summary).toLowerCase();
  let score = 0;
  
  hypeKeywords.forEach(keyword => {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = text.match(regex);
    if (matches) {
      score += matches.length * (keyword.split(' ').length > 1 ? 2 : 1);
    }
  });
  
  return Math.min(score, 100);
}

/**
 * 估算阅读时间
 */
function estimateReadTime(summary) {
  const words = summary.split(/\s+/).length;
  // 假设阅读速度：200词/分钟
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

/**
 * 判断研究类型
 */
function classifyResearchType(categories, title, summary) {
  const text = (title + ' ' + summary).toLowerCase();
  
  const types = [];
  
  if (/survey|review|overview|taxonomy/.test(text)) {
    types.push('综述');
  }
  if (/dataset|benchmark|corpus/.test(text)) {
    types.push('数据集');
  }
  if (/method|approach|algorithm|model|architecture/.test(text)) {
    types.push('方法');
  }
  if (/theory|analysis|proof|theorem/.test(text)) {
    types.push('理论');
  }
  if (/application|system|framework|tool/.test(text)) {
    types.push('应用');
  }
  if (/experiment|empirical|evaluation/.test(text)) {
    types.push('实验');
  }
  
  return types.length > 0 ? types : ['研究'];
}

/**
 * 完整的 NLP 处理管道
 */
function processPaperNLP(paper) {
  return {
    ...paper,
    nlp: {
      keywords: extractKeywords(paper.title + ' ' + paper.summary),
      oneLiner: generateOneLiner(paper.summary),
      hypeScore: calculateHypeScore(paper),
      readTime: estimateReadTime(paper.summary),
      researchType: classifyResearchType(paper.categories, paper.title, paper.summary),
      processedAt: new Date().toISOString()
    }
  };
}

// ==================== 数据管理 ====================

/**
 * 同步 ArXiv 论文
 */
async function syncPapers(options = {}) {
  try {
    const arxivPapers = await fetchArxivPapers(options);
    
    const processedPapers = arxivPapers.map(paper => {
      // 检查是否已存在
      const existing = papers.find(p => p.arxivId === paper.arxivId);
      if (existing) {
        // 更新
        return { ...existing, ...paper, nlp: processPaperNLP(paper).nlp };
      }
      
      // 新增
      return {
        id: paperIdCounter++,
        ...paper,
        nlp: processPaperNLP(paper).nlp,
        syncedAt: new Date().toISOString(),
        isRead: false,
        isBookmarked: false,
        notes: ''
      };
    });
    
    // 合并到数据库
    processedPapers.forEach(paper => {
      const idx = papers.findIndex(p => p.arxivId === paper.arxivId);
      if (idx >= 0) {
        papers[idx] = paper;
      } else {
        papers.push(paper);
      }
    });
    
    // 按日期排序
    papers.sort((a, b) => new Date(b.published) - new Date(a.published));
    
    return {
      success: true,
      synced: processedPapers.length,
      total: papers.length
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 获取论文列表
 */
function getPapers(options = {}) {
  const {
    category = null,
    isRead = null,
    isBookmarked = null,
    search = null,
    sortBy = 'published',
    limit = 50,
    offset = 0
  } = options;
  
  let result = [...papers];
  
  // 分类过滤
  if (category) {
    result = result.filter(p => 
      p.categories.some(c => c.code === category || c.name.includes(category))
    );
  }
  
  // 阅读状态过滤
  if (isRead !== null) {
    result = result.filter(p => p.isRead === isRead);
  }
  
  // 收藏过滤
  if (isBookmarked !== null) {
    result = result.filter(p => p.isBookmarked === isBookmarked);
  }
  
  // 搜索
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.authors.some(a => a.toLowerCase().includes(q)) ||
      p.nlp.keywords.some(k => k.word.includes(q))
    );
  }
  
  // 排序
  if (sortBy === 'published') {
    result.sort((a, b) => new Date(b.published) - new Date(a.published));
  } else if (sortBy === 'hype') {
    result.sort((a, b) => b.nlp.hypeScore - a.nlp.hypeScore);
  } else if (sortBy === 'readTime') {
    result.sort((a, b) => a.nlp.readTime - b.nlp.readTime);
  }
  
  const total = result.length;
  result = result.slice(offset, offset + limit);
  
  return { papers: result, total };
}

/**
 * 获取单篇论文
 */
function getPaper(id) {
  return papers.find(p => p.id === parseInt(id));
}

/**
 * 更新论文状态
 */
function updatePaper(id, updates) {
  const idx = papers.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return null;
  
  papers[idx] = { ...papers[idx], ...updates };
  return papers[idx];
}

/**
 * 删除论文
 */
function deletePaper(id) {
  const idx = papers.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return false;
  
  papers.splice(idx, 1);
  return true;
}

/**
 * 获取统计信息
 */
function getStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const todayPapers = papers.filter(p => new Date(p.published) >= today);
  
  // 分类统计
  const categoryStats = {};
  papers.forEach(p => {
    const cat = p.primaryCategory;
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });
  
  // 关键词云
  const allKeywords = {};
  papers.forEach(p => {
    p.nlp.keywords.forEach(k => {
      allKeywords[k.word] = (allKeywords[k.word] || 0) + k.count;
    });
  });
  
  const topKeywords = Object.entries(allKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
  
  return {
    total: papers.length,
    today: todayPapers.length,
    read: papers.filter(p => p.isRead).length,
    bookmarked: papers.filter(p => p.isBookmarked).length,
    categories: categoryStats,
    topKeywords,
    lastSync: papers.length > 0 ? papers[0].syncedAt : null
  };
}

/**
 * 获取可用分类
 */
function getCategories() {
  return Object.entries(CATEGORIES).map(([code, name]) => ({
    code,
    name,
    count: papers.filter(p => p.primaryCategory === code).length
  }));
}

module.exports = {
  // 数据操作
  getPapers,
  getPaper,
  updatePaper,
  deletePaper,
  getStats,
  getCategories,
  syncPapers,
  
  // NLP 工具
  extractKeywords,
  generateOneLiner,
  calculateHypeScore,
  estimateReadTime,
  classifyResearchType,
  processPaperNLP,
  
  // 常量
  CATEGORIES
};
