// ==UserScript==
// @name         标签查询面板
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  游戏菜单风格的标签查询面板
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const CONFIG = {
        SPREADSHEET_ID: '10At5Ij9DdMsD0Zw7XGW96kgwhvSni4d9',
        SHEET_GID: '1022287136',
        DATA_START_ROW: 7, // 从第7行开始
        CACHE_KEY: 'tagPanel_cache',
        STORAGE_KEY: 'tagPanel_storage',
        SHORTCUT_KEY: 'tagPanel_shortcut' // 快捷键配置
    };

    // ==================== HTML 结构 ====================
    function createPanelHTML() {
        const html = `
            <div id="tagPanel-container" class="tagPanel-container">
                <!-- 启动按钮 -->
                <button id="tagPanel-launch-btn" class="tagPanel-launch-btn" title="打开标签查询面板 (快捷键: Alt+T)">
                    📋
                </button>

                <!-- 主面板 -->
                <div id="tagPanel-main" class="tagPanel-main" style="display: none;">
                    <div class="tagPanel-header">
                        <div class="tagPanel-title">标签查询</div>
                        <button id="tagPanel-close-btn" class="tagPanel-close-btn">✕</button>
                    </div>

                    <!-- 标签页/菜单 -->
                    <div class="tagPanel-tabs">
                        <button class="tagPanel-tab active" data-tab="search">查询</button>
                        <button class="tagPanel-tab" data-tab="settings">设置</button>
                    </div>

                    <!-- 查询标签页 -->
                    <div id="tagPanel-search-tab" class="tagPanel-tab-content active">
                        <input 
                            type="text" 
                            id="tagPanel-search-input" 
                            class="tagPanel-search-input" 
                            placeholder="搜索标签（英文/中文）"
                        >
                        <div id="tagPanel-tags-list" class="tagPanel-tags-list"></div>
                    </div>

                    <!-- 设置标签页 -->
                    <div id="tagPanel-settings-tab" class="tagPanel-tab-content" style="display: none;">
                        <div class="tagPanel-settings-group">
                            <h3>数据管理</h3>
                            <button id="tagPanel-refresh-cache-btn" class="tagPanel-setting-btn">刷新缓存</button>
                            <button id="tagPanel-clear-cache-btn" class="tagPanel-setting-btn">清除缓存</button>
                            <button id="tagPanel-export-btn" class="tagPanel-setting-btn">导出数据</button>
                            <button id="tagPanel-import-btn" class="tagPanel-setting-btn">导入数据</button>
                        </div>

                        <div class="tagPanel-settings-group">
                            <h3>本地存储</h3>
                            <button id="tagPanel-save-storage-btn" class="tagPanel-setting-btn">保存当前</button>
                            <button id="tagPanel-load-storage-btn" class="tagPanel-setting-btn">加载存储</button>
                            <button id="tagPanel-clear-storage-btn" class="tagPanel-setting-btn">清除存储</button>
                        </div>

                        <div class="tagPanel-settings-group">
                            <h3>界面设置</h3>
                            <label class="tagPanel-setting-label">
                                <input type="checkbox" id="tagPanel-hide-btn-checkbox">
                                隐藏启动按钮
                            </label>
                            <div>
                                <label>快捷键设置：</label>
                                <input 
                                    type="text" 
                                    id="tagPanel-shortcut-input" 
                                    class="tagPanel-shortcut-input" 
                                    placeholder="例如: Alt+T, Ctrl+Shift+K"
                                    maxlength="20"
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return html;
    }

    // ==================== 初始化 ====================
    function init() {
        // 注入HTML
        const container = document.createElement('div');
        container.innerHTML = createPanelHTML();
        document.body.appendChild(container);

        console.log('标签查询面板已初始化');
    }

    // 页面加载完成后初始化
    window.addEventListener('load', init);
})();

<style id="tagPanel-styles">
    /* ==================== 容器 ==================== */
    .tagPanel-container {
        font-family: "Microsoft YaHei", Arial, sans-serif;
        font-size: 14px;
        z-index: 999999;
    }

    /* ==================== 启动按钮 ==================== */
    .tagPanel-launch-btn {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 3px solid #FFD700;
        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        color: #FFD700;
        font-size: 28px;
        cursor: pointer;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.5);
        transition: all 0.3s ease;
        z-index: 999998;
    }

    .tagPanel-launch-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), inset 0 0 10px rgba(0, 0, 0, 0.5);
    }

    .tagPanel-launch-btn:active {
        transform: scale(0.95);
    }

    .tagPanel-launch-btn.hidden {
        display: none;
    }

    /* ==================== 主面板 ==================== */
    .tagPanel-main {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-height: 600px;
        background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
        border: 3px solid #FFD700;
        border-radius: 10px;
        box-shadow: 
            0 0 50px rgba(255, 215, 0, 0.3),
            inset 0 0 20px rgba(255, 215, 0, 0.1),
            0 10px 40px rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        animation: slideIn 0.3s ease;
        z-index: 999997;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translate(-50%, -48%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
    }

    /* ==================== 标题栏 ==================== */
    .tagPanel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 2px solid #FFD700;
        background: rgba(0, 0, 0, 0.3);
    }

    .tagPanel-title {
        color: #FFD700;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }

    .tagPanel-close-btn {
        width: 30px;
        height: 30px;
        border: 1px solid #FFD700;
        background: rgba(255, 215, 0, 0.1);
        color: #FFD700;
        font-size: 20px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .tagPanel-close-btn:hover {
        background: rgba(255, 215, 0, 0.3);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }

    /* ==================== 标签页 ==================== */
    .tagPanel-tabs {
        display: flex;
        border-bottom: 1px solid rgba(255, 215, 0, 0.3);
        background: rgba(0, 0, 0, 0.2);
    }

    .tagPanel-tab {
        flex: 1;
        padding: 12px;
        border: none;
        background: transparent;
        color: #AAA;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
    }

    .tagPanel-tab:hover {
        color: #FFD700;
        background: rgba(255, 215, 0, 0.05);
    }

    .tagPanel-tab.active {
        color: #FFD700;
        border-bottom-color: #FFD700;
        box-shadow: inset 0 -5px 15px rgba(255, 215, 0, 0.1);
    }

    /* ==================== 标签页内容 ==================== */
    .tagPanel-tab-content {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        display: none;
    }

    .tagPanel-tab-content.active {
        display: block;
    }

    /* ==================== 搜索框 ==================== */
    .tagPanel-search-input {
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 15px;
        background: rgba(255, 215, 0, 0.05);
        border: 2px solid #FFD700;
        border-radius: 4px;
        color: #FFF;
        font-size: 14px;
        box-sizing: border-box;
        transition: all 0.2s ease;
    }

    .tagPanel-search-input::placeholder {
        color: #888;
    }

    .tagPanel-search-input:focus {
        outline: none;
        background: rgba(255, 215, 0, 0.1);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    }

    /* ==================== 标签列表 ==================== */
    .tagPanel-tags-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 450px;
        overflow-y: auto;
    }

    .tagPanel-tag-item {
        background: rgba(255, 215, 0, 0.05);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 4px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .tagPanel-tag-item:hover {
        background: rgba(255, 215, 0, 0.15);
        border-color: #FFD700;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
        transform: translateX(5px);
    }

    .tagPanel-tag-name {
        color: #FFD700;
        font-weight: bold;
        margin-bottom: 5px;
        font-size: 13px;
    }

    .tagPanel-tag-chinese {
        color: #87CEEB;
        font-size: 12px;
        margin-bottom: 5px;
    }

    .tagPanel-tag-desc {
        color: #CCC;
        font-size: 12px;
        line-height: 1.5;
    }

    /* ==================== 设置菜单 ==================== */
    .tagPanel-settings-group {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 215, 0, 0.2);
    }

    .tagPanel-settings-group:last-child {
        border-bottom: none;
    }

    .tagPanel-settings-group h3 {
        color: #FFD700;
        font-size: 14px;
        margin: 0 0 12px 0;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    }

    .tagPanel-setting-btn {
        display: block;
        width: 100%;
        padding: 10px;
        margin-bottom: 8px;
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
        border: 1px solid #FFD700;
        border-radius: 4px;
        color: #FFD700;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .tagPanel-setting-btn:hover {
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        transform: translateY(-2px);
    }

    .tagPanel-setting-btn:active {
        transform: translateY(0);
    }

    /* ==================== 设置标签 ==================== */
    .tagPanel-setting-label {
        display: flex;
        align-items: center;
        color: #CCC;
        font-size: 12px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .tagPanel-setting-label:hover {
        color: #FFD700;
    }

    .tagPanel-setting-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        margin-right: 8px;
        cursor: pointer;
        accent-color: #FFD700;
    }

    /* ==================== 快捷键输入 ==================== */
    .tagPanel-shortcut-input {
        width: 100%;
        padding: 8px 10px;
        margin-top: 8px;
        background: rgba(255, 215, 0, 0.05);
        border: 1px solid #FFD700;
        border-radius: 4px;
        color: #FFF;
        font-size: 12px;
        box-sizing: border-box;
        transition: all 0.2s ease;
    }

    .tagPanel-shortcut-input:focus {
        outline: none;
        background: rgba(255, 215, 0, 0.1);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    }

    /* ==================== 滚动条美化 ==================== */
    .tagPanel-tags-list::-webkit-scrollbar,
    .tagPanel-tab-content::-webkit-scrollbar {
        width: 6px;
    }

    .tagPanel-tags-list::-webkit-scrollbar-track,
    .tagPanel-tab-content::-webkit-scrollbar-track {
        background: rgba(255, 215, 0, 0.05);
        border-radius: 3px;
    }

    .tagPanel-tags-list::-webkit-scrollbar-thumb,
    .tagPanel-tab-content::-webkit-scrollbar-thumb {
        background: rgba(255, 215, 0, 0.3);
        border-radius: 3px;
    }

    .tagPanel-tags-list::-webkit-scrollbar-thumb:hover,
    .tagPanel-tab-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 215, 0, 0.5);
    }
</style>

// ==================== 数据管理 ====================
class DataManager {
    constructor(config) {
        this.config = config;
        this.data = [];
    }

    // 从Google Sheets获取数据
    async fetchFromSpreadsheet() {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.SPREADSHEET_ID}/values/Sheet1?key=AIzaSyDummyKeyForDemo`;
            
            // 注意：这里使用的是公开API，如果需要实际使用，需要设置Google API密钥
            // 或者使用CSV导出链接
            const csvUrl = `https://docs.google.com/spreadsheets/d/${this.config.SPREADSHEET_ID}/export?format=csv&gid=${this.config.SHEET_GID}`;
            
            const response = await fetch(csvUrl);
            const csv = await response.text();
            this.parseCSV(csv);
            
            return this.data;
        } catch (error) {
            console.error('获取数据失败:', error);
            // 如果获取失败，尝试从缓存读取
            const cached = this.loadCache();
            if (cached.length > 0) {
                this.data = cached;
                console.log('已从缓存加载数据');
                return this.data;
            }
            return [];
        }
    }

    // 解析CSV数据
    parseCSV(csv) {
        const lines = csv.split('\n');
        this.data = [];
        
        // 从第7行开始（索引6），只取前三列 A、B、C
        for (let i = this.config.DATA_START_ROW - 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // 简单的CSV解析（处理基础情况）
            const parts = this.parseCSVLine(line);
            if (parts.length >= 3) {
                this.data.push({
                    english: parts[0].trim(),
                    chinese: parts[1].trim(),
                    description: parts[2].trim()
                });
            }
        }
        
        // 保存到缓存
        this.saveCache();
        console.log(`已加载 ${this.data.length} 条数据`);
    }

    // CSV行解析（处理引号）
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    // 保存缓存
    saveCache() {
        GM_setValue(this.config.CACHE_KEY, JSON.stringify(this.data));
    }

    // 加载缓存
    loadCache() {
        const cached = GM_getValue(this.config.CACHE_KEY, '[]');
        return JSON.parse(cached);
    }

    // 清除缓存
    clearCache() {
        GM_deleteValue(this.config.CACHE_KEY);
        this.data = [];
    }

    // 搜索数据
    search(keyword) {
        if (!keyword) return this.data;
        
        const lowerKeyword = keyword.toLowerCase();
        return this.data.filter(item => 
            item.english.toLowerCase().includes(lowerKeyword) ||
            item.chinese.toLowerCase().includes(lowerKeyword) ||
            item.description.toLowerCase().includes(lowerKeyword)
        );
    }

    // 获取所有数据
    getAll() {
        return this.data;
    }
}

