// ==UserScript==
// @name         nhentai图像链接提取器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  输入本子链接，或本子序号，自动提取图像链接
// @author       https://t.me/BGG_Comics
// @icon         https://icon.horse/icon/nhentai.net
// @license      GPL-3
// @match        https://nhentai.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
        .image-processor-panel {
            position: fixed;
            top: 70px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 8px;
            padding: 15px 20px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        }

        .image-processor-panel:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .image-processor-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10001;
            align-items: center;
            justify-content: center;
        }

        .image-processor-modal.show {
            display: flex;
        }

        .image-processor-content {
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 700px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .image-processor-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #333;
        }

        .image-processor-label {
            display: block;
            margin-top: 15px;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }

        .image-processor-input,
        .image-processor-textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #ff6b6b;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            box-sizing: border-box;
            box-shadow: 0 0 8px rgba(128, 128, 128, 0.3);
        }

        .image-processor-input {
            height: auto;
            margin-bottom: 15px;
        }

        .image-processor-textarea {
            height: 200px;
            resize: vertical;
            font-size: 12px;
        }

        .image-processor-input:focus,
        .image-processor-textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .image-processor-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .image-processor-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .btn-fetch {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-fetch:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-copy {
            background: #4CAF50;
            color: white;
        }

        .btn-copy:hover {
            background: #45a049;
        }

        .btn-close {
            background: #f0f0f0;
            color: #333;
        }

        .btn-close:hover {
            background: #e0e0e0;
        }

        .image-processor-result {
            background: #f5f5f5;
            border: 2px solid #ddd;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            max-height: 250px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #333;
            display: none;
        }

        .image-processor-status {
            margin-top: 15px;
            padding: 12px;
            border-radius: 4px;
            font-size: 13px;
            text-align: center;
            display: none;
        }

        .image-processor-status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .image-processor-status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .image-processor-status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }

        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 3px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top-color: #667eea;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // 处理单个链接
    function processLink(url) {
        // 验证链接格式
        const linkPattern = /^https:\/\/[^\/]+\.nhentai\.net\/galleries\/[^\/]+\/[^\/]+\.[a-z0-9]+(\.[a-z0-9]+)?$/i;
        if (!linkPattern.test(url)) {
            return null;
        }

        // 过滤cover和thumb
        if (/(\/cover\.|\/thumb\.)/i.test(url)) {
            return null;
        }

        // 替换 t 为 i（域名部分）
        url = url.replace(/\/\/t(\d+)\./, '//i$1.');

        // 处理文件名
        url = url.replace(/\/t(\d+)\.([a-z0-9]+)(?:\.[a-z0-9]+)*(\s|$)/gi, (match, num, ext, ending) => {
            return `/${num}.${ext}${ending}`;
        });

        url = url.replace(/\/(\d+)t\.([a-z0-9]+)(?:\.[a-z0-9]+)*(\s|$)/gi, (match, num, ext, ending) => {
            return `/${num}.${ext}${ending}`;
        });

        return url;
    }

    // 从当前页面提取图像链接
    function extractImagesFromPage() {
        const images = document.querySelectorAll('img');
        const links = [];

        images.forEach((img) => {
            const src = img.src || img.getAttribute('data-src') || '';
            if (src && !src.startsWith('data:') && src.includes('nhentai')) {
                links.push(src);
            }
        });

        return links;
    }

    // 从HTML获取图像链接
    function extractImagesFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.querySelectorAll('img');
        const links = [];

        images.forEach((img) => {
            const src = img.src || img.getAttribute('data-src') || '';
            if (src && !src.startsWith('data:') && src.includes('nhentai')) {
                links.push(src);
            }
        });

        return links;
    }

    // 创建面板按钮
    const panelBtn = document.createElement('div');
    panelBtn.className = 'image-processor-panel';
    panelBtn.textContent = '🖼️ 图像链接提取器';
    document.body.appendChild(panelBtn);

    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'image-processor-modal';
    modal.innerHTML = `
        <div class="image-processor-content">
            <div class="image-processor-title">nhentai 图像链接提取器</div>

            <label class="image-processor-label">📌 输入本子链接或ID：</label>
            <input id="gallery-input" class="image-processor-input" type="text" placeholder="例如: https://nhentai.net/g/682478/ 或 682478">

            <label class="image-processor-label">📊 图像链接：</label>
            <div id="processor-result" class="image-processor-result"></div>
            <div id="processor-status" class="image-processor-status"></div>

            <div class="image-processor-buttons">
                <button class="image-processor-btn btn-fetch" id="btn-fetch">开始</button>
                <button class="image-processor-btn btn-copy" id="btn-copy" style="display:none;">📋 复制结果</button>
                <button class="image-processor-btn btn-close" id="btn-close">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 元素引用
    const galleryInput = document.getElementById('gallery-input');
    const resultArea = document.getElementById('processor-result');
    const statusArea = document.getElementById('processor-status');
    const fetchBtn = document.getElementById('btn-fetch');
    const copyBtn = document.getElementById('btn-copy');
    const closeBtn = document.getElementById('btn-close');

    // 打开模态框
    panelBtn.addEventListener('click', () => {
        modal.classList.add('show');
        // 如果当前页面是gallery页面，自动填充
        const currentUrl = window.location.href;
        if (currentUrl.includes('nhentai.net/g/')) {
            const match = currentUrl.match(/\/g\/(\d+)/);
            if (match) {
                galleryInput.value = match[1];
            }
        }
    });

    // 关闭模态框
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // 显示状态
    function showStatus(message, type) {
        statusArea.textContent = message;
        statusArea.className = `image-processor-status ${type}`;
        statusArea.style.display = 'block';
    }

    // 获取并处理链接
    fetchBtn.addEventListener('click', async () => {
        let input = galleryInput.value.trim();

        if (!input) {
            showStatus('❌ 请输入本子链接或ID', 'error');
            resultArea.style.display = 'none';
            copyBtn.style.display = 'none';
            return;
        }

        // 提取ID并构建URL
        let galleryId = input;
        if (input.includes('nhentai.net')) {
            const match = input.match(/\/g\/(\d+)/);
            if (!match) {
                showStatus('❌ 链接格式不正确', 'error');
                resultArea.style.display = 'none';
                copyBtn.style.display = 'none';
                return;
            }
            galleryId = match[1];
        }

        const galleryUrl = `https://nhentai.net/g/${galleryId}/`;

        // 显示加载状态
        fetchBtn.disabled = true;
        fetchBtn.textContent = '⏳ 加载中...';
        showStatus('🔄 正在获取页面...', 'info');

        try {
            // 获取gallery页面
            const response = await fetch(galleryUrl);
            if (!response.ok) {
                throw new Error('页面加载失败，请检查本子ID是否正确');
            }

            const html = await response.text();
            const images = extractImagesFromHTML(html);

            if (images.length === 0) {
                showStatus('❌ 未找到任何链接', 'error');
                resultArea.style.display = 'none';
                copyBtn.style.display = 'none';
                fetchBtn.disabled = false;
                fetchBtn.textContent = '获取并处理';
                return;
            }

            // 处理提取到的链接
            const processed = images
                .map(link => processLink(link.trim()))
                .filter(link => link !== null);

            if (processed.length === 0) {
                showStatus('❌ 所有链接都被过滤（可能是cover或thumb）', 'error');
                resultArea.style.display = 'none';
                copyBtn.style.display = 'none';
                fetchBtn.disabled = false;
                fetchBtn.textContent = '获取并处理';
                return;
            }

            resultArea.textContent = processed.join('\n');
            resultArea.style.display = 'block';
            copyBtn.style.display = 'flex';
            const filtered = images.length - processed.length;
            const filterMsg = filtered > 0 ? `（已自动过滤 ${filtered} 条无效链接）` : '';
            showStatus(`✓ 成功获取 ${processed.length} 条有效链接${filterMsg}`, 'success');

        } catch (error) {
            showStatus(`❌ 错误: ${error.message}`, 'error');
            resultArea.style.display = 'none';
            copyBtn.style.display = 'none';
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '开始';
        }
    });

    // 复制结果
    copyBtn.addEventListener('click', () => {
        const text = resultArea.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showStatus('✓ 已复制到剪贴板！', 'success');
            copyBtn.textContent = '✓ 已复制';
            setTimeout(() => {
                copyBtn.textContent = '📋 复制结果';
            }, 2000);
        }).catch(err => {
            showStatus('✗ 复制失败: ' + err.message, 'error');
        });
    });
})();