const express = require('express');
const arxiv = require('./arxiv-tracker');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// ==================== API 路由 ====================

// 同步 ArXiv 数据
app.post('/api/sync', async (req, res) => {
  const { category = 'cs.AI', maxResults = 10 } = req.body;
  const result = await arxiv.syncPapers({ category, maxResults });
  res.json(result);
});

// 获取论文列表
app.get('/api/papers', (req, res) => {
  const options = {
    category: req.query.category,
    isRead: req.query.isRead === 'true' ? true : 
            req.query.isRead === 'false' ? false : null,
    isBookmarked: req.query.isBookmarked === 'true' ? true : 
                  req.query.isBookmarked === 'false' ? false : null,
    search: req.query.search,
    sortBy: req.query.sortBy || 'published',
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0
  };
  
  const result = arxiv.getPapers(options);
  res.json({ success: true, ...result });
});

// 获取单篇论文
app.get('/api/papers/:id', (req, res) => {
  const paper = arxiv.getPaper(req.params.id);
  if (!paper) {
    return res.status(404).json({ success: false, message: '论文不存在' });
  }
  res.json({ success: true, data: paper });
});

// 更新论文状态
app.put('/api/papers/:id', (req, res) => {
  const updates = req.body;
  const paper = arxiv.updatePaper(req.params.id, updates);
  if (!paper) {
    return res.status(404).json({ success: false, message: '论文不存在' });
  }
  res.json({ success: true, data: paper });
});

// 删除论文
app.delete('/api/papers/:id', (req, res) => {
  const success = arxiv.deletePaper(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: '论文不存在' });
  }
  res.json({ success: true });
});

// 获取统计
app.get('/api/stats', (req, res) => {
  const stats = arxiv.getStats();
  res.json({ success: true, data: stats });
});

// 获取分类列表
app.get('/api/categories', (req, res) => {
  const categories = arxiv.getCategories();
  res.json({ success: true, data: categories });
});

