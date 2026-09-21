// ==UserScript==
// @name         EhTag查询面板
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  查询e站Tag
// @author       https://t.me/BGG_Comics
// @match        *://*/*
// @icon         https://www.e-hentai.org/favicon.ico
// @license      GPL-3.0
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        unsafeWindow
// @run-at       document-start
// @downloadURL https://update.sleazyfork.org/scripts/596651/EhTag%E6%9F%A5%E8%AF%A2%E9%9D%A2%E6%9D%BF.user.js
// @updateURL https://update.sleazyfork.org/scripts/596651/EhTag%E6%9F%A5%E8%AF%A2%E9%9D%A2%E6%9D%BF.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ========== 配置区 ==========
    const CONFIG = {
        // Google Sheet CSV导出链接（改为你的ID）
        SHEET_URL: 'https://docs.google.com/spreadsheets/d/10At5Ij9DdMsD0Zw7XGW96kgwhvSni4d9/export?format=csv&gid=1022287136',
        // 缓存过期时间（毫秒）：24小时
        CACHE_EXPIRY: 24 * 60 * 60 * 1000,
        // 数据开始行号（从0计数，7代表第7行）
        DATA_START_ROW: 6,
        // 本地存储前缀
        STORAGE_PREFIX: 'tagPanel_',
        // 默认快捷键
        DEFAULT_HOTKEY: 'ctrl+shift+e'
    };

    // ========== 工具函数 ==========

    /**
     * HTML转义，防止XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 模糊匹配搜索（支持中英文）
     */
    function fuzzyMatch(query, text) {
        if (!query || !text) return false;
        const q = query.toLowerCase();
        const t = text.toLowerCase();

        // 完全匹配或包含匹配
        if (t === q || t.includes(q)) return true;

        // 逐字符匹配（模糊搜索）
        let qIndex = 0;
        for (let i = 0; i < t.length && qIndex < q.length; i++) {
            if (t[i] === q[qIndex]) qIndex++;
        }
        return qIndex === q.length;
    }

    /**
     * 获取本地存储的值
     */
    function getStorage(key) {
        try {
            return JSON.parse(GM_getValue(CONFIG.STORAGE_PREFIX + key, 'null'));
        } catch (e) {
            return null;
        }
    }

    /**
     * 保存到本地存储
     */
    function setStorage(key, value) {
        GM_setValue(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
    }

    /**
     * 删除本地存储
     */
    function deleteStorage(key) {
        GM_deleteValue(CONFIG.STORAGE_PREFIX + key);
    }

    /**
     * 解析CSV数据（简单版）
     */
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const data = [];

        for (let i = CONFIG.DATA_START_ROW; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // 简单CSV解析（处理双引号和逗号）
            const parts = [];
            let current = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const nextChar = line[j + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        j++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    parts.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current.trim());

            // 提取表格A列(英文)、B列(中文)、C列(描述)
            if (parts.length >= 3) {
                const tag = {
                    english: parts[0].replace(/^"|"$/g, ''),
                    chinese: parts[1].replace(/^"|"$/g, ''),
                    description: parts[2].replace(/^"|"$/g, '')
                };
                if (tag.english || tag.chinese) {
                    data.push(tag);
                }
            }
        }

        return data;
    }

    // ========== 数据管理模块 ==========
    const DataManager = {
        /**
         * 获取数据
         */
        fetchData: async function() {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: CONFIG.SHEET_URL,
                    onload: function(response) {
                        if (response.status === 200) {
                            const data = parseCSV(response.responseText);
                            resolve(data);
                        } else {
                            reject(new Error('获取数据失败: ' + response.status));
                        }
                    },
                    onerror: function(error) {
                        reject(new Error('网络错误: ' + error));
                    }
                });
            });
        },

        /**
         * 获取缓存的数据
         */
        getCache: function() {
            const cache = getStorage('cache');
            if (!cache) return null;

            // 检查缓存是否过期
            if (Date.now() - cache.timestamp > CONFIG.CACHE_EXPIRY) {
                this.clearCache();
                return null;
            }

            return cache.data;
        },

        /**
         * 保存数据到缓存
         */
        setCache: function(data) {
            setStorage('cache', {
                data: data,
                timestamp: Date.now()
            });
        },

        /**
         * 清除缓存
         */
        clearCache: function() {
            deleteStorage('cache');
        },

        /**
         * 智能加载数据（优先使用缓存）
         */
        loadData: async function() {
            // 先尝试获取缓存
            let data = this.getCache();
            if (data && data.length > 0) {
                console.log('使用缓存数据');
                return data;
            }

            // 缓存不存在，从网络获取
            console.log('从网络获取数据...');
            data = await this.fetchData();
            this.setCache(data);
            return data;
        }
    };

    // ========== UI管理模块 ==========
    const UIManager = {
        isVisible: true,
        currentTab: 'search',
        allData: [],
        filteredData: [],

        /**
         * 初始化UI界面
         */
        init: function() {
            this.createStyles();
            this.createPanel();
            this.bindEvents();
            console.log('UI初始化完成');
        },

        /**
         * 创建样式
         */
        createStyles: function() {
            if (document.getElementById('tagPanel-styles')) return;

            const style = document.createElement('style');
            style.id = 'tagPanel-styles';
            style.textContent = `
                /* ===== 启动按钮 ===== */
                .tagPanel-launch-btn {
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border: 3px solid #FFD700;
                    color: #000;
                    font-weight: bold;
                    font-size: 24px;
                    cursor: pointer;
                    z-index: 9998;
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8),
                                0 0 40px rgba(255, 165, 0, 0.4);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tagPanel-launch-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 0 30px rgba(255, 215, 0, 1),
                                0 0 60px rgba(255, 165, 0, 0.6);
                }

                .tagPanel-launch-btn:active {
                    transform: scale(0.95);
                }

                /* ===== 主面板容器 ===== */
                .tagPanel-container {
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    width: 500px;
                    height: 600px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 2px solid #FFD700;
                    border-radius: 10px;
                    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5),
                                0 0 60px rgba(0, 0, 0, 0.8),
                                inset 0 0 20px rgba(255, 215, 0, 0.1);
                    color: #e0e0e0;
                    font-family: 'Arial', 'Microsoft YaHei', sans-serif;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: panelSlideIn 0.3s ease;
                }

                @keyframes panelSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* ===== 标题栏 ===== */
                .tagPanel-header {
                    background: linear-gradient(90deg, #0f3460 0%, #16213e 100%);
                    border-bottom: 2px solid #FFD700;
                    padding: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }

                .tagPanel-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #FFD700;
                    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                    margin: 0;
                }

                .tagPanel-close-btn {
                    background: none;
                    border: none;
                    color: #FFD700;
                    font-size: 24px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tagPanel-close-btn:hover {
                    transform: scale(1.2);
                    text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
                }

                /* ===== 标签页 ===== */
                .tagPanel-tabs {
                    display: flex;
                    background: #0f3460;
                    border-bottom: 1px solid #FFD700;
                    flex-shrink: 0;
                }

                .tagPanel-tab {
                    flex: 1;
                    padding: 10px;
                    background: none;
                    border: none;
                    color: #a0a0a0;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: bold;
                    border-bottom: 3px solid transparent;
                }

                .tagPanel-tab.active {
                    color: #FFD700;
                    border-bottom-color: #FFD700;
                    box-shadow: inset 0 -5px 15px rgba(255, 215, 0, 0.2);
                }

                .tagPanel-tab:hover {
                    color: #FFD700;
                }

                /* ===== 内容区 ===== */
                .tagPanel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    display: none;
                    overflow-x: hidden;
                }

                .tagPanel-content.active {
                    display: flex;
                    flex-direction: column;
                }

                /* ===== 搜索框 ===== */
                .tagPanel-search-input {
                    width: 100%;
                    padding: 10px;
                    background: #0f3460;
                    border: 1px solid #FFD700;
                    border-radius: 5px;
                    color: #e0e0e0;
                    margin-bottom: 15px;
                    box-sizing: border-box;
                    font-size: 14px;
                }

                .tagPanel-search-input::placeholder {
                    color: #666;
                }

                .tagPanel-search-input:focus {
                    outline: none;
                    background: #0f3460;
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                    border-color: #FFD700;
                }

                /* ===== 标签列表 ===== */
                .tagPanel-tags-list {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    overflow-x: hidden;
                    gap: 10px;
                    padding-right: 12px;
                    margin-top: 12px;
                }

                .tagPanel-tag-item {
                    background: linear-gradient(135deg, #0f3460, #1a1a2e);
                    border: 1px solid #FFD700;
                    border-radius: 5px;
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-left: 4px solid transparent;
                }

                .tagPanel-tag-item:hover {
                    background: linear-gradient(135deg, #16213e, #0f3460);
                    border-left-color: #FFD700;
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
                    transform: translateX(5px);
                }

                .tagPanel-tag-english {
                    color: #FFD700;
                    font-weight: bold;
                    font-size: 14px;
                }

                .tagPanel-tag-chinese {
                    color: #e0e0e0;
                    font-size: 13px;
                    margin-top: 5px;
                }

                .tagPanel-tag-description {
                    color: #a0a0a0;
                    font-size: 12px;
                    margin-top: 5px;
                    font-style: italic;
                }

                /* ===== 设置组 ===== */
                .tagPanel-settings-group {
                    margin-bottom: 15px;
                    padding-bottom: 15px;
                    overflow: hidden;
                    border-bottom: 1px solid #FFD700;
                }

                .tagPanel-settings-group:last-child {
                    border-bottom: none;
                }

                .tagPanel-settings-label {
                    color: #FFD700;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 10px;
                    display: block;
                }

                .tagPanel-settings-btn {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border: 1px solid #FFD700;
                    color: #000;
                    padding: 8px 12px;
                    margin-right: 8px;
                    margin-bottom: 5px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.2s;
                    font-size: 12px;
                }

                .tagPanel-settings-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                }

                .tagPanel-settings-btn:active {
                    transform: translateY(0);
                }

                .tagPanel-settings-btn.secondary {
                    background: #0f3460;
                    color: #FFD700;
                    border: 1px solid #FFD700;
                }

                .tagPanel-settings-btn.secondary:hover {
                    background: #16213e;
                }

                /* ===== 文件输入 ===== */
                .tagPanel-file-input {
                    display: none;
                }

                /* ===== 消息提示 ===== */
                .tagPanel-message {
                    background: rgba(255, 215, 0, 0.1);
                    border: 1px solid #FFD700;
                    color: #FFD700;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 10px;
                    font-size: 12px;
                    text-align: center;
                    animation: messageSlideIn 0.3s ease;
                }

                @keyframes messageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* ===== 滚动条美化 ===== */
                .tagPanel-tags-list::-webkit-scrollbar,
                .tagPanel-content::-webkit-scrollbar {
                    width: 8px;
                }

                .tagPanel-tags-list::-webkit-scrollbar-track,
                .tagPanel-content::-webkit-scrollbar-track {
                    background: #0f3460;
                }

                .tagPanel-tags-list::-webkit-scrollbar-thumb,
                .tagPanel-content::-webkit-scrollbar-thumb {
                    background: #FFD700;
                    border-radius: 4px;
                }

                .tagPanel-tags-list::-webkit-scrollbar-thumb:hover,
                .tagPanel-content::-webkit-scrollbar-thumb:hover {
                    background: #FFA500;
                }

                /* ===== 快捷键输入框 ===== */
                .tagPanel-hotkey-input {
                    width: 100%;
                    padding: 8px;
                    background: #0f3460;
                    border: 1px solid #FFD700;
                    border-radius: 5px;
                    color: #FFD700;
                    margin-top: 5px;
                    box-sizing: border-box;
                }

                .tagPanel-hotkey-input:focus {
                    outline: none;
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                }

                /* ===== 数据集列表 ===== */
                .tagPanel-dataset-item {
                    background: #0f3460;
                    border: 1px solid #FFD700;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .tagPanel-dataset-name {
                    color: #FFD700;
                    font-weight: bold;
                    flex: 1;
                }

                .tagPanel-dataset-delete-btn {
                    background: #8b0000;
                    color: #fff;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .tagPanel-dataset-delete-btn:hover {
                    background: #a00000;
                }

                /* ===== 手机适配（768px 以下）===== */
                @media (max-width: 768px) {
                    /* 启动按钮移到底部中央 */
                    .tagPanel-launch-btn {
                        bottom: 20px;
                        top: auto;
                        right: 50%;
                        transform: translateX(50%);
                        width: 50px;
                        height: 50px;
                        font-size: 20px;
                    }

                    .tagPanel-launch-btn:hover {
                        transform: translateX(50%) scale(1.05);
                    }

                    /* 主面板全屏或接近全屏 */
                    .tagPanel-container {
                        bottom: 70px !important;
                        right: auto !important;
                        left: 10px !important;
                        width: calc(100% - 20px) !important;
                        max-height: calc(100vh - 100px) !important;
                        max-width: none;
                        border-radius: 8px;
                    }

                    /* 标题栏缩小 */
                    .tagPanel-title {
                        font-size: 16px;
                    }

                    .tagPanel-close-btn {
                        font-size: 20px;
                    }

                    /* 标签页字体缩小 */
                    .tagPanel-tab {
                        padding: 8px 5px;
                        font-size: 12px;
                    }

                    /* 搜索框优化 */
                    .tagPanel-search-input {
                        font-size: 16px;
                        padding: 12px;
                        margin-bottom: 12px;
                    }

                    /* 内容区内边距优化 */
                    .tagPanel-content {
                        padding: 12px;
                    }

                    /* 标签项目卡片优化 */
                    .tagPanel-tag-item {
                        padding: 12px;
                        min-height: 50px;
                        border-radius: 8px;
                    }

                    .tagPanel-tag-english {
                        font-size: 16px;
                    }

                    .tagPanel-tag-chinese {
                        font-size: 14px;
                        margin-top: 6px;
                    }

                    .tagPanel-tag-description {
                        font-size: 12px;
                        margin-top: 6px;
                    }

                    /* 按钮触摸友好 */
                    .tagPanel-settings-btn {
                        min-height: 44px;
                        padding: 12px 16px;
                        font-size: 13px;
                        margin-right: 0;
                        margin-bottom: 8px;
                        width: 100%;
                        box-sizing: border-box;
                    }

                    .tagPanel-settings-btn:not(.secondary) {
                        width: 100%;
                    }

                    /* 标签列表间距 */
                    .tagPanel-tags-list {
                        gap: 8px;
                        padding-right: 8px;
                    }

                    /* 隐藏 hover 效果，改用 active 状态 */
                    @media (hover: none) {
                        .tagPanel-tag-item:hover {
                            transform: none;
                            box-shadow: none;
                            border-left-color: #FFD700;
                        }

                        .tagPanel-tag-item:active {
                            background: linear-gradient(135deg, #FFD700, #FFA500);
                            color: #000;
                        }

                        .tagPanel-tag-item:active .tagPanel-tag-english {
                            color: #000;
                        }

                        .tagPanel-tag-item:active .tagPanel-tag-chinese {
                            color: #000;
                        }

                        .tagPanel-settings-btn:hover {
                            transform: none;
                        }

                        .tagPanel-settings-btn:active {
                            opacity: 0.8;
                        }
                    }

                    /* 数据集项目优化 */
                    .tagPanel-dataset-item {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .tagPanel-dataset-delete-btn {
                        width: 100%;
                        margin-top: 8px;
                    }

                    /* 设置组优化 */
                    .tagPanel-settings-group {
                        margin-bottom: 12px;
                        padding-bottom: 12px;
                    }

                    .tagPanel-settings-label {
                        font-size: 13px;
                        margin-bottom: 8px;
                    }

                    /* 快捷键输入框 */
                    .tagPanel-hotkey-input {
                        font-size: 16px;
                        padding: 12px;
                    }

                    /* 消息提示 */
                    .tagPanel-message {
                        font-size: 13px;
                        padding: 12px;
                    }
                }

                /* ===== 超小屏幕（< 480px）===== */
                @media (max-width: 480px) {
                    .tagPanel-container {
                        bottom: 70px !important;
                        left: 5px !important;
                        width: calc(100% - 10px) !important;
                    }

                    .tagPanel-title {
                        font-size: 14px;
                    }

                    .tagPanel-close-btn {
                        font-size: 18px;
                    }

                    .tagPanel-tab {
                        font-size: 10px;
                        padding: 6px 4px;
                    }

                    .tagPanel-launch-btn {
                        width: 45px;
                        height: 45px;
                        font-size: 18px;
                    }

                    .tagPanel-tag-english {
                        font-size: 14px;
                    }

                    .tagPanel-content {
                        padding: 10px;
                    }

                    .tagPanel-search-input {
                        font-size: 16px;
                        padding: 10px;
                        margin-bottom: 10px;
                    }

                    .tagPanel-settings-btn {
                        padding: 10px 12px;
                        font-size: 12px;
                        min-height: 40px;
                    }
                }

                /* ===== 触摸友好设置 ===== */
                .tagPanel-launch-btn,
                .tagPanel-tab,
                .tagPanel-settings-btn,
                .tagPanel-close-btn,
                .tagPanel-tag-item {
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }

                /* ===== 流畅滚动 ===== */
                .tagPanel-tags-list,
                .tagPanel-content {
                    -webkit-overflow-scrolling: touch;
                }
            `;
            document.head.appendChild(style);
        },


        /**
         * 创建主面板HTML
         */
        createPanel: function() {
            if (document.querySelector('.tagPanel-container')) return;

            // 创建启动按钮
            const launchBtn = document.createElement('button');
            launchBtn.className = 'tagPanel-launch-btn';
            launchBtn.id = 'tagPanel-launch-btn';
            launchBtn.textContent = '🏷️';
            launchBtn.title = '点击打开Eh标签查询面板 (快捷键: ' + (getStorage('hotkey') || CONFIG.DEFAULT_HOTKEY) + ')';
            document.body.appendChild(launchBtn);

            // 创建主面板
            const container = document.createElement('div');
            container.className = 'tagPanel-container';
            container.id = 'tagPanel-container';

            container.innerHTML = `
                <!-- 标题栏 -->
                <div class="tagPanel-header">
                    <h2 class="tagPanel-title">🏷️ Eh标签查询面板</h2>
                    <button class="tagPanel-close-btn" id="tagPanel-close-btn">✕</button>
                </div>

                <!-- 标签页切换 -->
                <div class="tagPanel-tabs">
                    <button class="tagPanel-tab active" data-tab="search">🔍 查询</button>
                    <button class="tagPanel-tab" data-tab="storage">💾 存储</button>
                    <button class="tagPanel-tab" data-tab="settings">⚙️ 设置</button>
                </div>

                <!-- 查询标签页 -->
                <div class="tagPanel-content active" data-tab="search">
                    <input type="text" class="tagPanel-search-input" id="tagPanel-search" placeholder="搜索英文/中文...">
                    <div class="tagPanel-tags-list" id="tagPanel-tags-list"></div>
                </div>

                <!-- 存储标签页 -->
                <div class="tagPanel-content" data-tab="storage">
                    <div class="tagPanel-settings-group">
                        <label class="tagPanel-settings-label">📥 导入数据</label>
                        <button class="tagPanel-settings-btn" id="tagPanel-import-json-btn">导入 JSON</button>
                        <button class="tagPanel-settings-btn" id="tagPanel-import-csv-btn">导入 CSV</button>
                        <input type="file" id="tagPanel-file-input" class="tagPanel-file-input" accept=".json,.csv">
                    </div>

                    <div class="tagPanel-settings-group">
                        <label class="tagPanel-settings-label">📤 导出数据</label>
                        <button class="tagPanel-settings-btn" id="tagPanel-export-json-btn">导出 JSON</button>
                        <button class="tagPanel-settings-btn" id="tagPanel-export-csv-btn">导出 CSV</button>
                    </div>

                    <div class="tagPanel-settings-group">
                        <label class="tagPanel-settings-label">💾 本地数据集</label>
                        <div id="tagPanel-datasets-list"></div>
                        <button class="tagPanel-settings-btn secondary" id="tagPanel-save-dataset-btn">保存当前数据为数据集</button>
                    </div>
                </div>

                <!-- 设置标签页 -->
                <div class="tagPanel-content" data-tab="settings">
                    <div class="tagPanel-settings-group">
                        <label class="tagPanel-settings-label">🔄 缓存管理</label>
                        <button class="tagPanel-settings-btn" id="tagPanel-refresh-cache-btn">刷新缓存</button>
                        <button class="tagPanel-settings-btn secondary" id="tagPanel-clear-cache-btn">清除缓存</button>
                    </div>

                    <div class="tagPanel-settings-group">
                        <label class="tagPanel-settings-label">🎮 快捷键设置</label>
                        <input type="text" class="tagPanel-hotkey-input" id="tagPanel-hotkey-input" placeholder="例: ctrl+shift+t">
                        <button class="tagPanel-settings-btn" id="tagPanel-save-hotkey-btn" style="margin-top: 8px; width: 100%; box-sizing: border-box;">保存快捷键</button>
                    </div>

                    <div class="tagPanel-settings-group">
                        <label class="tagPanel-settings-label">👁️ 显示设置</label>
                        <button class="tagPanel-settings-btn secondary" id="tagPanel-toggle-launch-btn">隐藏启动按钮</button>
                    </div>

                    <div class="tagPanel-settings-group">
                        <label class="tagPanel-settings-label">ℹ️ 信息</label>
                        <div id="tagPanel-info" style="color: #a0a0a0; font-size: 12px; line-height: 1.6;"></div>
                    </div>
                </div>
            `;

            document.body.appendChild(container);

            // 初始化信息显示
            this.updateInfo();
        },

        /**
         * 绑定事件
         */
        bindEvents: function() {
            // 启动按钮
            document.getElementById('tagPanel-launch-btn').addEventListener('click', () => {
                this.togglePanel();
            });

            // 关闭按钮
            document.getElementById('tagPanel-close-btn').addEventListener('click', () => {
                this.closePanel();
            });

            // 标签页切换
            document.querySelectorAll('.tagPanel-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.switchTab(e.target.dataset.tab);
                });
            });

            // 搜索输入
            document.getElementById('tagPanel-search').addEventListener('input', (e) => {
                this.filterTags(e.target.value);
            });

            // 导入按钮
            document.getElementById('tagPanel-import-json-btn').addEventListener('click', () => {
                const input = document.getElementById('tagPanel-file-input');
                input.accept = '.json';
                input.dataset.type = 'json';
                input.click();
            });

            document.getElementById('tagPanel-import-csv-btn').addEventListener('click', () => {
                const input = document.getElementById('tagPanel-file-input');
                input.accept = '.csv';
                input.dataset.type = 'csv';
                input.click();
            });

            // 文件输入处理
            document.getElementById('tagPanel-file-input').addEventListener('change', (e) => {
                this.handleFileImport(e);
            });

            // 导出按钮
            document.getElementById('tagPanel-export-json-btn').addEventListener('click', () => {
                this.exportData('json');
            });

            document.getElementById('tagPanel-export-csv-btn').addEventListener('click', () => {
                this.exportData('csv');
            });

            // 缓存管理
            document.getElementById('tagPanel-refresh-cache-btn').addEventListener('click', () => {
                this.refreshCache();
            });

            document.getElementById('tagPanel-clear-cache-btn').addEventListener('click', () => {
                this.clearCache();
            });

            // 快捷键设置
            document.getElementById('tagPanel-save-hotkey-btn').addEventListener('click', () => {
                this.saveHotkey();
            });

            document.getElementById('tagPanel-hotkey-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.saveHotkey();
                }
            });

            // 显示/隐藏启动按钮
            document.getElementById('tagPanel-toggle-launch-btn').addEventListener('click', () => {
                this.toggleLaunchBtn();
            });

            // 保存数据集
            document.getElementById('tagPanel-save-dataset-btn').addEventListener('click', () => {
                this.saveDataset();
            });
        },

        /**
         * 加载并显示标签
         */
        loadTags: async function() {
            try {
                // 显示加载状态
                const tagsList = document.getElementById('tagPanel-tags-list');
                tagsList.innerHTML = '<div class="tagPanel-message">加载中...</div>';

                // 加载数据
                this.allData = await DataManager.loadData();
                this.filteredData = this.allData;

                // 渲染标签
                this.renderTags();
            } catch (error) {
                console.error('加载标签失败:', error);
                document.getElementById('tagPanel-tags-list').innerHTML =
                    '<div class="tagPanel-message">加载失败: ' + error.message + '</div>';
            }
        },

        /**
         * 渲染标签列表
         */
        renderTags: function() {
            const tagsList = document.getElementById('tagPanel-tags-list');

            if (this.filteredData.length === 0) {
                tagsList.innerHTML = '<div class="tagPanel-message">未找到匹配的标签</div>';
                return;
            }

            tagsList.innerHTML = this.filteredData.map(tag => `
                <div class="tagPanel-tag-item">
                    <div class="tagPanel-tag-english">${escapeHtml(tag.english)}</div>
                    <div class="tagPanel-tag-chinese">${escapeHtml(tag.chinese)}</div>
                    <div class="tagPanel-tag-description">${escapeHtml(tag.description)}</div>
                </div>
            `).join('');
        },

        /**
         * 过滤标签
         */
        filterTags: function(query) {
            if (!query.trim()) {
                this.filteredData = this.allData;
            } else {
                const q = query.toLowerCase();

                // 先过滤
                this.filteredData = this.allData.filter(tag =>
                    fuzzyMatch(q, tag.english) ||
                    fuzzyMatch(q, tag.chinese)
                );

                // 再排序
                this.filteredData.sort((a, b) => {
                    // 1. 完全匹配
                    const aEngComplete = a.english.toLowerCase() === q;
                    const bEngComplete = b.english.toLowerCase() === q;
                    const aChiComplete = a.chinese === q;
                    const bChiComplete = b.chinese === q;

                    if (aEngComplete && !bEngComplete) return -1;
                    if (bEngComplete && !aEngComplete) return 1;
                    if (aChiComplete && !bChiComplete) return -1;
                    if (bChiComplete && !aChiComplete) return 1;

                    // 2. 包含匹配
                    const aEngIncludes = a.english.toLowerCase().includes(q);
                    const bEngIncludes = b.english.toLowerCase().includes(q);
                    const aChiIncludes = a.chinese.includes(q);
                    const bChiIncludes = b.chinese.includes(q);

                    if (aEngIncludes && !bEngIncludes) return -1;
                    if (bEngIncludes && !aEngIncludes) return 1;
                    if (aChiIncludes && !bChiIncludes) return -1;
                    if (bChiIncludes && !aChiIncludes) return 1;

                    // 3. 位置靠前优先
                    const aEngIndex = a.english.toLowerCase().indexOf(q);
                    const bEngIndex = b.english.toLowerCase().indexOf(q);
                    const aChiIndex = a.chinese.indexOf(q);
                    const bChiIndex = b.chinese.indexOf(q);

                    const aMinIndex = Math.min(
                        aEngIndex >= 0 ? aEngIndex : Infinity,
                        aChiIndex >= 0 ? aChiIndex : Infinity
                    );
                    const bMinIndex = Math.min(
                        bEngIndex >= 0 ? bEngIndex : Infinity,
                        bChiIndex >= 0 ? bChiIndex : Infinity
                    );

                    return aMinIndex - bMinIndex;
                });
            }
            this.renderTags();
        },

        /**
         * 切换标签页
         */
        switchTab: function(tabName) {
            // 更新按钮样式
            document.querySelectorAll('.tagPanel-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

            // 更新内容显示
            document.querySelectorAll('.tagPanel-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelector(`.tagPanel-content[data-tab="${tabName}"]`).classList.add('active');

            // 切换到设置标签页时，更新信息和快捷键输入框
            if (tabName === 'settings') {
                document.getElementById('tagPanel-hotkey-input').value = getStorage('hotkey') || CONFIG.DEFAULT_HOTKEY;
                this.updateInfo();
            }

            // 切换到存储标签页时，更新数据集列表
            if (tabName === 'storage') {
                this.updateDatasetsList();
            }
        },

        /**
         * 切换面板显示/隐藏
         */
        togglePanel: function() {
            const container = document.getElementById('tagPanel-container');
            if (container.style.display === 'none') {
                this.openPanel();
            } else {
                this.closePanel();
            }
        },

        /**
         * 打开面板
         */
        openPanel: function() {
            const container = document.getElementById('tagPanel-container');
            container.style.display = 'flex';

            // 如果还没有加载数据，加载数据
            if (this.allData.length === 0) {
                this.loadTags();
            }
        },

        /**
         * 关闭面板
         */
        closePanel: function() {
            document.getElementById('tagPanel-container').style.display = 'none';
        },

        /**
         * 处理文件导入
         */
        handleFileImport: async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const fileType = document.getElementById('tagPanel-file-input').dataset.type;
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    let data = [];

                    if (fileType === 'json') {
                        // JSON格式导入
                        data = JSON.parse(event.target.result);
                        if (!Array.isArray(data)) {
                            throw new Error('JSON数据必须是数组格式');
                        }
                    } else if (fileType === 'csv') {
                        // CSV格式导入
                        data = parseCSV(event.target.result);
                    }

                    // 验证数据格式
                    if (data.length === 0) {
                        this.showMessage('⚠️ 导入失败：数据为空');
                        return;
                    }

                    // 检查数据结构
                    const firstItem = data[0];
                    if (!firstItem.english && !firstItem.chinese) {
                        throw new Error('数据格式错误：缺少必需字段(english/chinese)');
                    }

                    // 替换当前数据
                    this.allData = data;
                    this.filteredData = data;
                    DataManager.setCache(data);

                    this.renderTags();
                    this.showMessage('✅ 导入成功: ' + data.length + ' 条记录');
                } catch (error) {
                    this.showMessage('❌ 导入失败: ' + error.message);
                    console.error('导入错误:', error);
                }
            };

            reader.readAsText(file);

            // 重置文件输入
            e.target.value = '';
        },

        /**
         * 导出数据
         */
        exportData: function(format) {
            const data = this.allData.length > 0 ? this.allData : [];

            if (data.length === 0) {
                this.showMessage('⚠️ 没有数据可导出');
                return;
            }

            let content, filename, mimeType;

            if (format === 'json') {
                // 导出为JSON
                content = JSON.stringify(data, null, 2);
                filename = 'tags-' + new Date().toISOString().split('T')[0] + '.json';
                mimeType = 'application/json';
            } else if (format === 'csv') {
                // 导出为CSV
                const headers = ['English', 'Chinese', 'Description'];
                const rows = data.map(tag => [
                    '"' + (tag.english || '').replace(/"/g, '""') + '"',
                    '"' + (tag.chinese || '').replace(/"/g, '""') + '"',
                    '"' + (tag.description || '').replace(/"/g, '""') + '"'
                ]);
                content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                filename = 'tags-' + new Date().toISOString().split('T')[0] + '.csv';
                mimeType = 'text/csv;charset=utf-8';
            }

            // 创建Blob并下载
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showMessage('✅ 导出成功: ' + filename);
        },

        /**
         * 刷新缓存
         */
        refreshCache: async function() {
            try {
                document.getElementById('tagPanel-tags-list').innerHTML = '<div class="tagPanel-message">刷新中...</div>';
                DataManager.clearCache();
                this.allData = await DataManager.fetchData();
                DataManager.setCache(this.allData);
                this.filteredData = this.allData;
                this.renderTags();
                this.showMessage('✅ 缓存已刷新');
            } catch (error) {
                this.showMessage('❌ 刷新失败: ' + error.message);
                console.error('刷新错误:', error);
            }
        },

        /**
         * 清除缓存
         */
        clearCache: function() {
            DataManager.clearCache();
            this.allData = [];
            this.filteredData = [];
            document.getElementById('tagPanel-tags-list').innerHTML = '<div class="tagPanel-message">缓存已清除</div>';
            this.showMessage('✅ 缓存已清除');
        },

        /**
         * 保存快捷键
         */
        saveHotkey: function() {
            const hotkeyInput = document.getElementById('tagPanel-hotkey-input').value.trim();

            if (!hotkeyInput) {
                this.showMessage('⚠️ 快捷键不能为空');
                return;
            }

            setStorage('hotkey', hotkeyInput);
            document.getElementById('tagPanel-launch-btn').title = '点击打开Eh标签查询面板 (快捷键: ' + hotkeyInput + ')';
            this.showMessage('✅ 快捷键已保存: ' + hotkeyInput);

            // 重新绑定快捷键
            HotkeyManager.unbind();
            HotkeyManager.bind(hotkeyInput);
        },

        /**
         * 隐藏/显示启动按钮
         */
        toggleLaunchBtn: function() {
            const launchBtn = document.getElementById('tagPanel-launch-btn');
            const isHidden = getStorage('launchBtnHidden');

            if (isHidden) {
                // 显示按钮
                launchBtn.style.display = 'flex';
                setStorage('launchBtnHidden', false);
                this.showMessage('✅ 启动按钮已显示');
            } else {
                // 隐藏按钮
                launchBtn.style.display = 'none';
                setStorage('launchBtnHidden', true);
                this.showMessage('✅ 启动按钮已隐藏');
            }
        },

        /**
         * 保存当前数据为数据集
         */
        saveDataset: function() {
            if (this.allData.length === 0) {
                this.showMessage('⚠️ 没有数据可保存');
                return;
            }

            const timestamp = new Date().toLocaleString('zh-CN');
            const datasetName = 'dataset_' + Date.now();

            const datasets = getStorage('datasets') || {};
            datasets[datasetName] = {
                name: '数据集 ' + timestamp,
                data: this.allData,
                timestamp: Date.now()
            };

            setStorage('datasets', datasets);
            this.updateDatasetsList();
            this.showMessage('✅ 数据集已保存');
        },

        /**
         * 更新数据集列表
         */
        updateDatasetsList: function() {
            const datasets = getStorage('datasets') || {};
            const listContainer = document.getElementById('tagPanel-datasets-list');

            if (Object.keys(datasets).length === 0) {
                listContainer.innerHTML = '<div style="color: #a0a0a0; text-align: center; padding: 10px;">还没有保存的数据集</div>';
                return;
            }

            let html = '';
            for (const [key, dataset] of Object.entries(datasets)) {
                html += `
                    <div class="tagPanel-dataset-item">
                        <div>
                            <div class="tagPanel-dataset-name">${escapeHtml(dataset.name)}</div>
                            <div style="color: #666; font-size: 11px; margin-top: 3px;">${dataset.data.length} 条记录</div>
                        </div>
                        <button class="tagPanel-dataset-delete-btn" data-key="${key}">删除</button>
                    </div>
                `;
            }

            listContainer.innerHTML = html;

            // 绑定删除按钮事件
            listContainer.querySelectorAll('.tagPanel-dataset-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.deleteDataset(e.target.dataset.key);
                });
            });
        },

        /**
         * 删除数据集
         */
        deleteDataset: function(key) {
            if (!confirm('确定要删除这个数据集吗？')) return;

            const datasets = getStorage('datasets') || {};
            delete datasets[key];
            setStorage('datasets', datasets);
            this.updateDatasetsList();
            this.showMessage('✅ 数据集已删除');
        },

        /**
         * 显示消息提示
         */
        showMessage: function(message) {
            // 移除旧消息
            const oldMsg = document.querySelector('.tagPanel-message');
            if (oldMsg && oldMsg.parentElement.id !== 'tagPanel-tags-list') {
                oldMsg.remove();
            }

            // 在最上方显示消息
            const content = document.querySelector('.tagPanel-content.active');
            if (content) {
                const msg = document.createElement('div');
                msg.className = 'tagPanel-message';
                msg.textContent = message;
                content.insertBefore(msg, content.firstChild);

                // 3秒后移除消息
                setTimeout(() => {
                    msg.remove();
                }, 3000);
            }
        },

        /**
         * 更新设置信息显示
         */
        updateInfo: function() {
            const infoDiv = document.getElementById('tagPanel-info');
            if (!infoDiv) return;

            const dataCount = this.allData.length || '未加载';

            infoDiv.innerHTML = `
                <p>📊 当前数据条数: <strong>${dataCount}</strong></p>
                <p>🔑 快捷键: <strong>${getStorage('hotkey') || CONFIG.DEFAULT_HOTKEY}</strong></p>
                <p>✨ 当前版本: <strong>1.2</strong></p>
                <p>😍 作者频道: <a href="https://t.me/BGG_Comics" target="_blank"><strong>【BGG】本子！都是本子！❤️</strong></a></p>
            `;
        }
    };

    // ========== 快捷键管理模块 ==========
    const HotkeyManager = {
        currentHotkey: null,

        /**
         * 初始化快捷键
         */
        init: function() {
            const hotkey = getStorage('hotkey') || CONFIG.DEFAULT_HOTKEY;
            this.bind(hotkey);
        },

        /**
         * 绑定快捷键
         */
        bind: function(hotkeyStr) {
            this.unbind();
            this.currentHotkey = hotkeyStr;

            document.addEventListener('keydown', this.handleKeydown.bind(this));
            console.log('快捷键已绑定:', hotkeyStr);
        },

        /**
         * 解除快捷键绑定
         */
        unbind: function() {
            if (this.currentHotkey) {
                document.removeEventListener('keydown', this.handleKeydown.bind(this));
                console.log('快捷键已解除:', this.currentHotkey);
            }
        },

        /**
         * 处理按键事件
         */
        handleKeydown: function(e) {
            if (!this.currentHotkey) return;

            const hotkeyParts = this.currentHotkey.toLowerCase().split('+');
            const isCtrl = hotkeyParts.includes('ctrl') && (e.ctrlKey || e.metaKey);
            const isShift = hotkeyParts.includes('shift') && e.shiftKey;
            const isAlt = hotkeyParts.includes('alt') && e.altKey;

            // 获取主键（最后一个部分）
            const mainKey = hotkeyParts[hotkeyParts.length - 1].toLowerCase();
            const pressedKey = e.key.toLowerCase();

            // 比对主键
            const mainKeyMatch = mainKey === pressedKey ||
                                mainKey === e.code.toLowerCase() ||
                                this.getKeyName(e) === mainKey;

            if (mainKeyMatch && isCtrl && isShift) {
                e.preventDefault();
                UIManager.togglePanel();
            }
        },

        /**
         * 获取按键名称
         */
        getKeyName: function(e) {
            const keyMap = {
                'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e', 'f': 'f', 'g': 'g',
                'h': 'h', 'i': 'i', 'j': 'j', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
                'o': 'o', 'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't', 'u': 'u',
                'v': 'v', 'w': 'w', 'x': 'x', 'y': 'y', 'z': 'z'
            };
            return keyMap[e.key.toLowerCase()] || e.key.toLowerCase();
        }
    };

    // ========== 初始化脚本 ==========
    function initScript() {
        console.log('脚本初始化开始...');

        // 初始化UI
        UIManager.init();

        // 初始化快捷键
        HotkeyManager.init();

        // 恢复按钮显示状态
        const isLaunchBtnHidden = getStorage('launchBtnHidden');
        if (isLaunchBtnHidden) {
            document.getElementById('tagPanel-launch-btn').style.display = 'none';
        }

        // 面板默认隐藏
        document.getElementById('tagPanel-container').style.display = 'none';

        console.log('脚本初始化完成！');
        console.log('快捷键:', getStorage('hotkey') || CONFIG.DEFAULT_HOTKEY);
        console.log('点击按钮或使用快捷键打开面板');
    }

    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }

})();