// ==================== UI管理 ====================
class UIManager {
    constructor() {
        this.dataManager = null;
        this.currentData = [];
        this.launchBtn = null;
        this.mainPanel = null;
        this.isVisible = false;
    }

    // 初始化UI管理器
    init(dataManager) {
        this.dataManager = dataManager;
        this.setupElements();
        this.setupEventListeners();
        this.restoreSettings();
    }

    // 获取DOM元素
    setupElements() {
        this.launchBtn = document.getElementById('tagPanel-launch-btn');
        this.mainPanel = document.getElementById('tagPanel-main');
        this.searchInput = document.getElementById('tagPanel-search-input');
        this.tagsList = document.getElementById('tagPanel-tags-list');
        this.closeBtn = document.getElementById('tagPanel-close-btn');
        this.tabs = document.querySelectorAll('.tagPanel-tab');
        this.tabContents = document.querySelectorAll('.tagPanel-tab-content');
    }

    // 设置事件监听
    setupEventListeners() {
        // 启动按钮
        this.launchBtn.addEventListener('click', () => this.togglePanel());

        // 关闭按钮
        this.closeBtn.addEventListener('click', () => this.hidePanel());

        // 搜索框
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // 标签页切换
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 快捷键监听
        document.addEventListener('keydown', (e) => this.handleShortcut(e));

        // 页面失焦时关闭面板
        document.addEventListener('click', (e) => {
            if (!this.mainPanel.contains(e.target) && e.target !== this.launchBtn) {
                if (this.isVisible) {
                    this.hidePanel();
                }
            }
        });
    }