// ==================== EVA 风格前端 ====================

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NERV Research // ArXiv Tracker</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --eva-purple: #9D4EDD;
      --eva-green: #CCFF00;
      --eva-orange: #FF6B35;
      --eva-red: #E63946;
      --eva-blue: #00D9FF;
      --eva-dark: #0D0221;
      --eva-grid: rgba(157, 78, 221, 0.25);
      --eva-line: rgba(204, 255, 0, 0.6);
      --mono: 'Share Tech Mono', monospace;
      --orbitron: 'Orbitron', sans-serif;
    }
    
    body {
      font-family: 'Noto Sans JP', sans-serif;
      min-height: 100vh;
      color: #fff;
      background: var(--eva-dark);
      position: relative;
      overflow-x: hidden;
      line-height: 1.6;
    }
    
    /* AT力场背景 */
    .at-field {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(30deg, var(--eva-grid) 12%, transparent 12.5%, transparent 87%, var(--eva-grid) 87.5%, var(--eva-grid)),
        linear-gradient(150deg, var(--eva-grid) 12%, transparent 12.5%, transparent 87%, var(--eva-grid) 87.5%, var(--eva-grid)),
        linear-gradient(30deg, var(--eva-grid) 12%, transparent 12.5%, transparent 87%, var(--eva-grid) 87.5%, var(--eva-grid)),
        linear-gradient(150deg, var(--eva-grid) 12%, transparent 12.5%, transparent 87%, var(--eva-grid) 87.5%, var(--eva-grid)),
        linear-gradient(60deg, rgba(157, 78, 221, 0.03) 25%, transparent 25.5%, transparent 75%, rgba(157, 78, 221, 0.03) 75%, rgba(157, 78, 221, 0.03)),
        linear-gradient(60deg, rgba(157, 78, 221, 0.03) 25%, transparent 25.5%, transparent 75%, rgba(157, 78, 221, 0.03) 75%, rgba(157, 78, 221, 0.03));
      background-size: 80px 140px;
      background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
      z-index: -2;
      animation: atFieldPulse 4s ease-in-out infinite;
    }
    
    @keyframes atFieldPulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.6; }
    }
    
    /* 扫描线 */
    .scanline {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.25) 2px,
        rgba(0, 0, 0, 0.25) 4px
      );
      z-index: 1000;
      pointer-events: none;
      opacity: 0.12;
    }
    
    /* 技术边框 */
    .tech-border {
      position: fixed;
      top: 16px;
      left: 16px;
      right: 16px;
      bottom: 16px;
      border: 1px solid var(--eva-grid);
      pointer-events: none;
      z-index: 50;
    }
    
    .tech-border::before, .tech-border::after {
      content: '';
      position: absolute;
      width: 30px;
      height: 30px;
      border: 2px solid var(--eva-orange);
    }
    
    .tech-border::before { top: -2px; left: -2px; border-right: none; border-bottom: none; }
    .tech-border::after { bottom: -2px; right: -2px; border-left: none; border-top: none; }
    
    /* 警告条纹 */
    .warning-strip {
      position: fixed;
      left: 0;
      right: 0;
      height: 4px;
      background: repeating-linear-gradient(45deg, var(--eva-orange), var(--eva-orange) 8px, #000 8px, #000 16px);
      z-index: 51;
    }
    .warning-strip.top { top: 0; }
    .warning-strip.bottom { bottom: 0; }
    
    /* 角落标记 */
    .corner-mark {
      position: fixed;
      font-family: var(--orbitron);
      font-size: 10px;
      letter-spacing: 2px;
      z-index: 51;
      color: var(--eva-green);
    }
    .corner-mark.top-left { top: 24px; left: 24px; }
    .corner-mark.top-right { top: 24px; right: 24px; color: var(--eva-orange); }
    .corner-mark.bottom-left { bottom: 24px; left: 24px; }
    .corner-mark.bottom-right { bottom: 24px; right: 24px; color: var(--eva-purple); }
    
    /* 容器 */
    .wrapper {
      max-width: 900px;
      margin: 0 auto;
      padding: 70px 24px 50px;
    }
    
    /* 头部 */
    .header {
      text-align: center;
      margin-bottom: 32px;
      position: relative;
    }
    
    .header::before {
      content: 'NERV RESEARCH DIVISION';
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      font-family: var(--orbitron);
      font-size: 9px;
      color: var(--eva-orange);
      letter-spacing: 6px;
    }
    
    .header h1 {
      font-family: var(--orbitron);
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 4px;
      color: var(--eva-green);
      text-shadow: 0 0 25px var(--eva-green);
      margin-bottom: 8px;
    }
    
    .header .subtitle {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--eva-purple);
      letter-spacing: 2px;
    }
    
    /* 统计卡片网格 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: rgba(13, 2, 33, 0.8);
      border: 1px solid var(--eva-purple);
      padding: 16px 12px;
      text-align: center;
      position: relative;
    }
    
    .stat-card::before {
      content: attr(data-label);
      position: absolute;
      top: -8px;
      left: 8px;
      background: var(--eva-dark);
      padding: 0 6px;
      font-family: var(--orbitron);
      font-size: 8px;
      color: var(--eva-orange);
      letter-spacing: 1px;
    }
    
    .stat-value {
      font-family: var(--orbitron);
      font-size: 28px;
      font-weight: 700;
      color: var(--eva-green);
      text-shadow: 0 0 15px var(--eva-green);
    }
    
    .stat-label {
      font-size: 10px;
      color: rgba(255,255,255,0.5);
      margin-top: 4px;
      font-family: var(--mono);
    }
    
    /* 控制面板 */
    .control-panel {
      background: rgba(13, 2, 33, 0.9);
      border: 1px solid var(--eva-purple);
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    
    .control-panel::before {
      content: 'CONTROL_PANEL';
      position: absolute;
      top: -10px;
      left: 16px;
      background: var(--eva-dark);
      padding: 0 8px;
      font-family: var(--orbitron);
      font-size: 9px;
      color: var(--eva-orange);
    }
    
    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .control-label {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--eva-purple);
      letter-spacing: 1px;
    }
    
    select, input[type="text"] {
      background: rgba(0,0,0,0.5);
      border: 1px solid var(--eva-purple);
      color: #fff;
      padding: 8px 12px;
      font-family: var(--mono);
      font-size: 13px;
      outline: none;
      min-width: 120px;
    }
    
    select:focus, input:focus {
      border-color: var(--eva-green);
      box-shadow: 0 0 10px rgba(204, 255, 0, 0.3);
    }
    
    .btn {
      background: var(--eva-purple);
      border: none;
      color: #fff;
      padding: 10px 20px;
      font-family: var(--orbitron);
      font-size: 11px;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
    }
    
    .btn:hover {
      background: var(--eva-green);
      color: var(--eva-dark);
      box-shadow: 0 0 20px var(--eva-green);
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-sync {
      background: var(--eva-orange);
      margin-left: auto;
    }
    
    .btn-sync:hover {
      background: #FF8C5A;
      box-shadow: 0 0 20px var(--eva-orange);
    }
    
    /* 论文列表 */
    .paper-list {
      background: rgba(13, 2, 33, 0.9);
      border: 1px solid var(--eva-purple);
      min-height: 400px;
    }
    
    .paper-list::before {
      content: 'PAPER_DATABASE';
      display: block;
      padding: 12px 16px;
      border-bottom: 1px solid var(--eva-purple);
      font-family: var(--orbitron);
      font-size: 11px;
      color: var(--eva-green);
      letter-spacing: 2px;
    }
    
    .paper-item {
      border-bottom: 1px solid rgba(157, 78, 221, 0.3);
      padding: 16px 20px;
      transition: all 0.2s;
      position: relative;
      cursor: pointer;
    }
    
    .paper-item:hover {
      background: rgba(157, 78, 221, 0.1);
    }
    
    .paper-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--eva-purple);
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .paper-item:hover::before {
      opacity: 1;
    }
    
    .paper-item.read::before {
      background: var(--eva-green);
      opacity: 1;
    }
    
    .paper-item.bookmarked .paper-title::after {
      content: ' ★';
      color: var(--eva-orange);
    }
    
    .paper-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 8px;
    }
    
    .paper-title {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      line-height: 1.5;
      flex: 1;
    }
    
    .paper-title a {
      color: inherit;
      text-decoration: none;
    }
    
    .paper-title a:hover {
      color: var(--eva-green);
      text-shadow: 0 0 10px var(--eva-green);
    }
    
    .paper-actions {
      display: flex;
      gap: 8px;
    }
    
    .paper-action {
      width: 28px;
      height: 28px;
      border: 1px solid var(--eva-purple);
      background: transparent;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .paper-action:hover {
      border-color: var(--eva-green);
      color: var(--eva-green);
      box-shadow: 0 0 10px rgba(204, 255, 0, 0.3);
    }
    
    .paper-action.active {
      background: var(--eva-green);
      border-color: var(--eva-green);
      color: var(--eva-dark);
    }
    
    .paper-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      font-family: var(--mono);
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    
    .paper-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .paper-authors {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 8px;
    }
    
    .paper-summary {
      font-size: 13px;
      color: rgba(255,255,255,0.7);
      line-height: 1.6;
      margin-bottom: 12px;
    }
    
    .paper-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .tag {
      padding: 4px 10px;
      font-size: 10px;
      font-family: var(--mono);
      letter-spacing: 1px;
      border: 1px solid;
    }
    
    .tag-category {
      border-color: var(--eva-blue);
      color: var(--eva-blue);
    }
    
    .tag-type {
      border-color: var(--eva-purple);
      color: var(--eva-purple);
    }
    
    .tag-hype {
      border-color: var(--eva-orange);
      color: var(--eva-orange);
    }
    
    .tag-readtime {
      border-color: var(--eva-green);
      color: var(--eva-green);
    }
    
    /* 热度条 */
    .hype-bar {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    
    .hype-level {
      width: 40px;
      height: 4px;
      background: rgba(255,255,255,0.1);
      position: relative;
    }
    
    .hype-fill {
      height: 100%;
      background: var(--eva-orange);
      box-shadow: 0 0 8px var(--eva-orange);
    }
    
    /* 加载状态 */
    .loading {
      padding: 60px 20px;
      text-align: center;
    }
    
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid var(--eva-purple);
      border-top-color: var(--eva-green);
      margin: 0 auto 20px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .loading-text {
      font-family: var(--orbitron);
      color: var(--eva-green);
      font-size: 12px;
      letter-spacing: 3px;
      animation: blink 1.5s ease-in-out infinite;
    }
    
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    /* 空状态 */
    .empty-state {
      text-align: center;
      padding: 80px 40px;
    }
    
    .empty-icon {
      font-family: var(--orbitron);
      font-size: 48px;
      color: var(--eva-purple);
      margin-bottom: 16px;
      text-shadow: 0 0 30px var(--eva-purple);
    }
    
    .empty-title {
      font-family: var(--orbitron);
      font-size: 16px;
      color: var(--eva-green);
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    
    .empty-subtitle {
      font-size: 13px;
      color: rgba(255,255,255,0.4);
    }
    
    /* 分页 */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      padding: 20px;
      border-top: 1px solid rgba(157, 78, 221, 0.3);
    }
    
    .pagination-info {
      font-family: var(--mono);
      font-size: 12px;
      color: rgba(255,255,255,0.5);
    }
    
    /* 详情弹窗 */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 2000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    
    .modal-overlay.active {
      display: flex;
    }
    
    .modal {
      background: rgba(13, 2, 33, 0.98);
      border: 1px solid var(--eva-purple);
      max-width: 700px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      position: relative;
      padding: 28px;
    }
    
    .modal::before {
      content: 'PAPER_DETAIL';
      position: absolute;
      top: -10px;
      left: 20px;
      background: var(--eva-dark);
      padding: 0 12px;
      font-family: var(--orbitron);
      font-size: 10px;
      color: var(--eva-orange);
      letter-spacing: 2px;
    }
    
    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      border: 1px solid var(--eva-red);
      background: transparent;
      color: var(--eva-red);
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .modal-close:hover {
      background: var(--eva-red);
      color: #fff;
    }
    
    .modal-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-right: 40px;
      line-height: 1.5;
    }
    
    .modal-section {
      margin-bottom: 20px;
    }
    
    .modal-section-title {
      font-family: var(--orbitron);
      font-size: 11px;
      color: var(--eva-orange);
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    
    .modal-text {
      font-size: 14px;
      line-height: 1.8;
      color: rgba(255,255,255,0.8);
    }
    
    .modal-links {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    
    .modal-link {
      flex: 1;
      padding: 12px;
      border: 1px solid var(--eva-purple);
      color: var(--eva-green);
      text-align: center;
      text-decoration: none;
      font-family: var(--orbitron);
      font-size: 11px;
      letter-spacing: 1px;
      transition: all 0.2s;
    }
    
    .modal-link:hover {
      background: var(--eva-green);
      border-color: var(--eva-green);
      color: var(--eva-dark);
    }
    
    /* 响应式 */
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .control-panel {
        flex-direction: column;
        align-items: stretch;
      }
      
      .control-group {
        width: 100%;
      }
      
      select, input[type="text"] {
        width: 100%;
      }
      
      .btn-sync {
        margin-left: 0;
        width: 100%;
      }
      
      .header h1 {
        font-size: 24px;
        letter-spacing: 2px;
      }
      
      .corner-mark {
        font-size: 8px;
        letter-spacing: 1px;
      }
    }
  </style>
</head>
<body>
  <div class="at-field"></div>
  <div class="scanline"></div>
  <div class="tech-border"></div>
  <div class="warning-strip top"></div>
  <div class="warning-strip bottom"></div>
  <div class="corner-mark top-left">NERV // ARXIV-SYS</div>
  <div class="corner-mark top-right">SYNC: STANDBY</div>
  <div class="corner-mark bottom-left">NEURAL_LINK: ACTIVE</div>
  <div class="corner-mark bottom-right">ALERT LEVEL: 00</div>
  
  <div class="wrapper">
    <header class="header">
      <h1>ARXIV TRACKER</h1>
      <div class="subtitle">前沿论文追踪与NLP分析系统 // v2.0</div>
    </header>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card" data-label="TOTAL">
        <div class="stat-value" id="statTotal">0</div>
        <div class="stat-label">总论文数</div>
      </div>
      <div class="stat-card" data-label="TODAY">
        <div class="stat-value" id="statToday">0</div>
        <div class="stat-label">今日新增</div>
      </div>
      <div class="stat-card" data-label="READ">
        <div class="stat-value" id="statRead">0</div>
        <div class="stat-label">已阅读</div>
      </div>
      <div class="stat-card" data-label="BOOKMARK">
        <div class="stat-value" id="statBookmark">0</div>
        <div class="stat-label">已收藏</div>
      </div>
    </div>
    
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-group">
        <span class="control-label">CATEGORY:</span>
        <select id="categorySelect">
          <option value="">全部</option>
          <option value="cs.AI" selected>人工智能</option>
          <option value="cs.CV">计算机视觉</option>
          <option value="cs.LG">机器学习</option>
          <option value="cs.CL">自然语言处理</option>
          <option value="cs.RO">机器人学</option>
          <option value="cs.SE">软件工程</option>
          <option value="stat.ML">统计学习</option>
        </select>
      </div>
      
      <div class="control-group">
        <span class="control-label">SORT:</span>
        <select id="sortSelect">
          <option value="published">发布日期</option>
          <option value="hype">热度指数</option>
          <option value="readTime">阅读时间</option>
        </select>
      </div>
      
      <div class="control-group">
        <span class="control-label">FILTER:</span>
        <select id="filterSelect">
          <option value="">全部</option>
          <option value="unread">未读</option>
          <option value="bookmarked">已收藏</option>
        </select>
      </div>
      
      <div class="control-group" style="flex: 1;">
        <input type="text" id="searchInput" placeholder="搜索标题/作者/关键词..." style="width: 100%;">
      </div>
      
      <button class="btn btn-sync" id="syncBtn" onclick="syncPapers()">
        SYNC DATA
      </button>
    </div>
    
    <!-- 论文列表 -->
    <div class="paper-list" id="paperList">
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">INITIALIZING SYSTEM...</div>
      </div>
    </div>
    
    <!-- 分页 -->
    <div class="pagination" id="pagination" style="display: none;">
      <button class="btn" onclick="changePage(-1)">← PREV</button>
      <span class="pagination-info" id="pageInfo">Page 1</span>
      <button class="btn" onclick="changePage(1)">NEXT →</button>
    </div>
  </div>
  
  <!-- 详情弹窗 -->
  <div class="modal-overlay" id="modal" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal()">×</button>
      <div id="modalContent"></div>
    </div>
  </div>

  <script>
    let papers = [];
    let currentPage = 0;
    const pageSize = 10;
    let totalPapers = 0;
    
    // 初始化
    document.addEventListener('DOMContentLoaded', () => {
      loadStats();
      loadPapers();
      
      // 绑定事件
      document.getElementById('categorySelect').addEventListener('change', () => {
        currentPage = 0;
        loadPapers();
      });
      
      document.getElementById('sortSelect').addEventListener('change', () => {
        currentPage = 0;
        loadPapers();
      });
      
      document.getElementById('filterSelect').addEventListener('change', () => {
        currentPage = 0;
        loadPapers();
      });
      
      document.getElementById('searchInput').addEventListener('input', debounce(() => {
        currentPage = 0;
        loadPapers();
      }, 500));
    });
    
    // 防抖
    function debounce(fn, delay) {
      let timer = null;
      return function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          fn.apply(this, arguments);
        }, delay);
      };
    }
    
    // 加载统计
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        
        if (data.success) {
          document.getElementById('statTotal').textContent = data.data.total;
          document.getElementById('statToday').textContent = data.data.today;
          document.getElementById('statRead').textContent = data.data.read;
          document.getElementById('statBookmark').textContent = data.data.bookmarked;
        }
      } catch (err) {
        console.error('Stats load failed:', err);
      }
    }
    
    // 加载论文列表
    async function loadPapers() {
      const container = document.getElementById('paperList');
      container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div class="loading-text">LOADING DATA...</div></div>';
      
      const category = document.getElementById('categorySelect').value;
      const sortBy = document.getElementById('sortSelect').value;
      const filter = document.getElementById('filterSelect').value;
      const search = document.getElementById('searchInput').value;
      
      let isRead = null;
      let isBookmarked = null;
      
      if (filter === 'unread') isRead = false;
      if (filter === 'bookmarked') isBookmarked = true;
      
      try {
        const params = new URLSearchParams({
          sortBy,
          limit: pageSize,
          offset: currentPage * pageSize
        });
        
        if (category) params.append('category', category);
        if (isRead !== null) params.append('isRead', isRead);
        if (isBookmarked !== null) params.append('isBookmarked', isBookmarked);
        if (search) params.append('search', search);
        
        const res = await fetch(\`/api/papers?\${params}\`);
        const data = await res.json();
        
        if (data.success) {
          papers = data.papers;
          totalPapers = data.total;
          renderPapers();
          updatePagination();
        }
      } catch (err) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">ERROR</div><div class="empty-title">LOAD FAILED</div><div class="empty-subtitle">数据加载失败 // 请重试</div></div>';
      }
    }
    
    // 渲染论文列表
    function renderPapers() {
      const container = document.getElementById('paperList');
      
      if (papers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">◉</div><div class="empty-title">NO DATA</div><div class="empty-subtitle">数据库为空 // 点击 SYNC DATA 获取论文</div></div>';
        return;
      }
      
      container.innerHTML = papers.map(paper => {
        const date = new Date(paper.published).toLocaleDateString('zh-CN');
        const hypeWidth = Math.min(paper.nlp.hypeScore * 2, 100);
        const hypeLevel = paper.nlp.hypeScore > 50 ? 'HIGH' : paper.nlp.hypeScore > 25 ? 'MED' : 'LOW';
        
        return \`
          <div class="paper-item \${paper.isRead ? 'read' : ''} \${paper.isBookmarked ? 'bookmarked' : ''}" data-id="\${paper.id}">
            <div class="paper-header">
              <div class="paper-title">
                <a href="\${paper.absUrl}" target="_blank">\${escapeHtml(paper.title)}</a>
              </div>
              <div class="paper-actions">
                <button class="paper-action \${paper.isRead ? 'active' : ''}" onclick="toggleRead(event, \${paper.id})" title="标记已读">
                  ✓
                </button>
                <button class="paper-action \${paper.isBookmarked ? 'active' : ''}" onclick="toggleBookmark(event, \${paper.id})" title="收藏">
                  ★
                </button>
                <button class="paper-action" onclick="showDetail(event, \${paper.id})" title="详情">
                  ⓘ
                </button>
              </div>
            </div>
            
            <div class="paper-meta">
              <span>📅 \${date}</span>
              <span>👤 \${paper.authors.slice(0, 3).join(', ')}\${paper.authors.length > 3 ? ' et al.' : ''}</span>
              <span>⏱️ \${paper.nlp.readTime}min</span>
              <span class="hype-bar">
                🔥 \${hypeLevel}
                <span class="hype-level">
                  <span class="hype-fill" style="width: \${hypeWidth}%"></span>
                </span>
              </span>
            </div>
            
            <div class="paper-summary">\${escapeHtml(paper.nlp.oneLiner)}</div>
            
            <div class="paper-tags">
              <span class="tag tag-category">\${paper.categories[0]?.name || paper.primaryCategory}</span>
              \${paper.nlp.researchType.map(t => \`<span class="tag tag-type">\${t}</span>\`).join('')}
              <span class="tag tag-hype">HYPE: \${paper.nlp.hypeScore}</span>
              <span class="tag tag-readtime">\${paper.nlp.readTime}MIN</span>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    // 更新分页
    function updatePagination() {
      const totalPages = Math.ceil(totalPapers / pageSize);
      const pagination = document.getElementById('pagination');
      
      if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
      }
      
      pagination.style.display = 'flex';
      document.getElementById('pageInfo').textContent = \`PAGE \${currentPage + 1} / \${totalPages}\`;
    }
    
    // 切换页面
    function changePage(delta) {
      const totalPages = Math.ceil(totalPapers / pageSize);
      const newPage = currentPage + delta;
      
      if (newPage >= 0 && newPage < totalPages) {
        currentPage = newPage;
        loadPapers();
      }
    }
    
    // 同步数据
    async function syncPapers() {
      const btn = document.getElementById('syncBtn');
      const originalText = btn.textContent;
      btn.textContent = 'SYNCING...';
      btn.disabled = true;
      
      const category = document.getElementById('categorySelect').value || 'cs.AI';
      
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, maxResults: 20 })
        });
        
        const data = await res.json();
        
        if (data.success) {
          loadStats();
          currentPage = 0;
          loadPapers();
        } else {
          alert('同步失败: ' + data.error);
        }
      } catch (err) {
        alert('同步失败: ' + err.message);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
    
    // 切换已读状态
    async function toggleRead(event, id) {
      event.stopPropagation();
      const paper = papers.find(p => p.id === id);
      if (!paper) return;
      
      try {
        const res = await fetch(\`/api/papers/\${id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: !paper.isRead })
        });
        
        const data = await res.json();
        if (data.success) {
          paper.isRead = !paper.isRead;
          renderPapers();
          loadStats();
        }
      } catch (err) {
        console.error('Toggle read failed:', err);
      }
    }
    
    // 切换收藏
    async function toggleBookmark(event, id) {
      event.stopPropagation();
      const paper = papers.find(p => p.id === id);
      if (!paper) return;
      
      try {
        const res = await fetch(\`/api/papers/\${id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isBookmarked: !paper.isBookmarked })
        });
        
        const data = await res.json();
        if (data.success) {
          paper.isBookmarked = !paper.isBookmarked;
          renderPapers();
          loadStats();
        }
      } catch (err) {
        console.error('Toggle bookmark failed:', err);
      }
    }
    
    // 显示详情
    function showDetail(event, id) {
      event.stopPropagation();
      const paper = papers.find(p => p.id === id);
      if (!paper) return;
      
      const modal = document.getElementById('modal');
      const content = document.getElementById('modalContent');
      
      content.innerHTML = \`
        <div class="modal-title">\${escapeHtml(paper.title)}</div>
        
        <div class="modal-section">
          <div class="modal-section-title">AUTHORS</div>
          <div class="modal-text">\${paper.authors.join(', ')}</div>
        </div>
        
        <div class="modal-section">
          <div class="modal-section-title">ABSTRACT</div>
          <div class="modal-text">\${escapeHtml(paper.summary)}</div>
        </div>
        
        <div class="modal-section">
          <div class="modal-section-title">NLP ANALYSIS</div>
          <div class="modal-text">
            <strong>关键词:</strong> \${paper.nlp.keywords.map(k => k.word).join(', ')}<br>
            <strong>研究类型:</strong> \${paper.nlp.researchType.join(', ')}<br>
            <strong>热度指数:</strong> \${paper.nlp.hypeScore}/100<br>
            <strong>阅读时间:</strong> \${paper.nlp.readTime} 分钟
          </div>
        </div>
        
        <div class="modal-section">
          <div class="modal-section-title">CATEGORIES</div>
          <div class="modal-text">\${paper.categories.map(c => c.name).join(', ')}</div>
        </div>
        
        <div class="modal-links">
          <a href="\${paper.pdfUrl}" target="_blank" class="modal-link">📄 PDF</a>
          <a href="\${paper.absUrl}" target="_blank" class="modal-link">🔗 ARXIV</a>
        </div>
      \`;
      
      modal.classList.add('active');
    }
    
    // 关闭弹窗
    function closeModal(event) {
      if (event && event.target !== document.getElementById('modal')) return;
      document.getElementById('modal').classList.remove('active');
    }
    
    // 防 XSS
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`);
});

// 启动服务器
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║     NERV RESEARCH DIVISION - ArXiv Tracker v2.0          ║');
  console.log('║                                                          ║');
  console.log('║     📡 Server: http://localhost:' + PORT + '                    ║');
  console.log('║                                                          ║');
  console.log('║     API Endpoints:                                       ║');
  console.log('║     • POST /api/sync          - 同步 ArXiv 数据          ║');
  console.log('║     • GET  /api/papers        - 获取论文列表             ║');
  console.log('║     • GET  /api/papers/:id    - 获取单篇论文             ║');
  console.log('║     • PUT  /api/papers/:id    - 更新论文状态             ║');
  console.log('║     • DELETE /api/papers/:id  - 删除论文                 ║');
  console.log('║     • GET  /api/stats         - 获取统计数据             ║');
  console.log('║     • GET  /api/categories    - 获取分类列表             ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});
