// Video Subtitle Translator - Popup Script (Fixed)

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    enabled: document.getElementById('enabled'),
    targetLang: document.getElementById('targetLang'),
    apiProvider: document.getElementById('apiProvider'),
    apiKey: document.getElementById('apiKey'),
    apiKeyField: document.getElementById('apiKeyField'),
    showOriginal: document.getElementById('showOriginal'),
    fontSize: document.getElementById('fontSize'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    save: document.getElementById('save'),
    status: document.getElementById('status'),
    statusText: document.getElementById('statusText'),
  };

  // 默认设置
  const defaultSettings = {
    enabled: true,
    targetLang: 'zh-CN',
    apiProvider: 'google',
    apiKey: '',
    showOriginal: true,
    fontSize: 18,
  };

  // 加载设置
  chrome.storage.sync.get(defaultSettings, (settings) => {
    console.log('加载设置:', settings);
    elements.enabled.checked = settings.enabled;
    elements.targetLang.value = settings.targetLang;
    elements.apiProvider.value = settings.apiProvider;
    elements.apiKey.value = settings.apiKey;
    elements.showOriginal.checked = settings.showOriginal;
    elements.fontSize.value = settings.fontSize;
    elements.fontSizeValue.textContent = settings.fontSize;
    updateStatusText(settings.enabled);
    toggleApiKeyField(settings.apiProvider);
  });

  function updateStatusText(enabled) {
    if (elements.statusText) {
      elements.statusText.textContent = enabled ? '状态：已启用 ✅' : '状态：已禁用 ⏸️';
    }
  }

  // API Provider 变更时显示/隐藏 API Key 字段
  elements.apiProvider.addEventListener('change', () => {
    toggleApiKeyField(elements.apiProvider.value);
  });

  function toggleApiKeyField(provider) {
    elements.apiKeyField.style.display = provider === 'google' ? 'none' : 'block';
  }

  // 字体大小滑块
  elements.fontSize.addEventListener('input', () => {
    elements.fontSizeValue.textContent = elements.fontSize.value;
  });

  // 保存设置
  elements.save.addEventListener('click', () => {
    const settings = {
      enabled: elements.enabled.checked,
      targetLang: elements.targetLang.value,
      apiProvider: elements.apiProvider.value,
      apiKey: elements.apiKey.value,
      showOriginal: elements.showOriginal.checked,
      fontSize: parseInt(elements.fontSize.value),
    };

    chrome.storage.sync.set(settings, () => {
      // 通知当前活动标签页
      notifyActiveTab(settings);
      
      elements.status.textContent = '✓ 已保存';
      setTimeout(() => (elements.status.textContent = ''), 2000);
    });
  });

  // 开关实时生效
  elements.enabled.addEventListener('change', () => {
    updateStatusText(elements.enabled.checked);
    
    const settings = {
      enabled: elements.enabled.checked,
      targetLang: elements.targetLang.value,
      apiProvider: elements.apiProvider.value,
      apiKey: elements.apiKey.value,
      showOriginal: elements.showOriginal.checked,
      fontSize: parseInt(elements.fontSize.value),
    };
    
    chrome.storage.sync.set(settings, () => {
      notifyActiveTab(settings);
    });
  });

  // 安全地通知活动标签页
  async function notifyActiveTab(settings) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        // 使用 try-catch 包装消息发送，避免报错
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'SETTINGS_UPDATED', 
            settings 
          });
        } catch (e) {
          // 标签页可能不支持 content script，忽略错误
          console.log('无法发送消息到标签页:', e.message);
        }
      }
    } catch (e) {
      console.log('获取活动标签页失败:', e.message);
    }
  }
});