    // 切换面板显示/隐藏
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    // 显示面板
    async showPanel() {
        // 如果数据为空，先加载数据
        if (this.dataManager.data.length === 0) {
            console.log('加载数据中...');
            await this.dataManager.fetchFromSpreadsheet();
        }

        this.currentData = this.dataManager.getAll();
        this.renderTagsList(this.currentData);
        this.mainPanel.style.display = 'flex';
        this.isVisible = true;
        this.searchInput.focus();
    }

    // 隐藏面板
    hidePanel() {
        this.mainPanel.style.display = 'none';
        this.isVisible = false;
    }

    // 搜索处理
    handleSearch(keyword) {
        const results = this.dataManager.search(keyword);
        this.currentData = results;
        this.renderTagsList(results);
    }

    // 渲染标签列表
    renderTagsList(items) {
        this.tagsList.innerHTML = '';

        if (items.length === 0) {
            this.tagsList.innerHTML = '<div style="color: #AAA; padding: 20px; text-align: center;">未找到匹配的标签</div>';
            return;
        }

        items.forEach(item => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tagPanel-tag-item';
            tagElement.innerHTML = `
                <div class="tagPanel-tag-name">${this.escapeHtml(item.english)}</div>
                <div class="tagPanel-tag-chinese">${this.escapeHtml(item.chinese)}</div>
                <div class="tagPanel-tag-desc">${this.escapeHtml(item.description)}</div>
            `;
            this.tagsList.appendChild(tagElement);
        });
    }

    // 标签页切换
    switchTab(tabName) {
        // 更新标签页状态
        this.tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // 更新内容显示
        this.tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `tagPanel-${tabName}-tab`) {
                content.classList.add('active');
            }
        });
    }

    // 快捷键处理
    handleShortcut(e) {
        const shortcutKey = GM_getValue('tagPanel_shortcut_key', 'Alt+T');
        
        if (this.matchesShortcut(e, shortcutKey)) {
            e.preventDefault();
            this.togglePanel();
        }
    }

    // 检查是否匹配快捷键
    matchesShortcut(e, shortcut) {
        const parts = shortcut.split('+').map(p => p.trim().toLowerCase());
        
        const hasCtrl = parts.includes('ctrl') && e.ctrlKey;
        const hasAlt = parts.includes('alt') && e.altKey;
        const hasShift = parts.includes('shift') && e.shiftKey;
        
        let keyMatch = false;
        for (let part of parts) {
            if (!['ctrl', 'alt', 'shift'].includes(part)) {
                keyMatch = e.key.toLowerCase() === part || e.code.toLowerCase() === `key${part}`;
                break;
            }
        }

        return keyMatch && ((parts.includes('ctrl') ? hasCtrl : true)) && 
               ((parts.includes('alt') ? hasAlt : true)) && 
               ((parts.includes('shift') ? hasShift : true));
    }

    // 恢复设置
    restoreSettings() {
        const hideBtn = GM_getValue('tagPanel_hide_btn', false);
        if (hideBtn) {
            this.launchBtn.classList.add('hidden');
        }
    }

    // HTML转义（防止XSS）
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==================== 初始化脚本 ====================
(function() {
    'use strict';

    // 配置
    const CONFIG = {
        SPREADSHEET_ID: '10At5Ij9DdMsD0Zw7XGW96kgwhvSni4d9',
        SHEET_GID: '1022287136',
        DATA_START_ROW: 7,
        CACHE_KEY: 'tagPanel_cache',
        STORAGE_KEY: 'tagPanel_storage',
        SHORTCUT_KEY: 'tagPanel_shortcut'
    };

    // 创建管理器实例
    const dataManager = new DataManager(CONFIG);
    const uiManager = new UIManager();

    // 初始化
    window.addEventListener('load', () => {
        uiManager.init(dataManager);
        
        // 初始加载数据
        dataManager.fetchFromSpreadsheet().then(() => {
            console.log('数据已初始化');
        });
    });

    // 暴露全局对象便于调试
    window.tagPanel = {
        dataManager,
        uiManager
    };
})();

