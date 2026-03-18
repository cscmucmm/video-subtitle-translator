// Video Subtitle Translator - Background Service Worker
// 处理翻译 API 调用（避免 CORS 问题）

const API_ENDPOINTS = {
  google: 'https://translate.googleapis.com/translate_a/single',
  deepl: 'https://api-free.deepl.com/v2/translate', // 或 api.deepl.com 付费版
  openai: 'https://api.openai.com/v1/chat/completions',
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TRANSLATE') {
    handleTranslation(msg)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true; // 异步响应
  }
});

async function handleTranslation({ text, targetLang, provider, apiKey }) {
  switch (provider) {
    case 'google':
      return translateGoogle(text, targetLang);
    case 'deepl':
      return translateDeepL(text, targetLang, apiKey);
    case 'openai':
      return translateOpenAI(text, targetLang, apiKey);
    default:
      return { translated: text };
  }
}

// Google 翻译（免费，无需 API Key）
async function translateGoogle(text, targetLang) {
  const url = `${API_ENDPOINTS.google}?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google 翻译失败: ${res.status}`);
  const data = await res.json();
  const translated = data[0]?.map((item) => item[0]).join('') || text;
  return { translated };
}

// DeepL 翻译（需要 API Key）
async function translateDeepL(text, targetLang, apiKey) {
  if (!apiKey) throw new Error('DeepL 需要 API Key');
  const res = await fetch(API_ENDPOINTS.deepl, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang.toUpperCase().replace('-', ''),
    }),
  });
  if (!res.ok) throw new Error(`DeepL 翻译失败: ${res.status}`);
  const data = await res.json();
  const translated = data.translations?.[0]?.text || text;
  return { translated };
}

// OpenAI 翻译（需要 API Key）
async function translateOpenAI(text, targetLang, apiKey) {
  if (!apiKey) throw new Error('OpenAI 需要 API Key');
  const langNames = {
    'zh-CN': '简体中文',
    'zh-TW': '繁体中文',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
  };
  const targetLangName = langNames[targetLang] || targetLang;

  const res = await fetch(API_ENDPOINTS.openai, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the following text to ${targetLangName}. Only output the translation, no explanations.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI 翻译失败: ${res.status}`);
  const data = await res.json();
  const translated = data.choices?.[0]?.message?.content?.trim() || text;
  return { translated };
}
