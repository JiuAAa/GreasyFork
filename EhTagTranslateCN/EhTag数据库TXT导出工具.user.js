// ==UserScript==
// @name         EhTag数据库TXT导出工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从EhTagTranslation数据库导出标签为TXT文件
// @author       https://t.me/BGG_Comics
// @match        https://exhentai.org/*
// @match        https://e-hentai.org/*
// @license GPL-3.0
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @source       https://github.com/EhTagTranslation/Database
// @supportURL   https://t.me/BGG_Comics
// @homepageURL  https://t.me/BGG_Comics
// ==/UserScript==

(function() {
    'use strict';

    const DB_BASE_URL = 'https://raw.githubusercontent.com/EhTagTranslation/Database/master/database';
    const MARKDOWN_IMG_PATTERN = /!\[.*?\]\(.*?\)/g;
    const HTML_BR_PATTERN = /<br\s*\/?>/gi;
    const HTML_TAG_PATTERN = /<[^>]*>/g;
    const WHITESPACE_PATTERN = /\s+/g;

    let tagList = [];
    let isLoading = false;
    let categories = [];

    // 创建控制面板
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'ehtag-export-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 10px;
            transform: translateY(-50%);
            z-index: 10000;
            background: #fff;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
            width: 120px;
        `;

        const buttons = [
            { id: 'fetch-ehtag-btn', label: '获取数据库', bg: '#0066cc', handler: fetchDatabase },
            { id: 'export-txt-btn', label: '导出为TXT', bg: '#28a745', handler: exportToTXT, hidden: true },
            { id: 'copy-txt-btn', label: '复制剪贴板', bg: '#17a2b8', handler: copyToClipboard, hidden: true }
        ];

        let buttonsHTML = buttons.map(btn => `
            <button id="${btn.id}" style="
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: ${btn.bg};
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                ${btn.hidden ? 'display: none;' : ''}
            ">${btn.label}</button>
        `).join('');

        panel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #333; font-size: 13px;">
                EhTag 导出
            </div>
            ${buttonsHTML}
            <div id="status-message" style="
                margin-top: 10px;
                padding: 8px;
                background: #f0f0f0;
                border-radius: 4px;
                color: #333;
                font-size: 11px;
                min-height: 20px;
                word-break: break-all;
            "></div>
        `;

        document.body.appendChild(panel);

        buttons.forEach(btn => {
            document.getElementById(btn.id)?.addEventListener('click', btn.handler);
        });
    }

    // 清理Markdown语法和HTML标签
    function cleanMarkdownAndHTML(text) {
        if (!text) return '';
        return text
            .replace(MARKDOWN_IMG_PATTERN, '')
            .replace(HTML_BR_PATTERN, '')
            .replace(HTML_TAG_PATTERN, '')
            .trim();
    }

    // 清理文本空格
    function cleanWhitespace(text) {
        return text.replace(WHITESPACE_PATTERN, ' ').trim();
    }

    // 解析Markdown表格行
    function parseMarkdownRow(line, minCells = 2) {
        const cells = line
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);

        if (cells.length < minCells) return null;
        return cells;
    }

    // 获取数据库
    function fetchDatabase() {
        if (isLoading) return;
        isLoading = true;
        tagList = [];
        updateStatus('正在获取...');

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${DB_BASE_URL}/rows.md`,
            onload: (response) => {
                if (response.status === 200) {
                    categories = parseRowsMd(response.responseText);
                    if (categories.length > 0) {
                        fetchAllCategories();
                    } else {
                        updateStatus('❌ 解析失败');
                        isLoading = false;
                    }
                } else {
                    updateStatus(`❌ 失败: ${response.status}`);
                    isLoading = false;
                }
            },
            onerror: () => {
                updateStatus('❌ 网络错误');
                isLoading = false;
            }
        });
    }

    // 解析rows.md获取分类列表
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

                if (['English', '原始标签', 'Chinese'].includes(englishName) ||
                    !englishName || !chineseName) {
                    return null;
                }

                console.log(`✓ ${englishName}`);
                return englishName;
            })
            .filter(Boolean);
    }

    // 获取所有分类的标签文件
    function fetchAllCategories() {
        let completed = 0;
        const total = categories.length;

        updateStatus(`获取 ${total} 个分类...`);

        categories.forEach((category) => {
            const filename = category.toLowerCase().replace(/\s+/g, '_') + '.md';

            GM_xmlhttpRequest({
                method: 'GET',
                url: `${DB_BASE_URL}/${filename}`,
                onload: (response) => {
                    if (response.status === 200) {
                        parseTagsMd(response.responseText);
                    }
                    completed++;
                    updateStatus(`${completed}/${total}`);

                    if (completed === total) finishFetching();
                },
                onerror: () => {
                    completed++;
                    if (completed === total) finishFetching();
                }
            });
        });
    }

    // 解析标签文件
    function parseTagsMd(content) {
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

                if (['Original Tag', '原始标签'].includes(originalTag) ||
                    !originalTag || !translatedName) {
                    return;
                }

                description = cleanWhitespace(description);

                tagList.push({
                    tag: originalTag,
                    name_cn: translatedName,
                    description: description
                });
            });
    }

    // 完成数据获取
    function finishFetching() {
        isLoading = false;
        document.getElementById('fetch-ehtag-btn').style.display = 'none';
        document.getElementById('export-txt-btn').style.display = 'block';
        document.getElementById('copy-txt-btn').style.display = 'block';
        updateStatus(`✅ 完成!\n${tagList.length} 条标签`);
    }

    // 生成TXT内容
    function generateTXT() {
        return tagList
            .map(item => `${item.tag}:${item.name_cn}:${item.description}`)
            .join('\n');
    }

    // 导出为TXT文件
    function exportToTXT() {
        const txt = generateTXT();
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ehtag_${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        updateStatus('✅ 已下载');
    }

    // 复制到剪贴板
    function copyToClipboard() {
        navigator.clipboard.writeText(generateTXT())
            .then(() => updateStatus('✅ 已复制'))
            .catch(() => updateStatus('❌ 复制失败'));
    }

    // 更新状态信息
    function updateStatus(message) {
        const statusDiv = document.getElementById('status-message');
        if (statusDiv) statusDiv.textContent = message;
    }

    // 初始化
    createControlPanel();
})();
