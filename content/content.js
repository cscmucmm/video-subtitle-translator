// Video Subtitle Translator - Content Script
// 支持 YouTube、Bilibili、Netflix、Twitch 字幕自动翻译

(function () {
  'use strict';

  let settings = {
    enabled: false,
    targetLang: 'zh-CN',
    apiKey: '',
    apiProvider: 'google', // google | deepl | openai
    showOriginal: true,
    fontSize: 16,
  };

  let observer = null;
  let translationCache = new Map();

  // 加载设置
  chrome.storage.sync.get(settings, (stored) => {
    settings = { ...settings, ...stored };
    if (settings.enabled) init();
  });

  // 监听设置变更
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      settings = { ...settings, ...msg.settings };
      if (settings.enabled) {
        init();
      } else {
        destroy();
      }
    }
  });

  function init() {
    const platform = detectPlatform();
    if (!platform) return;
    console.log(`[SubTranslator] 检测到平台: ${platform}`);
    observeSubtitles(platform);
  }

  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    // 移除所有翻译层
    document.querySelectorAll('.sbt-translation-layer').forEach(el => el.remove());
  }

  function detectPlatform() {
    const host = location.hostname;
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('bilibili.com')) return 'bilibili';
    if (host.includes('netflix.com')) return 'netflix';
    if (host.includes('twitch.tv')) return 'twitch';
    return null;
  }

  // 各平台字幕选择器
  const SUBTITLE_SELECTORS = {
    youtube: '.ytp-caption-segment',
    bilibili: '.bilibili-player-video-subtitle span, .bpx-player-subtitle-wrap span',
    netflix: '.player-timedtext-text-container span',
    twitch: '.chat-line__message, .video-player__overlay .caption-window span',
  };

  function observeSubtitles(platform) {
    const selector = SUBTITLE_SELECTORS[platform];
    if (!selector) return;

    observer = new MutationObserver(() => {
      const subtitleEls = document.querySelectorAll(selector);
      subtitleEls.forEach(el => processSubtitle(el));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  async function processSubtitle(el) {
    const text = el.textContent.trim();
    if (!text || el.dataset.sbtProcessed === text) return;
    el.dataset.sbtProcessed = text;

    // 检查缓存
    if (translationCache.has(text)) {
      renderTranslation(el, translationCache.get(text), text);
      return;
    }

    try {
      const translated = await translateText(text, settings.targetLang);
      translationCache.set(text, translated);
      // 缓存上限 500 条
      if (translationCache.size > 500) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
      }
      renderTranslation(el, translated, text);
    } catch (e) {
      console.warn('[SubTranslator] 翻译失败:', e.message);
    }
  }

  function renderTranslation(el, translated, original) {
    // 移除旧翻译层
    const existing = el.parentNode?.querySelector('.sbt-translation-layer');
    if (existing) existing.remove();

    const layer = document.createElement('div');
    layer.className = 'sbt-translation-layer';
    layer.innerHTML = `
      <span class="sbt-translated">${escapeHtml(translated)}</span>
      ${settings.showOriginal ? `<span class="sbt-original">${escapeHtml(original)}</span>` : ''}
    `;
    el.parentNode?.insertBefore(layer, el.nextSibling);
  }

  async function translateText(text, targetLang) {
    // 发送到 background 处理（避免 CORS）
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'TRANSLATE', text, targetLang, provider: settings.apiProvider, apiKey: settings.apiKey },
        (response) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (response?.error) return reject(new Error(response.error));
          resolve(response?.translated || text);
        }
      );
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
