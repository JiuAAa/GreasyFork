// ==UserScript==
// @name EhTag中文提取
// @namespace http://tampermonkey.net/
// @version 1.0
// @description Translate and format tags from e-hentai/exhentai using EhTagTranslation
// @author https://t.me/BGG_Comics
// @homepage https://github.com/EhTagTranslation/Database
// @supportURL https://github.com/EhTagTranslation/Database/issues
// @license GPL-3.0
// @match *://e-hentai.org/g/*
// @match *://exhentai.org/g/*
// @icon https://raw.githubusercontent.com/EhTagTranslation/Database/master/README.md
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_deleteValue
// @downloadURL https://update.sleazyfork.org/scripts/595851/EhTag%E4%B8%AD%E6%96%87%E6%8F%90%E5%8F%96.user.js
// @updateURL https://update.sleazyfork.org/scripts/595851/EhTag%E4%B8%AD%E6%96%87%E6%8F%90%E5%8F%96.meta.js
// ==/UserScript==

(async function() {
    'use strict';

    const CACHE_KEY = 'ehTagTranslationCache';
    const CACHE_EXPIRY_KEY = 'ehTagTranslationExpiry';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const DB_BASE_URL = 'https://raw.githubusercontent.com/EhTagTranslation/Database/master/database';

    let categoryMap = {}; // English -> Chinese mapping
    let tagMap = {}; // namespace:tag -> Chinese mapping

    // Initialize and fetch database
    async function initializeDatabase() {
        const now = Date.now();
        const expiry = GM_getValue(CACHE_EXPIRY_KEY, 0);

        if (expiry > now) {
            // Load from cache
            const cached = GM_getValue(CACHE_KEY, null);
            if (cached) {
                categoryMap = cached.categoryMap || {};
                tagMap = cached.tagMap || {};
                console.log('使用缓存数据');
                return;
            }
        }

        // Fetch fresh data
        try {
            await fetchDatabase();
            // Save to cache
            GM_setValue(CACHE_KEY, { categoryMap, tagMap });
            GM_setValue(CACHE_EXPIRY_KEY, now + CACHE_DURATION);
            console.log('数据库已更新并缓存');
        } catch (error) {
            console.error('获取数据库失败:', error);
        }
    }

    // Fetch rows.md to get category mappings
    async function fetchDatabase() {
        const rowsUrl = `${DB_BASE_URL}/rows.md`;
        const rowsContent = await fetchWithTimeout(rowsUrl, 10000);
        const categories = parseRowsMd(rowsContent);

        // Fetch all category tag files concurrently
        const fetchPromises = categories.map(([englishName]) =>
            fetchCategoryTags(englishName).catch(err => {
                console.error(`获取 ${englishName} 失败:`, err);
                return null;
            })
        );

        const results = await Promise.all(fetchPromises);

        // Populate categoryMap
        categories.forEach(([englishName, chineseName]) => {
            categoryMap[englishName] = chineseName;
        });

        // Populate tagMap from results
        results.forEach(result => {
            if (result) {
                Object.assign(tagMap, result);
            }
        });

        console.log('categoryMap:', categoryMap);
        console.log('tagMap keys:', Object.keys(tagMap).slice(0, 20)); // Show first 20 keys
    }

    // Parse rows.md to extract category names
    function parseRowsMd(content) {
        const lines = content.split('\n');
        const categories = [];

        for (const line of lines) {
            // Skip header and separator lines
            if (line.startsWith('|') && !line.includes('---')) {
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                if (cells.length >= 2) {
                    let englishName = cells[0];
                    let chineseName = cells[1];

                    // Remove markdown image syntax
                    englishName = englishName.replace(/!\[.*?\]\(.*?\)/g, '').trim();
                    chineseName = chineseName.replace(/!\[.*?\]\(.*?\)/g, '').trim();

                    // Skip header row
                    if (englishName !== 'English' && chineseName !== 'Chinese' &&
                        englishName !== '原始标签' && englishName.length > 0) {
                        categories.push([englishName, chineseName]);
                    }
                }
            }
        }

        console.log('解析的分类:', categories);
        return categories;
    }

    // Fetch tags for a specific category
    async function fetchCategoryTags(category) {
        const url = `${DB_BASE_URL}/${category}.md`;
        const content = await fetchWithTimeout(url, 10000);
        return parseTagsMd(category, content);
    }

    // Parse category .md file to extract tag translations
    function parseTagsMd(category, content) {
        const lines = content.split('\n');
        const tags = {};

        for (const line of lines) {
            // Skip header and separator lines
            if (line.startsWith('|') && !line.includes('---')) {
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                if (cells.length >= 2) {
                    let originalTag = cells[0];
                    let translatedName = cells[1];

                    // Remove markdown image syntax
                    originalTag = originalTag.replace(/!\[.*?\]\(.*?\)/g, '').trim();
                    translatedName = translatedName.replace(/!\[.*?\]\(.*?\)/g, '').trim();

                    // Skip header row
                    if (originalTag === 'Original Tag' || originalTag === '原始标签' || originalTag.length === 0) {
                        continue;
                    }

                    // Key format: namespace:tag
                    const key = `${category}:${originalTag}`;
                    tags[key] = translatedName;
                }
            }
        }

        return tags;
    }

    // Fetch with timeout
    function fetchWithTimeout(url, timeout) {
        return Promise.race([
            fetch(url).then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Fetch timeout')), timeout)
            )
        ]);
    }

    // Get tag translation with fallback for underscores
    function getTagTranslation(namespace, tag) {
        // First try direct lookup (underscore version)
        let key = `${namespace}:${tag}`;
        let translation = tagMap[key];

        // If not found, try replacing underscores with spaces
        if (!translation && tag.includes('_')) {
            const tagWithSpaces = tag.replace(/_/g, ' ');
            key = `${namespace}:${tagWithSpaces}`;
            translation = tagMap[key];
        }

        return translation;
    }

    // Extract tags from page - KEY FIX: Use tag ID to get namespace
    function extractAndFormatTags() {
        const taglistDiv = document.getElementById('taglist');
        if (!taglistDiv) {
            console.error('未找到标签列表');
            return '';
        }

        const result = {};

        // Find all tag links in taglist
        const tagLinks = taglistDiv.querySelectorAll('a[id^="ta_"]');
        console.log('找到的标签链接数:', tagLinks.length);

        if (tagLinks.length === 0) {
            console.error('未找到任何标签');
            return '';
        }

        tagLinks.forEach(link => {
            const tagId = link.getAttribute('id');
            console.log('处理标签ID:', tagId);

            // Extract namespace:tag from ID (format: ta_namespace:tag)
            const match = tagId.match(/^ta_([^:]+):(.+)$/);
            if (!match) {
                console.warn('无法解析标签ID:', tagId);
                return;
            }

            const namespace = match[1];
            const tag = match[2];

            // Get Chinese category name from categoryMap
            const chineseCategoryName = categoryMap[namespace];
            if (!chineseCategoryName) {
                console.warn(`分类未找到: ${namespace} (来自标签: ${tagId})`);
                return;
            }

            // Initialize category array if not exists
            if (!result[chineseCategoryName]) {
                result[chineseCategoryName] = [];
            }

            // Get translation
            const translation = getTagTranslation(namespace, tag);
            if (translation) {
                result[chineseCategoryName].push(`#${translation}`);
            } else {
                // No translation, use English with underscores for spaces
                const formatted = tag.replace(/ /g, '_');
                result[chineseCategoryName].push(`#${formatted}`);
            }
        });

        // Format output
        const lines = [];
        for (const [category, tags] of Object.entries(result)) {
            if (tags.length > 0) {
                lines.push(`${category}：${tags.join('，')}`);
            }
        }

        return lines.join('\n');
    }

    // Inject UI buttons
    function injectButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '复制标签';
        copyBtn.style.cssText = `
            padding: 8px 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        copyBtn.addEventListener('click', async () => {
            const tags = extractAndFormatTags();
            if (tags) {
                await navigator.clipboard.writeText(tags);
                alert('标签已复制到剪贴板');
                console.log('复制内容:\n' + tags);
            } else {
                alert('未找到标签');
            }
        });

        // Clear cache button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清除缓存';
        clearBtn.style.cssText = `
            padding: 8px 16px;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        clearBtn.addEventListener('click', () => {
            GM_deleteValue(CACHE_KEY);
            GM_deleteValue(CACHE_EXPIRY_KEY);
            categoryMap = {};
            tagMap = {};
            alert('缓存已清除');
            console.log('缓存已清除');
        });

        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(clearBtn);
        document.body.appendChild(buttonContainer);
        console.log('脚本已加载，按钮已添加');
    }

    // Main execution
    await initializeDatabase();

    // Inject buttons with delay to ensure DOM is ready
    setTimeout(() => {
        injectButtons();
    }, 1000);

})();
