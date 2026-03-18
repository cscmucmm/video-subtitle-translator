// Video Subtitle Translator - Content Script (Enhanced)
// 支持 YouTube、Bilibili、Netflix、Twitch 字幕自动翻译

(function () {
  'use strict';

  let settings = {
    enabled: true, // 默认开启
    targetLang: 'zh-CN',
    apiKey: '',
    apiProvider: 'google',
    showOriginal: true,
    fontSize: 16,
  };

  let observer = null;
  let translationCache = new Map();
  let isInitialized = false;
  let pendingTranslations = new Set();

  // 立即加载设置并初始化
  chrome.storage.sync.get(settings, (stored) => {
    settings = { ...settings, ...stored };
    console.log('[SubTranslator] 设置加载完成:', settings);
    if (settings.enabled) {
      init();
    }
  });

  // 监听设置变更
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      const wasEnabled = settings.enabled;
      settings = { ...settings, ...msg.settings };
      
      if (settings.enabled && !wasEnabled) {
        init();
      } else if (!settings.enabled && wasEnabled) {
        destroy();
      }
      sendResponse({ success: true });
    }
    return true;
  });

  // 手动触发初始化（用于调试）
  window.sbtInit = init;
  window.sbtDestroy = destroy;
  window.sbtStatus = () => ({ settings, isInitialized, cacheSize: translationCache.size });

  function init() {
    if (isInitialized) {
      console.log('[SubTranslator] 已初始化，跳过');
      return;
    }

    const platform = detectPlatform();
    if (!platform) {
      console.log('[SubTranslator] 未检测到支持的平台');
      return;
    }

    isInitialized = true;
    console.log(`[SubTranslator] 🎬 初始化完成 - 平台: ${platform}`);
    
    // 创建翻译显示容器
    createTranslationContainer();
    
    // 开始监听字幕
    observeSubtitles(platform);
    
    // 定期清理过期的翻译缓存
    setInterval(() => {
      if (translationCache.size > 1000) {
        const keys = [...translationCache.keys()].slice(0, 500);
        keys.forEach(k => translationCache.delete(k));
        console.log('[SubTranslator] 清理缓存，剩余:', translationCache.size);
      }
    }, 60000);
  }

  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    isInitialized = false;
    
    // 移除翻译容器
    const container = document.getElementById('sbt-translation-container');
    if (container) container.remove();
    
    // 移除所有翻译层
    document.querySelectorAll('.sbt-translation-layer').forEach(el => el.remove());
    
    console.log('[SubTranslator] 已销毁');
  }

  function detectPlatform() {
    const host = location.hostname;
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('bilibili.com')) return 'bilibili';
    if (host.includes('netflix.com')) return 'netflix';
    if (host.includes('twitch.tv')) return 'twitch';
    return null;
  }

  // 创建固定翻译显示容器（作为备选显示位置）
  function createTranslationContainer() {
    if (document.getElementById('sbt-translation-container')) return;
    
    const container = document.createElement('div');
    container.id = 'sbt-translation-container';
    container.innerHTML = `
      <div class="sbt-container-inner">
        <div class="sbt-translated-text"></div>
        <div class="sbt-original-text"></div>
      </div>
    `;
    document.body.appendChild(container);
    console.log('[SubTranslator] 翻译容器已创建');
  }

  // 各平台字幕选择器和容器
  const PLATFORM_CONFIG = {
    youtube: {
      subtitleSelector: '.ytp-caption-segment, .captions-text .ytp-caption-segment',
      containerSelector: '.ytp-caption-window-container, .html5-video-player',
      insertMode: 'container', // 使用固定容器显示
    },
    bilibili: {
      subtitleSelector: '.bpx-player-subtitle-text, .bilibili-player-video-subtitle-text',
      containerSelector: '.bpx-player-subtitle-wrap, .bilibili-player-video-subtitle',
      insertMode: 'inline',
    },
    netflix: {
      subtitleSelector: '.player-timedtext-text-container span, .timedtext-text-container span',
      containerSelector: '.player-timedtext, .watch-video--player-view',
      insertMode: 'container',
    },
    twitch: {
      subtitleSelector: '.video-player__overlay .caption-window span',
      containerSelector: '.video-player__overlay',
      insertMode: 'container',
    },
  };

  function observeSubtitles(platform) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) return;

    // 使用防抖的观察器
    let debounceTimer = null;
    
    observer = new MutationObserver((mutations) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        processSubtitles(config);
      }, 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // 立即处理一次
    setTimeout(() => processSubtitles(config), 500);
    
    console.log('[SubTranslator] 开始监听字幕:', config.subtitleSelector);
  }

  function processSubtitles(config) {
    const subtitleEls = document.querySelectorAll(config.subtitleSelector);
    
    if (subtitleEls.length === 0) return;

    subtitleEls.forEach(el => {
      const text = el.textContent?.trim();
      if (!text) return;
      
      // 跳过已处理的
      if (el.dataset.sbtId) return;
      
      const id = Date.now() + Math.random();
      el.dataset.sbtId = id;
      
      processTranslation(text, el, config);
    });
  }

  async function processTranslation(text, sourceEl, config) {
    // 防止重复翻译
    const key = text.slice(0, 50);
    if (pendingTranslations.has(key)) return;
    pendingTranslations.add(key);

    try {
      let translated = translationCache.get(text);
      
      if (!translated) {
        translated = await translateText(text, settings.targetLang);
        translationCache.set(text, translated);
      }

      displayTranslation(translated, text, sourceEl, config);
      
    } catch (e) {
      console.warn('[SubTranslator] 翻译失败:', e.message);
      // 显示原文
      displayTranslation(text, text, sourceEl, config);
    } finally {
      pendingTranslations.delete(key);
    }
  }

  function displayTranslation(translated, original, sourceEl, config) {
    const container = document.getElementById('sbt-translation-container');
    if (!container) return;

    const translatedEl = container.querySelector('.sbt-translated-text');
    const originalEl = container.querySelector('.sbt-original-text');

    if (translatedEl) {
      translatedEl.textContent = translated;
      translatedEl.style.fontSize = settings.fontSize + 'px';
    }

    if (originalEl && settings.showOriginal) {
      originalEl.textContent = original;
      originalEl.style.fontSize = (settings.fontSize - 4) + 'px';
    } else if (originalEl) {
      originalEl.textContent = '';
    }

    // 显示容器
    container.classList.add('sbt-visible');

    // 自动隐藏（3秒无更新）
    clearTimeout(container._hideTimer);
    container._hideTimer = setTimeout(() => {
      container.classList.remove('sbt-visible');
    }, 3000);
  }

  async function translateText(text, targetLang) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('翻译超时'));
      }, 5000);

      chrome.runtime.sendMessage(
        { 
          type: 'TRANSLATE', 
          text, 
          targetLang, 
          provider: settings.apiProvider, 
          apiKey: settings.apiKey 
        },
        (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response?.error) {
            reject(new Error(response.error));
            return;
          }
          
          resolve(response?.translated || text);
        }
      );
    });
  }

  // 页面加载完成后自动初始化
  if (document.readyState === 'complete') {
    setTimeout(() => {
      chrome.storage.sync.get(settings, (stored) => {
        settings = { ...settings, ...stored };
        if (settings.enabled) init();
      });
    }, 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        chrome.storage.sync.get(settings, (stored) => {
          settings = { ...settings, ...stored };
          if (settings.enabled) init();
        });
      }, 1000);
    });
  }

})();
