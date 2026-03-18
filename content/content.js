// Video Subtitle Translator - Content Script (Fixed)
// 支持 YouTube、Bilibili、Netflix、Twitch 字幕自动翻译

(function () {
  'use strict';

  let settings = {
    enabled: true,
    targetLang: 'zh-CN',
    apiKey: '',
    apiProvider: 'google',
    showOriginal: true,
    fontSize: 18,
  };

  let observer = null;
  let translationCache = new Map();
  let isInitialized = false;
  let pendingTranslations = new Set();
  let lastSubtitleText = '';
  let hideTimer = null;

  // 立即加载设置并初始化
  loadSettings();

  function loadSettings() {
    chrome.storage.sync.get(settings, (stored) => {
      settings = { ...settings, ...stored };
      console.log('[SubTranslator] 设置加载完成:', settings);
      if (settings.enabled) {
        init();
      }
    });
  }

  // 监听设置变更 - 修复：确保返回正确的响应
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      const wasEnabled = settings.enabled;
      settings = { ...settings, ...msg.settings };
      console.log('[SubTranslator] 设置已更新:', settings);
      
      if (settings.enabled && !wasEnabled) {
        init();
      } else if (!settings.enabled && wasEnabled) {
        destroy();
      }
      
      // 立即发送响应
      sendResponse({ success: true });
    }
    // 返回 false 表示同步响应完成，不再等待
    return false;
  });

  // 手动调试接口
  window.sbtInit = init;
  window.sbtDestroy = destroy;
  window.sbtStatus = () => ({ 
    settings, 
    isInitialized, 
    cacheSize: translationCache.size,
    platform: detectPlatform() 
  });

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
    
    // 定期清理缓存
    setInterval(() => {
      if (translationCache.size > 1000) {
        const keys = [...translationCache.keys()].slice(0, 500);
        keys.forEach(k => translationCache.delete(k));
      }
    }, 60000);
  }

  function destroy() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    isInitialized = false;
    
    const container = document.getElementById('sbt-translation-container');
    if (container) container.remove();
    
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

  // 各平台配置
  const PLATFORM_CONFIG = {
    youtube: {
      subtitleSelector: '.ytp-caption-segment',
      containerSelector: '.ytp-caption-window-container',
    },
    bilibili: {
      subtitleSelector: '.bpx-player-subtitle-text, .subtitle-group-text',
      containerSelector: '.bpx-player-subtitle-wrap',
    },
    netflix: {
      subtitleSelector: '.player-timedtext-text-container span',
      containerSelector: '.player-timedtext',
    },
    twitch: {
      subtitleSelector: '.video-player__content .caption-window span',
      containerSelector: '.video-player__content',
    },
  };

  function observeSubtitles(platform) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) return;

    let debounceTimer = null;
    
    observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => processSubtitles(config), 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // 立即检查一次
    setTimeout(() => processSubtitles(config), 500);
    
    console.log('[SubTranslator] 开始监听字幕');
  }

  function processSubtitles(config) {
    const subtitleEls = document.querySelectorAll(config.subtitleSelector);
    
    if (subtitleEls.length === 0) return;

    // 合并所有字幕文本
    const text = Array.from(subtitleEls)
      .map(el => el.textContent?.trim())
      .filter(t => t)
      .join(' ');
    
    if (!text || text === lastSubtitleText) return;
    lastSubtitleText = text;
    
    processTranslation(text);
  }

  async function processTranslation(text) {
    const key = text.slice(0, 50);
    if (pendingTranslations.has(key)) return;
    pendingTranslations.add(key);

    try {
      let translated = translationCache.get(text);
      
      if (!translated) {
        translated = await translateText(text);
        translationCache.set(text, translated);
      }

      displayTranslation(translated, text);
      
    } catch (e) {
      console.warn('[SubTranslator] 翻译失败:', e.message);
      displayTranslation(text, text); // 显示原文
    } finally {
      pendingTranslations.delete(key);
    }
  }

  function displayTranslation(translated, original) {
    let container = document.getElementById('sbt-translation-container');
    if (!container) {
      createTranslationContainer();
      container = document.getElementById('sbt-translation-container');
    }

    const translatedEl = container.querySelector('.sbt-translated-text');
    const originalEl = container.querySelector('.sbt-original-text');

    if (translatedEl) {
      translatedEl.textContent = translated;
      translatedEl.style.fontSize = settings.fontSize + 'px';
    }

    if (originalEl) {
      if (settings.showOriginal && original !== translated) {
        originalEl.textContent = original;
        originalEl.style.fontSize = (settings.fontSize - 4) + 'px';
        originalEl.style.display = 'block';
      } else {
        originalEl.style.display = 'none';
      }
    }

    // 显示容器
    container.classList.add('sbt-visible');

    // 自动隐藏
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      container.classList.remove('sbt-visible');
      lastSubtitleText = '';
    }, 4000);
  }

  async function translateText(text) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('翻译超时'));
      }, 5000);

      try {
        chrome.runtime.sendMessage(
          { 
            type: 'TRANSLATE', 
            text, 
            targetLang: settings.targetLang, 
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
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
      }
    });
  }

  // 页面加载完成后初始化
  if (document.readyState === 'complete') {
    setTimeout(loadSettings, 500);
  } else {
    window.addEventListener('load', () => {
      setTimeout(loadSettings, 500);
    });
  }

})();
