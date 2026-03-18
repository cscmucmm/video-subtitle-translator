// Video Subtitle Translator - Popup Script (Enhanced)

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
  };

  // 默认设置
  const defaultSettings = {
    enabled: true, // 默认开启
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
    toggleApiKeyField(settings.apiProvider);
  });

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
      // 通知所有标签页更新
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { 
            type: 'SETTINGS_UPDATED', 
            settings 
          }).catch(() => {}); // 忽略不支持消息的标签页
        });
      });
      
      elements.status.textContent = '✓ 已保存';
      setTimeout(() => (elements.status.textContent = ''), 2000);
    });
  });

  // 开关实时生效
  elements.enabled.addEventListener('change', () => {
    const settings = {
      enabled: elements.enabled.checked,
      targetLang: elements.targetLang.value,
      apiProvider: elements.apiProvider.value,
      apiKey: elements.apiKey.value,
      showOriginal: elements.showOriginal.checked,
      fontSize: parseInt(elements.fontSize.value),
    };
    
    chrome.storage.sync.set(settings, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { 
            type: 'SETTINGS_UPDATED', 
            settings 
          }).catch(() => {});
        });
      });
    });
  });
});