// ==================== 存储管理模块 ====================
class StorageManager {
    constructor(config) {
        this.config = config;
        this.CACHE_KEY = config.CACHE_KEY;
        this.STORAGE_KEY = config.STORAGE_KEY;
        this.STORAGE_LIST_KEY = 'tagPanel_storage_list'; // 存储的数据集列表
    }

    // ========== 缓存管理 ==========
    
    // 保存缓存
    saveCache(data) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                data: data,
                version: '1.0'
            };
            GM_setValue(this.CACHE_KEY, JSON.stringify(cacheData));
            console.log(`缓存已保存，包含 ${data.length} 条数据`);
            return true;
        } catch (error) {
            console.error('保存缓存失败:', error);
            return false;
        }
    }

    // 加载缓存
    loadCache() {
        try {
            const cached = GM_getValue(this.CACHE_KEY, null);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            console.log(`缓存已加载 (${new Date(cacheData.timestamp).toLocaleString()})`);
            return cacheData;
        } catch (error) {
            console.error('加载缓存失败:', error);
            return null;
        }
    }

    // 获取缓存信息
    getCacheInfo() {
        const cacheData = this.loadCache();
        if (!cacheData) {
            return {
                exists: false,
                count: 0,
                timestamp: null,
                size: 0
            };
        }

        return {
            exists: true,
            count: cacheData.data.length,
            timestamp: new Date(cacheData.timestamp).toLocaleString(),
            size: new Blob([JSON.stringify(cacheData)]).size,
            timestampRaw: cacheData.timestamp
        };
    }

    // 清除缓存
    clearCache() {
        try {
            GM_deleteValue(this.CACHE_KEY);
            console.log('缓存已清除');
            return true;
        } catch (error) {
            console.error('清除缓存失败:', error);
            return false;
        }
    }

    // 检查缓存是否存在
    hasCache() {
        return this.loadCache() !== null;
    }

    // ========== 本地存储管理 ==========

    // 保存到本地存储
    saveToStorage(name, data) {
        try {
            const storageItem = {
                name: name,
                timestamp: Date.now(),
                data: data,
                count: data.length
            };

            // 保存单个数据集
            GM_setValue(`${this.STORAGE_KEY}_${name}`, JSON.stringify(storageItem));

            // 更新存储列表
            this.updateStorageList(name, 'add');

            console.log(`数据已保存到本地存储: ${name}`);
            return true;
        } catch (error) {
            console.error('保存到本地存储失败:', error);
            return false;
        }
    }

    // 从本地存储加载
    loadFromStorage(name) {
        try {
            const stored = GM_getValue(`${this.STORAGE_KEY}_${name}`, null);
            if (!stored) return null;
            
            const item = JSON.parse(stored);
            console.log(`已从本地存储加载: ${name}`);
            return item.data;
        } catch (error) {
            console.error('从本地存储加载失败:', error);
            return null;
        }
    }

    // 获取所有本地存储
    getAllStorages() {
        try {
            const list = GM_getValue(this.STORAGE_LIST_KEY, '[]');
            const storageList = JSON.parse(list);

            const storages = [];
            storageList.forEach(name => {
                const stored = GM_getValue(`${this.STORAGE_KEY}_${name}`, null);
                if (stored) {
                    const item = JSON.parse(stored);
                    storages.push({
                        name: item.name,
                        timestamp: new Date(item.timestamp).toLocaleString(),
                        count: item.count,
                        size: new Blob([stored]).size,
                        timestampRaw: item.timestamp
                    });
                }
            });

            return storages.sort((a, b) => b.timestampRaw - a.timestampRaw);
        } catch (error) {
            console.error('获取本地存储列表失败:', error);
            return [];
        }
    }

    // 更新存储列表
    updateStorageList(name, action = 'add') {
        try {
            const list = GM_getValue(this.STORAGE_LIST_KEY, '[]');
            let storageList = JSON.parse(list);

            if (action === 'add') {
                if (!storageList.includes(name)) {
                    storageList.push(name);
                }
            } else if (action === 'remove') {
                storageList = storageList.filter(item => item !== name);
            }

            GM_setValue(this.STORAGE_LIST_KEY, JSON.stringify(storageList));
        } catch (error) {
            console.error('更新存储列表失败:', error);
        }
    }

    // 从本地存储删除
    deleteFromStorage(name) {
        try {
            GM_deleteValue(`${this.STORAGE_KEY}_${name}`);
            this.updateStorageList(name, 'remove');
            console.log(`已从本地存储删除: ${name}`);
            return true;
        } catch (error) {
            console.error('删除本地存储失败:', error);
            return false;
        }
    }

    // 清除所有本地存储
    clearAllStorages() {
        try {
            const list = GM_getValue(this.STORAGE_LIST_KEY, '[]');
            const storageList = JSON.parse(list);

            storageList.forEach(name => {
                GM_deleteValue(`${this.STORAGE_KEY}_${name}`);
            });

            GM_deleteValue(this.STORAGE_LIST_KEY);
            console.log('所有本地存储已清除');
            return true;
        } catch (error) {
            console.error('清除所有本地存储失败:', error);
            return false;
        }
    }

    // ========== 导入/导出 ==========

    // 导出为JSON
    exportToJSON(data, filename = 'tags_export.json') {
        try {
            const exportData = {
                exportTime: new Date().toISOString(),
                version: '1.0',
                itemCount: data.length,
                data: data
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log(`数据已导出: ${filename}`);
            return true;
        } catch (error) {
            console.error('导出JSON失败:', error);
            return false;
        }
    }

    // 从JSON导入
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const importData = JSON.parse(content);

                    // 验证导入数据格式
                    if (!importData.data || !Array.isArray(importData.data)) {
                        reject(new Error('导入文件格式不正确'));
                        return;
                    }

                    // 验证数据项格式
                    const validData = importData.data.filter(item =>
                        item.english && item.chinese && item.description !== undefined
                    );

                    if (validData.length === 0) {
                        reject(new Error('导入文件中没有有效的数据'));
                        return;
                    }

                    console.log(`已从JSON导入 ${validData.length} 条数据`);
                    resolve(validData);
                } catch (error) {
                    reject(new Error('导入JSON失败: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };

            reader.readAsText(file);
        });
    }

    // 从CSV导入
    async importFromCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const data = [];

                    // 跳过表头行（如果有）
                    const startIndex = this.isCSVHeader(lines[0]) ? 1 : 0;

                    for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const parts = this.parseCSVLine(line);
                        if (parts.length >= 3) {
                            data.push({
                                english: parts[0].trim(),
                                chinese: parts[1].trim(),
                                description: parts[2].trim()
                            });
                        }
                    }

                    if (data.length === 0) {
                        reject(new Error('导入文件中没有有效的数据'));
                        return;
                    }

                    console.log(`已从CSV导入 ${data.length} 条数据`);
                    resolve(data);
                } catch (error) {
                    reject(new Error('导入CSV失败: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };

            reader.readAsText(file);
        });
    }

    // 检查CSV是否有表头
    isCSVHeader(firstLine) {
        const parts = this.parseCSVLine(firstLine);
        const headers = ['english', 'tag', '标签', 'description', '描述', 'col', '列'];
        return parts.some(part => 
            headers.some(header => part.toLowerCase().includes(header))
        );
    }

    // CSV行解析
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    // 获取统计信息
    getStatistics() {
        const cacheInfo = this.getCacheInfo();
        const storages = this.getAllStorages();
        const totalStorageSize = storages.reduce((sum, s) => sum + s.size, 0);

        return {
            cache: cacheInfo,
            storages: storages,
            storageCount: storages.length,
            totalStorageSize: totalStorageSize,
            totalSize: cacheInfo.size + totalStorageSize
        };
    }
}

