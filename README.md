# Video Subtitle Translator 🎬

一个 Chrome 扩展，自动翻译网页视频字幕，支持 YouTube、Bilibili、Netflix、Twitch 等主流平台。

## ✨ 功能特性

- 🌍 **多平台支持**：YouTube、Bilibili、Netflix、Twitch
- 🔄 **实时翻译**：自动检测并翻译字幕
- 🈶 **多语言**：支持中文、英文、日文、韩文等
- 🔧 **多种翻译服务**：
  - Google 翻译（免费，无需 API Key）
  - DeepL（需 API Key）
  - OpenAI GPT（需 API Key）
- ⚙️ **可自定义**：字体大小、是否显示原文

## 📦 安装

### 开发者模式安装

1. 下载或克隆本项目
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本项目文件夹

## 🚀 使用方法

1. 点击浏览器工具栏中的扩展图标
2. 开启开关启用翻译
3. 选择目标语言和翻译服务
4. 打开支持的视频网站，字幕会自动翻译

## ⚙️ 设置说明

| 设置项 | 说明 |
|--------|------|
| 目标语言 | 翻译后的语言 |
| 翻译服务 | Google（免费）/ DeepL / OpenAI |
| API Key | 使用 DeepL 或 OpenAI 时需要 |
| 显示原文 | 是否同时显示原始字幕 |
| 字体大小 | 翻译字幕的字体大小 |

## 📁 项目结构

```
video-subtitle-translator/
├── manifest.json          # 扩展配置
├── content/
│   ├── content.js         # 内容脚本（字幕处理）
│   └── content.css        # 样式
├── popup/
│   ├── popup.html         # 弹窗界面
│   ├── popup.css          # 弹窗样式
│   └── popup.js           # 弹窗逻辑
├── background/
│   └── background.js      # 后台服务（翻译 API）
└── icons/                 # 图标资源
```

## 🔒 隐私说明

- 所有翻译请求通过 Chrome 扩展 API 发送
- 不收集任何用户数据
- API Key 仅存储在本地 Chrome Storage

## 📝 开发计划

- [ ] 支持更多视频平台
- [ ] 字幕下载功能
- [ ] 自定义翻译缓存
- [ ] 字幕样式自定义

## 📜 License

MIT License
