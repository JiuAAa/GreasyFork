// ==UserScript==
// @name         EhTag数据库面板
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从EhTagTranslation数据库查询标签，支持分类浏览、搜索、本地存储
// @author       https://t.me/BGG_Comics
// @match        https://exhentai.org/*
// @match        https://e-hentai.org/*
// @license      GPL-3.0
// @icon         https://www.e-hentai.org/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      raw.githubusercontent.com
// @supportURL   https://github.com/EhTagTranslation/Database
// ==/UserScript==

(function() {
    'use strict';

    // ========== 配置与常量 ==========
    const CONFIG = {
        DB_BASE_URL: 'https://raw.githubusercontent.com/EhTagTranslation/Database/master/database',
        CACHE_DURATION: 24 * 60 * 60 * 1000,  // 24 小时
        SHORTCUTS: {
            TOGGLE: 'Ctrl+Shift+E',
            CLOSE: 'Escape'
        }
    };

    const STORAGE_KEYS = {
        LOCAL_DB: 'ehtag_database_local',
        CACHE_DB: 'ehtag_database_cache',
        CACHE_TIME: 'ehtag_cache_time',
        USE_LOCAL: 'ehtag_use_local'
    };

    // ========== 全局状态 ==========
    let appState = {
        database: null,           // { rows: [...], tags: { category: [...] } }
        currentView: 'main',      // 'main' | 'categories' | 'search' | 'settings'
        currentCategory: null,
        searchResults: [],
        useLocalStorage: false
    };

    // ========== UI 样式 ==========
    const STYLES = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        #ehtag-panel {
            position: fixed;
            right: 100px;
            top: 25%;
            transform: none;
            z-index: 10000;
            width: 500px;
            max-height: 600px;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #333;
            overflow: hidden;
            display: none;
            flex-direction: column;
        }

        #ehtag-panel.show {
            display: flex;
        }

        #ehtag-panel-header {
            padding: 12px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 16px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #ehtag-panel-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #ehtag-panel-close:hover {
            opacity: 0.8;
        }

        #app-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: #fafafa;
        }

        /* 主菜单 */
        .menu-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .menu-button {
            padding: 16px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            text-align: center;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .menu-button:hover {
            border-color: #667eea;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }

        /* 分类列表 */
        .category-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .category-item {
            padding: 10px 12px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
        }

        .category-item:hover {
            background: #e8eaf6;
            border-color: #667eea;
        }

        /* 标签列表 */
        .tag-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .tag-item {
            padding: 12px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
        }

        .tag-item:hover {
            background: #f0f4ff;
            border-color: #667eea;
        }

        .tag-name-en {
            font-weight: 600;
            color: #333;
        }

        .tag-name-cn {
            color: #666;
            font-size: 12px;
            margin-top: 4px;
        }

        .tag-desc {
            color: #999;
            font-size: 12px;
            margin-top: 6px;
            line-height: 1.4;
        }

        /* 搜索框 */
        #search-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 12px;
        }

        #search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 4px rgba(102, 126, 234, 0.3);
        }

        /* 设置面板 */
        .settings-group {
            margin-bottom: 16px;
        }

        .settings-group-title {
            font-size: 13px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 8px;
        }

        .settings-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 13px;
        }

        .settings-button {
            padding: 8px 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .settings-button:hover {
            background: #764ba2;
        }

        .settings-button.danger {
            background: #e74c3c;
        }

        .settings-button.danger:hover {
            background: #c0392b;
        }

        /* 返回按钮 */
        .back-button {
            padding: 8px 12px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin-bottom: 12px;
        }

        .back-button:hover {
            background: #e0e0e0;
        }

        /* 触发按钮 */
        #ehtag-trigger-btn {
            position: fixed;
            top: 50%;
            right: 20px;
            z-index: 9999;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            transition: all 0.2s ease;
        }

        #ehtag-trigger-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
        }

        /* 加载和消息提示 */
        .loading {
            text-align: center;
            padding: 20px;
            color: #999;
        }

        .message {
            padding: 12px;
            background: #f0f0f0;
            border-radius: 4px;
            text-align: center;
            font-size: 13px;
            color: #666;
        }

        .message.success {
            background: #d4edda;
            color: #155724;
        }

        .message.error {
            background: #f8d7da;
            color: #721c24;
        }
    `;

    // ========== 初始化 ==========
    function init() {
        injectStyles();
        createTriggerButton();
        createPanel();
        setupKeyboardShortcuts();
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    function createTriggerButton() {
        const btn = document.createElement('button');
        btn.id = 'ehtag-trigger-btn';
        btn.title = `${CONFIG.SHORTCUTS.TOGGLE} 打开 EhTag 数据库面板`;
        btn.textContent = '📚';
        btn.addEventListener('click', togglePanel);
        document.body.appendChild(btn);
    }

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'ehtag-panel';
        panel.innerHTML = `
            <div id="ehtag-panel-header">
                <span>EhTag 数据库面板</span>
                <button id="ehtag-panel-close">✕</button>
            </div>
            <div id="app-content"></div>
        `;
        document.body.appendChild(panel);

        document.getElementById('ehtag-panel-close').addEventListener('click', closeApp);
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+E: 切换面板
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
                e.preventDefault();
                togglePanel();
            }
            // Escape: 关闭面板
            if (e.code === 'Escape' && appState.currentView !== 'main') {
                closeApp();
            }
        });
    }

    function togglePanel() {
        const panel = document.getElementById('ehtag-panel');
        if (panel.classList.contains('show')) {
            closeApp();
        } else {
            openApp();
        }
    }

    function openApp() {
        const panel = document.getElementById('ehtag-panel');
        panel.classList.add('show');
        renderMain();
    }

    // ========== 占位符 ==========
    function renderMain() {
        // 第 4 部分实现
    }

    function closeApp() {
        // 第 6 部分实现
    }



    // ========== 第 2 部分：数据获取函数 ==========

    // 清理 Markdown 和 HTML 标签
    const MARKDOWN_IMG_PATTERN = /!\[.*?\]\(.*?\)/g;
    const HTML_BR_PATTERN = /<br\s*\/?>/gi;
    const HTML_TAG_PATTERN = /<[^>]*>/g;
    const WHITESPACE_PATTERN = /\s+/g;

    function cleanMarkdownAndHTML(text) {
        if (!text) return '';
        return text
            .replace(MARKDOWN_IMG_PATTERN, '')
            .replace(HTML_BR_PATTERN, '')
            .replace(HTML_TAG_PATTERN, '')
            .trim();
    }

    function cleanWhitespace(text) {
        return text.replace(WHITESPACE_PATTERN, ' ').trim();
    }

    // 解析 Markdown 表格行
    function parseMarkdownRow(line, minCells = 2) {
        const cells = line
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);

        return cells.length >= minCells ? cells : null;
    }

    // 获取数据库（主入口）
    function fetchDatabase() {
        return new Promise((resolve, reject) => {
            // 如果已有数据在内存中，直接返回
            if (appState.database) {
                resolve(appState.database);
                return;
            }

            // 检查是否使用本地存储
            appState.useLocalStorage = GM_getValue(STORAGE_KEYS.USE_LOCAL, false);

            if (appState.useLocalStorage) {
                const localData = GM_getValue(STORAGE_KEYS.LOCAL_DB);
                if (localData) {
                    appState.database = JSON.parse(localData);
                    resolve(appState.database);
                    return;
                }
            }

            // 检查缓存
            const cacheTime = GM_getValue(STORAGE_KEYS.CACHE_TIME, 0);
            const now = Date.now();
            if (now - cacheTime < CONFIG.CACHE_DURATION) {
                const cachedData = GM_getValue(STORAGE_KEYS.CACHE_DB);
                if (cachedData) {
                    appState.database = JSON.parse(cachedData);
                    resolve(appState.database);
                    return;
                }
            }

            // 从远程获取
            fetchFromRemote().then(resolve).catch(reject);
        });
    }

    // 从远程获取数据
    function fetchFromRemote() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${CONFIG.DB_BASE_URL}/rows.md`,
                onload: (response) => {
                    if (response.status === 200) {
                        const categories = parseRowsMd(response.responseText);
                        if (categories.length > 0) {
                            fetchAllCategoryTags(categories).then(resolve).catch(reject);
                        } else {
                            reject(new Error('分类解析失败'));
                        }
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: () => reject(new Error('网络错误')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    // 解析 rows.md 获取分类列表
    function parseRowsMd(content) {
        return content
            .split('\n')
            .filter(line => line.startsWith('|') && !line.includes('---'))
            .map(line => {
                const cells = parseMarkdownRow(line, 2);
                if (!cells) return null;

                let [englishName, chineseName] = cells;
                englishName = cleanMarkdownAndHTML(englishName);
                chineseName = cleanMarkdownAndHTML(chineseName);

                // 过滤表头行和无效行
                if (['English', '原始标签', 'Chinese'].includes(englishName) || !englishName || !chineseName) {
                    return null;
                }

                return englishName;
            })
            .filter(Boolean);
    }

    // 获取所有分类的标签
    function fetchAllCategoryTags(categories) {
        return new Promise((resolve) => {
            let completed = 0;
            const total = categories.length;
            const allTags = {};

            categories.forEach((category) => {
                const filename = category.toLowerCase().replace(/\s+/g, '_') + '.md';

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `${CONFIG.DB_BASE_URL}/${filename}`,
                    onload: (response) => {
                        if (response.status === 200) {
                            allTags[category] = parseTagsMd(response.responseText);
                        }
                        completed++;
                        if (completed === total) {
                            const database = buildDatabase(categories, allTags);
                            cacheDatabase(database);
                            appState.database = database;
                            resolve(database);
                        }
                    },
                    onerror: () => {
                        completed++;
                        if (completed === total) {
                            const database = buildDatabase(categories, allTags);
                            cacheDatabase(database);
                            appState.database = database;
                            resolve(database);
                        }
                    }
                });
            });
        });
    }

    // 解析单个标签文件
    function parseTagsMd(content) {
        const tags = [];

        content
            .split('\n')
            .filter(line => line.startsWith('|') && !line.includes('---'))
            .forEach(line => {
                const cells = parseMarkdownRow(line, 2);
                if (!cells) return;

                let [originalTag, translatedName, description = ''] = cells;
                originalTag = cleanMarkdownAndHTML(originalTag);
                translatedName = cleanMarkdownAndHTML(translatedName);
                description = cleanMarkdownAndHTML(description);

                // 过滤表头行和无效行
                if (['Original Tag', '原始标签'].includes(originalTag) || !originalTag || !translatedName) {
                    return;
                }

                description = cleanWhitespace(description);

                tags.push({
                    english: originalTag,
                    chinese: translatedName,
                    description: description
                });
            });

        return tags;
    }

    // 构建数据库对象
    function buildDatabase(categories, allTags) {
        const database = {
            timestamp: Date.now(),
            categories: categories,
            tags: {}
        };

        // 组织数据结构：{ category: [tag1, tag2, ...] }
        categories.forEach(category => {
            database.tags[category] = allTags[category] || [];
        });

        return database;
    }

    // 缓存数据库到本地存储
    function cacheDatabase(database) {
        try {
            GM_setValue(STORAGE_KEYS.CACHE_DB, JSON.stringify(database));
            GM_setValue(STORAGE_KEYS.CACHE_TIME, Date.now());
        } catch (e) {
            console.error('缓存失败:', e);
        }
    }

    // ========== 第 3 部分：存储管理函数 ==========

    // 保存数据库到本地存储
    function saveToLocalStorage(database) {
        try {
            GM_setValue(STORAGE_KEYS.USE_LOCAL, true);
            GM_setValue(STORAGE_KEYS.LOCAL_DB, JSON.stringify(database));
            showNotification('数据已保存到本地存储');
            appState.useLocalStorage = true;
        } catch (e) {
            console.error('本地存储失败:', e);
            showNotification('保存失败：' + e.message);
        }
    }

    // 清除本地存储，回退到在线
    function clearLocalStorage() {
        try {
            GM_deleteValue(STORAGE_KEYS.USE_LOCAL);
            GM_deleteValue(STORAGE_KEYS.LOCAL_DB);
            appState.useLocalStorage = false;
            showNotification('已清除本地存储，已回退到在线模式');
        } catch (e) {
            console.error('清除本地存储失败:', e);
            showNotification('清除失败：' + e.message);
        }
    }

    // 清除缓存，强制刷新
    function clearCache() {
        try {
            GM_deleteValue(STORAGE_KEYS.CACHE_DB);
            GM_deleteValue(STORAGE_KEYS.CACHE_TIME);
            appState.database = null;  // 清除内存中的数据

            // 重新获取数据
            fetchDatabase().then(() => {
                showNotification('缓存已清除，已重新获取最新数据');
                goTo('categories');
            }).catch((e) => {
                showNotification('重新获取失败：' + e.message);
            });
        } catch (e) {
            console.error('清除缓存失败:', e);
            showNotification('清除失败：' + e.message);
        }
    }

    // 获取数据库状态（用于设置菜单显示）
    function getDatabaseStatus() {
        const isUsingLocal = appState.useLocalStorage;
        const cacheTime = GM_getValue(STORAGE_KEYS.CACHE_TIME, 0);
        const now = Date.now();
        const isCacheValid = now - cacheTime < CONFIG.CACHE_DURATION;

        return {
            isUsingLocal: isUsingLocal,
            isCacheValid: isCacheValid,
            cacheAge: Math.floor((now - cacheTime) / 1000 / 60)  // 分钟
        };
    }

    // 显示临时通知
    function showNotification(message) {
        const notifId = 'ehtag-notification-' + Date.now();
        const notif = document.createElement('div');
        notif.id = notifId;
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            max-width: 300px;
            z-index: 99998;
            animation: slideInUp 0.3s ease-out;
        `;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.animation = 'slideInUp 0.3s ease-out reverse';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }

    // 检查存储容量（可选，用于调试）
    function checkStorageUsage() {
        const keys = [STORAGE_KEYS.LOCAL_DB, STORAGE_KEYS.CACHE_DB];
        let totalSize = 0;

        keys.forEach(key => {
            const value = GM_getValue(key);
            if (value) {
                totalSize += value.length;
            }
        });

        const sizeInKB = (totalSize / 1024).toFixed(2);
        console.log(`EhTag 存储使用量: ${sizeInKB} KB`);
        return sizeInKB;
    }

    // 导出数据为 JSON（用于备份）
    function exportDatabase() {
        try {
            const database = appState.database;
            if (!database) {
                showNotification('数据库为空，无法导出');
                return;
            }

            const json = JSON.stringify(database, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ehtag-database-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showNotification('数据库已导出');
        } catch (e) {
            console.error('导出失败:', e);
            showNotification('导出失败：' + e.message);
        }
    }

    // 导入数据从 JSON（用于恢复备份）
    function importDatabase() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const database = JSON.parse(event.target.result);
                    if (!database.categories || !database.tags) {
                        throw new Error('无效的数据库格式');
                    }

                    saveToLocalStorage(database);
                    appState.database = database;
                    showNotification('数据库已导入');
                    goTo('categories');
                } catch (e) {
                    console.error('导入失败:', e);
                    showNotification('导入失败：' + e.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ========== 第 4 部分：UI 渲染函数 ==========

    // 主菜单视图（游戏菜单风格）
    function renderMain() {
        const content = document.getElementById('app-content');
        const status = getDatabaseStatus();

        let statusText = '在线模式';
        if (status.isUsingLocal) {
            statusText = '本地存储模式';
        } else if (status.isCacheValid) {
            statusText = `缓存模式 (${status.cacheAge}分钟前)`;
        }

        content.innerHTML = `
            <div class="menu-grid">
                <button class="menu-btn" data-action="goTo" data-param="categories">
                    <span class="btn-icon">📂</span>
                    <span class="btn-text">分类浏览</span>
                </button>
                <button class="menu-btn" data-action="goTo" data-param="search">
                    <span class="btn-icon">🔍</span>
                    <span class="btn-text">标签搜索</span>
                </button>
                <button class="menu-btn" data-action="goTo" data-param="settings">
                    <span class="btn-icon">⚙️</span>
                    <span class="btn-text">设置</span>
                </button>
            </div>
            <div class="status-bar">
                状态: ${statusText}
            </div>
        `;
    }

    // 分类列表视图
    function renderCategories() {
        const content = document.getElementById('app-content');

        if (!appState.database || !appState.database.categories) {
            content.innerHTML = '<div class="error-message">数据加载中或加载失败</div>';
            return;
        }

        const categories = appState.database.categories;
        const categoryBtns = categories.map(cat => `
            <button class="category-btn" data-action="showCategory" data-param="${encodeURIComponent(cat)}">
                ${cat}
            </button>
        `).join('');

        content.innerHTML = `
            <div class="back-button">
                <button class="btn-back" data-action="goTo" data-param="main">← 返回主菜单</button>
            </div>
            <div class="category-list">
                ${categoryBtns}
            </div>
        `;
    }

    // 搜索视图
    function renderSearch() {
        const content = document.getElementById('app-content');

        content.innerHTML = `
            <div class="back-button">
                <button class="btn-back" data-action="goTo" data-param="main">← 返回主菜单</button>
            </div>
            <div class="search-container">
                <input
                    type="text"
                    id="search-input"
                    class="search-input"
                    placeholder="输入标签名或描述..."
                    autocomplete="off"
                />
                <button class="search-btn" data-action="performSearch">搜索</button>
            </div>
            <div id="search-results" class="tag-list"></div>
        `;

        // 绑定搜索框 Enter 键
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
            searchInput.focus();
        }
    }

    // 设置菜单视图
    function renderSettings() {
        const content = document.getElementById('app-content');
        const status = getDatabaseStatus();

        let localStorageBtn = status.isUsingLocal
            ? '<button class="settings-btn danger" data-action="clearLocalStorage">清除本地存储 (已启用)</button>'
            : '<button class="settings-btn" data-action="saveToLocalStorage">保存到本地存储</button>';

        content.innerHTML = `
            <div class="back-button">
                <button class="btn-back" data-action="goTo" data-param="main">← 返回主菜单</button>
            </div>
            <div class="settings-menu">
                <div class="settings-group">
                    <h3>本地存储</h3>
                    ${localStorageBtn}
                    <p class="settings-info">将数据库保存到本地，支持离线使用</p>
                </div>

                <div class="settings-group">
                    <h3>缓存管理</h3>
                    <button class="settings-btn" data-action="clearCache">清除缓存并刷新</button>
                    <p class="settings-info">强制从远程重新获取最新数据</p>
                </div>

                <div class="settings-group">
                    <h3>数据备份</h3>
                    <button class="settings-btn" data-action="exportDatabase">导出数据</button>
                    <button class="settings-btn" data-action="importDatabase">导入数据</button>
                    <p class="settings-info">导出为 JSON 文件或从文件恢复</p>
                </div>

                <div class="settings-group">
                    <h3>快捷键</h3>
                    <p class="settings-info">
                        <strong>Ctrl + Shift + E</strong>: 打开/关闭面板<br/>
                        <strong>Esc</strong>: 关闭面板<br/>
                        <strong>Enter</strong>: 搜索标签
                    </p>
                </div>

                <div class="settings-group">
                    <h3>关于</h3>
                    <p class="settings-info">
                        EhTag 数据库面板 v2.0<br/>
                        数据源: EhTagTranslation/Database<br/>
                        <a href="https://t.me/BGG_Comics" target="_blank">制作者</a>
                    </p>
                </div>
            </div>
        `;
    }

    // 渲染标签列表（用于分类或搜索结果）
    function renderTagList(tags, title = '') {
        if (!tags || tags.length === 0) {
            return '<div class="error-message">未找到标签</div>';
        }

        const tagBtns = tags.map(tag => `
            <div class="tag-item" data-action="showTagDetail" data-param="${encodeURIComponent(JSON.stringify(tag))}">
                <div class="tag-name">
                    <span class="tag-english">${escapeHtml(tag.english)}</span>
                    <span class="tag-chinese">${escapeHtml(tag.chinese)}</span>
                </div>
                <div class="tag-arrow">→</div>
            </div>
        `).join('');

        return `
            ${title ? `<h3 class="list-title">${title}</h3>` : ''}
            <div class="tag-list">
                ${tagBtns}
            </div>
        `;
    }

    // 渲染标签详情视图
    function renderTagDetail(tag) {
        const content = document.getElementById('app-content');

        content.innerHTML = `
            <div class="back-button">
                <button class="btn-back" data-action="goBack">← 返回</button>
            </div>
            <div class="tag-detail">
                <div class="detail-header">
                    <h2 class="detail-english">${escapeHtml(tag.english)}</h2>
                    <h3 class="detail-chinese">${escapeHtml(tag.chinese)}</h3>
                </div>
                <div class="detail-body">
                    <div class="detail-section">
                        <h4>描述</h4>
                        <p class="detail-description">${escapeHtml(tag.description) || '（暂无描述）'}</p>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="action-btn" data-action="copyToClipboard" data-param="${escapeHtml(tag.english)}">
                        复制英文名
                    </button>
                    <button class="action-btn" data-action="copyToClipboard" data-param="${escapeHtml(tag.chinese)}">
                        复制中文名
                    </button>
                </div>
            </div>
        `;
    }

    // HTML 转义
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== 第 5 部分：显示和搜索函数 ==========

    // 显示指定分类的标签
    function showCategory() {
        const categoryName = event.target.closest('[data-action="showCategory"]')?.getAttribute('data-param');
        if (!categoryName) return;

        const decodedCategory = decodeURIComponent(categoryName);
        appState.currentCategory = decodedCategory;

        if (!appState.database || !appState.database.tags) {
            showNotification('数据尚未加载');
            return;
        }

        const tags = appState.database.tags[decodedCategory] || [];
        const content = document.getElementById('app-content');

        content.innerHTML = `
            <div class="back-button">
                <button class="btn-back" data-action="goBack">← 返回分类列表</button>
            </div>
            <h2 class="category-title">${escapeHtml(decodedCategory)}</h2>
            <div id="category-tags">
                ${renderTagList(tags)}
            </div>
        `;
    }

    // 显示标签详情
    function showTagDetail() {
        const tagJson = event.target.closest('[data-action="showTagDetail"]')?.getAttribute('data-param');
        if (!tagJson) return;

        try {
            const tag = JSON.parse(decodeURIComponent(tagJson));
            renderTagDetail(tag);
        } catch (e) {
            showNotification('标签加载失败');
        }
    }

    // 执行搜索
    function performSearch() {
        const searchInput = document.getElementById('search-input');
        const query = searchInput ? searchInput.value.trim() : '';

        if (!query) {
            showNotification('请输入搜索关键词');
            return;
        }

        if (!appState.database || !appState.database.tags) {
            showNotification('数据尚未加载');
            return;
        }

        const results = [];
        const queryLower = query.toLowerCase();

        // 遍历所有分类和标签，匹配搜索条件
        for (const [category, tags] of Object.entries(appState.database.tags)) {
            for (const tag of tags) {
                const englishMatch = tag.english.toLowerCase().includes(queryLower);
                const chineseMatch = tag.chinese.toLowerCase().includes(queryLower);
                const descriptionMatch = (tag.description || '').toLowerCase().includes(queryLower);

                if (englishMatch || chineseMatch || descriptionMatch) {
                    results.push({
                        ...tag,
                        category: category
                    });
                }
            }
        }

        appState.searchResults = results;

        // 显示搜索结果
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="error-message">未找到匹配的标签</div>';
            } else {
                const resultTags = results.map(tag => ({
                    english: tag.english,
                    chinese: tag.chinese,
                    description: tag.description
                }));
                resultsContainer.innerHTML = renderTagList(resultTags, `找到 ${results.length} 个结果`);
            }
        }
    }

    // 复制到剪贴板
    function copyToClipboard() {
        const btn = event.target.closest('[data-action="copyToClipboard"]');
        if (!btn) return;

        const text = btn.getAttribute('data-param');

        navigator.clipboard.writeText(text).then(() => {
            showNotification(`已复制: ${text}`);
        }).catch(() => {
            showNotification('复制失败');
        });
    }

    // 后退导航（返回上一个视图）
    function goBack() {
        if (appState.currentView === 'categories') {
            appState.currentView = 'main';
            renderMain();
        } else if (appState.currentView === 'search') {
            appState.currentView = 'main';
            renderMain();
        } else {
            appState.currentView = 'main';
            renderMain();
        }
    }

    // ========== 第 6 部分：导航和 UI 控制 ==========

    // 导航到指定视图
    function goTo(view) {
        appState.currentView = view;

        switch (view) {
            case 'main':
                renderMain();
                break;
            case 'categories':
                renderCategories();
                break;
            case 'search':
                renderSearch();
                break;
            case 'settings':
                renderSettings();
                break;
            default:
                renderMain();
        }
    }

    // 关闭应用面板
    function closeApp() {
        const panel = document.getElementById('ehtag-panel');
        if (panel) {
            panel.style.display = 'none';
        }
        appState.currentView = 'main';
    }

    // 统一事件处理委托
    function handleButtonClick(event, actionBtn) {
        // 兼容两种调用方式：传 event 或传 actionBtn
        const targetBtn = actionBtn || event.target.closest('[data-action]');

        if (!targetBtn) return;  // 防御性检查

        const action = targetBtn.getAttribute('data-action');
        const param = targetBtn.getAttribute('data-param');

        switch (action) {
            // 导航和视图
            case 'goTo':
                goTo(param);
                break;
            case 'goBack':
                goBack();
                break;
            case 'closeApp':
                closeApp();
                break;

            // 分类相关
            case 'showCategory':
                showCategory();
                break;

            // 标签相关
            case 'showTagDetail':
                showTagDetail();
                break;
            case 'copyToClipboard':
                copyToClipboard();
                break;

            // 搜索
            case 'performSearch':
                performSearch();
                break;

            // 本地存储
            case 'saveToLocalStorage':
                saveToLocalStorage(appState.database);
                showNotification('✅ 已保存到本地');
                break;
            case 'clearLocalStorage':
                clearLocalStorage();
                showNotification('✅ 已清除本地存储');
                renderSettings();
                break;

            // 缓存管理
            case 'clearCache':
                clearCache();
                showNotification('✅ 缓存已清除，正在重新加载...');
                setTimeout(() => {
                    renderMain();
                }, 1000);
                break;

            // 数据备份
            case 'exportDatabase':
                exportDatabase();
                break;
            case 'importDatabase':
                triggerFileImport();
                break;

            default:
                break;
        }
    }


    // 触发文件导入
    function triggerFileImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                importDatabase(file);
            }
        };
        input.click();
    }

    // ========== 第 7 部分：事件监听和初始化 ==========

    // 设置面板的事件委托监听
    function setupPanelEventListeners() {
        const panel = document.getElementById('ehtag-panel');
        if (!panel) return;

        // 面板内容事件委托
        const content = panel.querySelector('#app-content');
        if (content) {
            content.addEventListener('click', (event) => {
                // 找到最近的带有 data-action 的元素
                const actionBtn = event.target.closest('[data-action]');
                if (actionBtn) {
                    handleButtonClick(event, actionBtn);  // ← 同时传入 event 和 actionBtn
                }
            });
        }

        // 搜索输入框的 Enter 键监听
        panel.addEventListener('keypress', (event) => {
            if (event.target.id === 'search-input' && event.key === 'Enter') {
                event.preventDefault();
                performSearch();
            }
        });

        // 关闭按钮（如果有）
        const closeBtn = panel.querySelector('[data-action="closeApp"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeApp);
        }
    }


    // 设置全局键盘快捷键
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+E 打开/关闭面板
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyE') {
                event.preventDefault();
                togglePanel();
            }

            // Escape 关闭面板
            if (event.key === 'Escape') {
                const panel = document.getElementById('ehtag-panel');
                if (panel && panel.style.display !== 'none') {
                    closeApp();
                }
            }
        });
    }

    // 切换面板显示/隐藏
    function togglePanel() {
        const panel = document.getElementById('ehtag-panel');
        if (!panel) {
            openApp();
            return;
        }

        if (panel.style.display === 'none') {
            openApp();
        } else {
            closeApp();
        }
    }

    // 打开应用面板
    function openApp() {
        const panel = document.getElementById('ehtag-panel');
        if (!panel) return;

        panel.style.display = 'flex';
        appState.currentView = 'main';
        renderMain();

        // 初始化数据
        if (!appState.database || Object.keys(appState.database).length === 0) {
            fetchDatabase();
        }
    }

    // 初始化应用
    async function initializeApp() {
        // 1. 注入样式
        injectStyles();

        // 2. 创建触发按钮
        createTriggerButton();

        // 3. 创建面板
        createPanel();

        // 4. 设置事件监听
        setupPanelEventListeners();
        setupKeyboardShortcuts();

        // 5. 加载数据
        try {
            appState.database = await fetchDatabase();
        } catch (e) {
            console.error('Failed to initialize database:', e);
            showNotification('数据加载失败');
        }
    }

    // ========== 脚本启动 ==========

    // 确保 DOM 已加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

    // 防止脚本重复加载
    if (!window.__EhTagScriptLoaded) {
        window.__EhTagScriptLoaded = true;
    }
})();