// ==================== 更新DataManager类 ====================
class DataManager {
    constructor(config) {
        this.config = config;
        this.data = [];
        this.storageManager = new StorageManager(config);
    }

    // 从Google Sheets获取数据
    async fetchFromSpreadsheet() {
        try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${this.config.SPREADSHEET_ID}/export?format=csv&gid=${this.config.SHEET_GID}`;
            
            const response = await fetch(csvUrl);
            const csv = await response.text();
            this.parseCSV(csv);
            
            // 自动保存到缓存
            this.storageManager.saveCache(this.data);
            
            return this.data;
        } catch (error) {
            console.error('获取数据失败:', error);
            // 如果获取失败，尝试从缓存读取
            const cacheData = this.storageManager.loadCache();
            if (cacheData) {
                this.data = cacheData.data;
                console.log('已从缓存加载数据');
                return this.data;
            }
            return [];
        }
    }

    // 解析CSV数据
    parseCSV(csv) {
        const lines = csv.split('\n');
        this.data = [];
        
        for (let i = this.config.DATA_START_ROW - 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = this.parseCSVLine(line);
            if (parts.length >= 3) {
                this.data.push({
                    english: parts[0].trim(),
                    chinese: parts[1].trim(),
                    description: parts[2].trim()
                });
            }
        }
        
        console.log(`已加载 ${this.data.length} 条数据`);
    }

    // CSV行解析
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    // 搜索数据
    search(keyword) {
        if (!keyword) return this.data;
        
        const lowerKeyword = keyword.toLowerCase();
        return this.data.filter(item => 
            item.english.toLowerCase().includes(lowerKeyword) ||
            item.chinese.toLowerCase().includes(lowerKeyword) ||
            item.description.toLowerCase().includes(lowerKeyword)
        );
    }

    // 获取所有数据
    getAll() {
        return this.data;
    }

    // 刷新数据
    async refresh() {
        console.log('正在刷新数据...');
        return await this.fetchFromSpreadsheet();
    }
}

// ==================== 设置管理模块 ====================
class SettingsManager {
    constructor(dataManager, uiManager) {
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.storageManager = dataManager.storageManager;
    }

    // 初始化设置页面
    initSettingsTab() {
        this.setupDataManagementTab();
        this.setupLocalStorageTab();
        this.setupInterfaceSettingsTab();
    }

    // ========== 数据管理标签页 ==========
    setupDataManagementTab() {
        const container = document.getElementById('tagPanel-data-management-tab');
        
        container.innerHTML = `
            <div class="tagPanel-settings-section">
                <h3 class="tagPanel-settings-title">📊 缓存管理</h3>
                
                <div class="tagPanel-settings-item">
                    <div class="tagPanel-settings-info" id="tagPanel-cache-info">
                        <div>状态: 未缓存</div>
                        <div>数据量: 0 条</div>
                        <div>时间: -</div>
                    </div>
                </div>

                <div class="tagPanel-settings-actions">
                    <button class="tagPanel-btn-small" id="tagPanel-btn-refresh-data">
                        🔄 刷新数据
                    </button>
                    <button class="tagPanel-btn-small" id="tagPanel-btn-clear-cache">
                        🗑️ 清除缓存
                    </button>
                </div>

                <div class="tagPanel-divider"></div>

                <h3 class="tagPanel-settings-title">📥 导入数据</h3>
                <div class="tagPanel-settings-actions">
                    <label class="tagPanel-file-input-label">
                        <input type="file" id="tagPanel-import-json" accept=".json" style="display: none;">
                        📄 导入 JSON
                    </label>
                    <label class="tagPanel-file-input-label">
                        <input type="file" id="tagPanel-import-csv" accept=".csv" style="display: none;">
                        📋 导入 CSV
                    </label>
                </div>

                <div class="tagPanel-divider"></div>

                <h3 class="tagPanel-settings-title">📤 导出数据</h3>
                <div class="tagPanel-settings-actions">
                    <button class="tagPanel-btn-small" id="tagPanel-btn-export-json">
                        📄 导出为 JSON
                    </button>
                    <button class="tagPanel-btn-small" id="tagPanel-btn-export-csv">
                        📋 导出为 CSV
                    </button>
                </div>
            </div>
        `;

        this.attachDataManagementListeners();
    }

    attachDataManagementListeners() {
        // 刷新缓存显示
        this.updateCacheInfo();

        // 刷新数据
        document.getElementById('tagPanel-btn-refresh-data').addEventListener('click', async () => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '⏳ 刷新中...';
            btn.disabled = true;

            try {
                await this.dataManager.refresh();
                this.uiManager.renderTagsList(this.dataManager.getAll());
                this.updateCacheInfo();
                this.showNotification('✅ 数据已刷新');
            } catch (error) {
                this.showNotification('❌ 刷新失败: ' + error.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });

        // 清除缓存
        document.getElementById('tagPanel-btn-clear-cache').addEventListener('click', () => {
            if (confirm('确定要清除缓存吗？')) {
                this.storageManager.clearCache();
                this.dataManager.data = [];
                this.uiManager.renderTagsList([]);
                this.updateCacheInfo();
                this.showNotification('✅ 缓存已清除');
            }
        });

        // 导入JSON
        document.getElementById('tagPanel-import-json').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const data = await this.storageManager.importFromJSON(file);
                this.dataManager.data = data;
                this.storageManager.saveCache(data);
                this.uiManager.renderTagsList(data);
                this.updateCacheInfo();
                this.showNotification(`✅ 已导入 ${data.length} 条数据`);
            } catch (error) {
                this.showNotification('❌ 导入失败: ' + error.message);
            }

            // 重置input
            e.target.value = '';
        });

        // 导入CSV
        document.getElementById('tagPanel-import-csv').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const data = await this.storageManager.importFromCSV(file);
                this.dataManager.data = data;
                this.storageManager.saveCache(data);
                this.uiManager.renderTagsList(data);
                this.updateCacheInfo();
                this.showNotification(`✅ 已导入 ${data.length} 条数据`);
            } catch (error) {
                this.showNotification('❌ 导入失败: ' + error.message);
            }

            // 重置input
            e.target.value = '';
        });

        // 导出JSON
        document.getElementById('tagPanel-btn-export-json').addEventListener('click', () => {
            const data = this.dataManager.getAll();
            if (data.length === 0) {
                this.showNotification('⚠️ 没有数据可导出');
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 10);
            this.storageManager.exportToJSON(data, `tags_${timestamp}.json`);
            this.showNotification('✅ 已导出 JSON 文件');
        });

        // 导出CSV
        document.getElementById('tagPanel-btn-export-csv').addEventListener('click', () => {
            const data = this.dataManager.getAll();
            if (data.length === 0) {
                this.showNotification('⚠️ 没有数据可导出');
                return;
            }

            const csv = this.convertToCSV(data);
            const timestamp = new Date().toISOString().slice(0, 10);
            this.downloadCSV(csv, `tags_${timestamp}.csv`);
            this.showNotification('✅ 已导出 CSV 文件');
        });
    }

    // ========== 本地存储标签页 ==========
    setupLocalStorageTab() {
        const container = document.getElementById('tagPanel-local-storage-tab');
        
        container.innerHTML = `
            <div class="tagPanel-settings-section">
                <h3 class="tagPanel-settings-title">💾 已保存的数据集</h3>
                
                <div class="tagPanel-settings-item">
                    <input 
                        type="text" 
                        id="tagPanel-storage-name" 
                        placeholder="输入数据集名称..." 
                        class="tagPanel-input-text"
                    >
                    <button class="tagPanel-btn-small" id="tagPanel-btn-save-storage">
                        💾 保存当前数据
                    </button>
                </div>

                <div class="tagPanel-divider"></div>

                <div id="tagPanel-storage-list" class="tagPanel-storage-list">
                    <div style="color: #AAA; padding: 20px; text-align: center;">暂无保存的数据集</div>
                </div>

                <div class="tagPanel-divider"></div>

                <div class="tagPanel-settings-actions">
                    <button class="tagPanel-btn-small" id="tagPanel-btn-clear-all-storage">
                        🗑️ 清除所有存储
                    </button>
                </div>
            </div>
        `;

        this.attachLocalStorageListeners();
    }

    attachLocalStorageListeners() {
        // 保存数据集
        document.getElementById('tagPanel-btn-save-storage').addEventListener('click', () => {
            const name = document.getElementById('tagPanel-storage-name').value.trim();
            if (!name) {
                this.showNotification('⚠️ 请输入数据集名称');
                return;
            }

            const data = this.dataManager.getAll();
            if (data.length === 0) {
                this.showNotification('⚠️ 没有数据可保存');
                return;
            }

            this.storageManager.saveToStorage(name, data);
            document.getElementById('tagPanel-storage-name').value = '';
            this.updateStorageList();
            this.showNotification(`✅ 已保存数据集: ${name}`);
        });

        // 清除所有存储
        document.getElementById('tagPanel-btn-clear-all-storage').addEventListener('click', () => {
            if (confirm('确定要清除所有已保存的数据集吗？')) {
                this.storageManager.clearAllStorages();
                this.updateStorageList();
                this.showNotification('✅ 所有存储已清除');
            }
        });

        this.updateStorageList();
    }

    updateStorageList() {
        const container = document.getElementById('tagPanel-storage-list');
        const storages = this.storageManager.getAllStorages();

        if (storages.length === 0) {
            container.innerHTML = '<div style="color: #AAA; padding: 20px; text-align: center;">暂无保存的数据集</div>';
            return;
        }

        container.innerHTML = '';
        storages.forEach(storage => {
            const item = document.createElement('div');
            item.className = 'tagPanel-storage-item';
            item.innerHTML = `
                <div class="tagPanel-storage-info">
                    <div class="tagPanel-storage-name">${this.escapeHtml(storage.name)}</div>
                    <div class="tagPanel-storage-meta">
                        📊 ${storage.count} 条 | ⏰ ${storage.timestamp} | 💾 ${(storage.size / 1024).toFixed(2)} KB
                    </div>
                </div>
                <div class="tagPanel-storage-actions">
                    <button class="tagPanel-btn-tiny" data-action="load" data-name="${storage.name}">📂</button>
                    <button class="tagPanel-btn-tiny" data-action="delete" data-name="${storage.name}">🗑️</button>
                </div>
            `;

            // 加载数据集
            item.querySelector('[data-action="load"]').addEventListener('click', () => {
                const data = this.storageManager.loadFromStorage(storage.name);
                if (data) {
                    this.dataManager.data = data;
                    this.uiManager.renderTagsList(data);
                    this.showNotification(`✅ 已加载: ${storage.name}`);
                }
            });

            // 删除数据集
            item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                if (confirm(`确定要删除 "${storage.name}" 吗？`)) {
                    this.storageManager.deleteFromStorage(storage.name);
                    this.updateStorageList();
                    this.showNotification(`✅ 已删除: ${storage.name}`);
                }
            });

            container.appendChild(item);
        });
    }

    // ========== 界面设置标签页 ==========
    setupInterfaceSettingsTab() {
        const container = document.getElementById('tagPanel-interface-settings-tab');
        const shortcutKey = GM_getValue('tagPanel_shortcut_key', 'Alt+T');
        const hideBtn = GM_getValue('tagPanel_hide_btn', false);

        container.innerHTML = `
            <div class="tagPanel-settings-section">
                <h3 class="tagPanel-settings-title">⌨️ 快捷键设置</h3>
                
                <div class="tagPanel-settings-item">
                    <label class="tagPanel-settings-label">打开/关闭面板：</label>
                    <input 
                        type="text" 
                        id="tagPanel-shortcut-input" 
                        placeholder="例如: Alt+T, Ctrl+Shift+E" 
                        class="tagPanel-input-text"
                        value="${shortcutKey}"
                    >
                    <small style="color: #888; display: block; margin-top: 5px;">
                        格式: Ctrl, Alt, Shift 与字母/数字用 + 连接<br>
                        示例: Alt+T, Ctrl+E, Ctrl+Shift+S
                    </small>
                </div>

                <div class="tagPanel-settings-actions">
                    <button class="tagPanel-btn-small" id="tagPanel-btn-save-shortcut">
                        💾 保存快捷键
                    </button>
                </div>

                <div class="tagPanel-divider"></div>

                <h3 class="tagPanel-settings-title">👁️ 界面设置</h3>

                <div class="tagPanel-settings-item">
                    <label class="tagPanel-checkbox-label">
                        <input type="checkbox" id="tagPanel-hide-btn-checkbox" ${hideBtn ? 'checked' : ''}>
                        隐藏启动按钮（可通过快捷键打开）
                    </label>
                </div>

                <div class="tagPanel-divider"></div>

                <h3 class="tagPanel-settings-title">ℹ️ 关于</h3>
                <div class="tagPanel-settings-info">
                    <div>📌 版本: 1.0</div>
                    <div>🎮 主题: Game Menu Style</div>
                    <div id="tagPanel-stats">
                        <div>数据统计: 加载中...</div>
                    </div>
                </div>
            </div>
        `;

        this.attachInterfaceSettingsListeners();
    }

    attachInterfaceSettingsListeners() {
        // 保存快捷键
        document.getElementById('tagPanel-btn-save-shortcut').addEventListener('click', () => {
            const shortcut = document.getElementById('tagPanel-shortcut-input').value.trim();
            
            if (!shortcut) {
                this.showNotification('⚠️ 请输入快捷键');
                return;
            }

            // 简单验证
            if (!this.validateShortcut(shortcut)) {
                this.showNotification('⚠️ 快捷键格式不正确');
                return;
            }

            GM_setValue('tagPanel_shortcut_key', shortcut);
            this.showNotification(`✅ 快捷键已保存: ${shortcut}`);
        });

        // 隐藏启动按钮
        document.getElementById('tagPanel-hide-btn-checkbox').addEventListener('change', (e) => {
            const hideBtn = e.target.checked;
            GM_setValue('tagPanel_hide_btn', hideBtn);

            if (hideBtn) {
                this.uiManager.launchBtn.classList.add('hidden');
            } else {
                this.uiManager.launchBtn.classList.remove('hidden');
            }

            this.showNotification(hideBtn ? '✅ 启动按钮已隐藏' : '✅ 启动按钮已显示');
        });

        // 更新统计信息
        this.updateStatistics();
    }

    // ========== 辅助方法 ==========

    // 验证快捷键格式
    validateShortcut(shortcut) {
        const parts = shortcut.split('+').map(p => p.trim());
        if (parts.length < 2) return false;

        const validModifiers = ['ctrl', 'alt', 'shift'];
        const modifiersCount = parts.filter(p => validModifiers.includes(p.toLowerCase())).length;
        
        // 至少需要一个功能键或修饰符
        return modifiersCount >= 1 && parts.length > modifiersCount;
    }

    // 更新缓存信息
    updateCacheInfo() {
        const cacheInfo = this.storageManager.getCacheInfo();
        const infoDiv = document.getElementById('tagPanel-cache-info');
        
        if (!infoDiv) return;

        if (cacheInfo.exists) {
            infoDiv.innerHTML = `
                <div>✅ 状态: 已缓存</div>
                <div>📊 数据量: ${cacheInfo.count} 条</div>
                <div>💾 大小: ${(cacheInfo.size / 1024).toFixed(2)} KB</div>
                <div>⏰ 时间: ${cacheInfo.timestamp}</div>
            `;
        } else {
            infoDiv.innerHTML = `
                <div>⚠️ 状态: 未缓存</div>
                <div>📊 数据量: 0 条</div>
                <div>⏰ 时间: -</div>
            `;
        }
    }

    // 更新统计信息
    updateStatistics() {
        const statsDiv = document.getElementById('tagPanel-stats');
        if (!statsDiv) return;

        const stats = this.storageManager.getStatistics();
        const totalSize = (stats.totalSize / 1024).toFixed(2);
        const cacheSize = (stats.cache.size / 1024).toFixed(2);
        const storageSize = (stats.totalStorageSize / 1024).toFixed(2);

        statsDiv.innerHTML = `
            <div>📊 当前数据: ${this.dataManager.data.length} 条</div>
            <div>💾 缓存: ${stats.cache.count} 条 (${cacheSize} KB)</div>
            <div>📦 存储集: ${stats.storageCount} 个 (${storageSize} KB)</div>
            <div>📈 总大小: ${totalSize} KB</div>
        `;
    }

    // 转换为CSV
    convertToCSV(data) {
        let csv = 'English TAG,中文标签,描述\n';
        
        data.forEach(item => {
            const english = `"${(item.english || '').replace(/"/g, '""')}"`;
            const chinese = `"${(item.chinese || '').replace(/"/g, '""')}"`;
            const description = `"${(item.description || '').replace(/"/g, '""')}"`;
            csv += `${english},${chinese},${description}\n`;
        });

        return csv;
    }

    // 下载CSV
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // 显示通知
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'tagPanel-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // 2秒后移除
        setTimeout(() => {
            notification.classList.add('fadeout');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==================== 更新UIManager类 ====================
class UIManager {
    constructor() {
        this.dataManager = null;
        this.settingsManager = null;
        this.currentData = [];
        this.launchBtn = null;
        this.mainPanel = null;
        this.isVisible = false;
    }

    // 初始化UI管理器
    init(dataManager) {
        this.dataManager = dataManager;
        this.settingsManager = new SettingsManager(dataManager, this);
        
        this.setupElements();
        this.setupEventListeners();
        this.restoreSettings();
        this.settingsManager.initSettingsTab();
    }

    // 获取DOM元素
    setupElements() {
        this.launchBtn = document.getElementById('tagPanel-launch-btn');
        this.mainPanel = document.getElementById('tagPanel-main');
        this.searchInput = document.getElementById('tagPanel-search-input');
        this.tagsList = document.getElementById('tagPanel-tags-list');
        this.closeBtn = document.getElementById('tagPanel-close-btn');
        this.tabs = document.querySelectorAll('.tagPanel-tab');
        this.tabContents = document.querySelectorAll('.tagPanel-tab-content');
    }

    // 设置事件监听
    setupEventListeners() {
        // 启动按钮
        this.launchBtn.addEventListener('click', () => this.togglePanel());

        // 关闭按钮
        this.closeBtn.addEventListener('click', () => this.hidePanel());

        // 搜索框
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // 标签页切换
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 快捷键监听
        document.addEventListener('keydown', (e) => this.handleShortcut(e));

        // 页面失焦时关闭面板
        document.addEventListener('click', (e) => {
            if (!this.mainPanel.contains(e.target) && e.target !== this.launchBtn) {
                if (this.isVisible) {
                    this.hidePanel();
                }
            }
        });
    }

    // 切换面板显示/隐藏
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    // 显示面板
    async showPanel() {
        // 如果数据为空，先加载数据
        if (this.dataManager.data.length === 0) {
            console.log('加载数据中...');
            await this.dataManager.fetchFromSpreadsheet();
        }

        this.currentData = this.dataManager.getAll();
        this.renderTagsList(this.currentData);
        this.mainPanel.style.display = 'flex';
        this.isVisible = true;
        this.searchInput.focus();
        
        // 重置搜索框
        this.searchInput.value = '';
    }

    // 隐藏面板
    hidePanel() {
        this.mainPanel.style.display = 'none';
        this.isVisible = false;
    }

    // 搜索处理
    handleSearch(keyword) {
        const results = this.dataManager.search(keyword);
        this.currentData = results;
        this.renderTagsList(results);
    }

    // 渲染标签列表
    renderTagsList(items) {
        this.tagsList.innerHTML = '';

        if (items.length === 0) {
            this.tagsList.innerHTML = '<div style="color: #AAA; padding: 20px; text-align: center;">未找到匹配的标签</div>';
            return;
        }

        items.forEach(item => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tagPanel-tag-item';
            tagElement.innerHTML = `
                <div class="tagPanel-tag-name">${this.escapeHtml(item.english)}</div>
                <div class="tagPanel-tag-chinese">${this.escapeHtml(item.chinese)}</div>
                <div class="tagPanel-tag-desc">${this.escapeHtml(item.description)}</div>
            `;
            
            // 点击复制到剪贴板
            tagElement.addEventListener('click', () => {
                const text = `${item.english} (${item.chinese})`;
                navigator.clipboard.writeText(text).then(() => {
                    this.settingsManager.showNotification(`✅ 已复制: ${text}`);
                });
            });
            
            this.tagsList.appendChild(tagElement);
        });
    }

    // 标签页切换
    switchTab(tabName) {
        // 更新标签页状态
        this.tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // 更新内容显示
        this.tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `tagPanel-${tabName}-tab`) {
                content.classList.add('active');
            }
        });

        // 如果切换到设置页，刷新统计
        if (tabName === 'interface-settings') {
            this.settingsManager.updateStatistics();
        }
    }

    // 快捷键处理
    handleShortcut(e) {
        const shortcutKey = GM_getValue('tagPanel_shortcut_key', 'Alt+T');
        
        if (this.matchesShortcut(e, shortcutKey)) {
            e.preventDefault();
            this.togglePanel();
        }
    }

    // 检查是否匹配快捷键
    matchesShortcut(e, shortcut) {
        const parts = shortcut.split('+').map(p => p.trim().toLowerCase());
        
        const hasCtrl = parts.includes('ctrl') && e.ctrlKey;
        const hasAlt = parts.includes('alt') && e.altKey;
        const hasShift = parts.includes('shift') && e.shiftKey;
        
        let keyMatch = false;
        for (let part of parts) {
            if (!['ctrl', 'alt', 'shift'].includes(part)) {
                keyMatch = e.key.toLowerCase() === part || e.code.toLowerCase() === `key${part}`;
                break;
            }
        }

        const ctrlNeeded = parts.includes('ctrl');
        const altNeeded = parts.includes('alt');
        const shiftNeeded = parts.includes('shift');

        return keyMatch && 
               (!ctrlNeeded || hasCtrl) && 
               (!altNeeded || hasAlt) && 
               (!shiftNeeded || hasShift);
    }

    // 恢复设置
    restoreSettings() {
        const hideBtn = GM_getValue('tagPanel_hide_btn', false);
        if (hideBtn) {
            this.launchBtn.classList.add('hidden');
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
