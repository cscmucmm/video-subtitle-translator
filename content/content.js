// Video Subtitle Translator - Content Script (Simple Debug Version)
console.log('[SubTranslator] 🎬 Content script loaded!');

// 暴露全局调试函数
window.sbtStatus = function() {
  return {
    loaded: true,
    url: location.href,
    platform: detectPlatform()
  };
};

window.sbtTest = function() {
  console.log('[SubTranslator] 测试翻译...');
  chrome.runtime.sendMessage({ type: 'TRANSLATE', text: 'Hello World', targetLang: 'zh-CN', provider: 'google' }, (response) => {
    console.log('[SubTranslator] 翻译结果:', response);
  });
};

function detectPlatform() {
  const host = location.hostname;
  if (host.includes('youtube.com')) return 'youtube';
  if (host.includes('bilibili.com')) return 'bilibili';
  if (host.includes('netflix.com')) return 'netflix';
  if (host.includes('twitch.tv')) return 'twitch';
  return 'unknown';
}

// 创建翻译显示容器
function createContainer() {
  if (document.getElementById('sbt-container')) return;
  
  const container = document.createElement('div');
  container.id = 'sbt-container';
  container.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.85);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 18px;
    z-index: 2147483647;
    display: none;
    max-width: 80%;
    text-align: center;
    font-family: sans-serif;
  `;
  document.body.appendChild(container);
  console.log('[SubTranslator] 容器已创建');
}

// 显示翻译
function showTranslation(text) {
  let container = document.getElementById('sbt-container');
  if (!container) {
    createContainer();
    container = document.getElementById('sbt-container');
  }
  container.textContent = text;
  container.style.display = 'block';
  
  clearTimeout(window._sbtHideTimer);
  window._sbtHideTimer = setTimeout(() => {
    container.style.display = 'none';
  }, 3000);
}

// 监听字幕 (YouTube)
function observeYouTube() {
  console.log('[SubTranslator] 开始监听 YouTube 字幕...');
  
  const observer = new MutationObserver(() => {
    const captions = document.querySelectorAll('.ytp-caption-segment');
    if (captions.length > 0) {
      const text = Array.from(captions).map(c => c.textContent).join(' ').trim();
      if (text && text !== window._lastText) {
        window._lastText = text;
        console.log('[SubTranslator] 检测到字幕:', text);
        translateAndShow(text);
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// 翻译并显示
async function translateAndShow(text) {
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'TRANSLATE', text, targetLang: 'zh-CN', provider: 'google' },
        (res) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(res);
        }
      );
    });
    
    if (response?.translated) {
      console.log('[SubTranslator] 翻译结果:', response.translated);
      showTranslation(response.translated);
    }
  } catch (e) {
    console.error('[SubTranslator] 翻译失败:', e.message);
    showTranslation(text); // 显示原文
  }
}

// 初始化
function init() {
  console.log('[SubTranslator] 初始化...');
  createContainer();
  
  const platform = detectPlatform();
  if (platform === 'youtube') {
    observeYouTube();
  } else {
    console.log('[SubTranslator] 平台:', platform, '(暂不支持)');
  }
}

// 等待页面加载
if (document.readyState === 'complete') {
  setTimeout(init, 500);
} else {
  window.addEventListener('load', () => setTimeout(init, 500));
}
