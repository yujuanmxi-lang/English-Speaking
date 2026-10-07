# Bloom Speak · 英语口语练习 Demo

纯 HTML / CSS / JavaScript，无构建步骤、无后端、无账号。粉色与浅紫关卡地图，支持浅色 / 深色模式和移动端。

## 使用

直接用浏览器打开 `index.html` 即可选择关卡、输入英文、获得演示反馈及保存记录。推荐 Chrome / Edge。

录音和识别需要麦克风权限及浏览器支持。若直接打开文件时麦克风不可用，可在项目目录运行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

然后在本机浏览器打开 `http://localhost:8000`。部署时使用 HTTPS；HTTP 非本地主机通常无法使用麦克风。语音识别可能使用浏览器厂商的在线服务，不保证离线可用；不支持识别时可以录音后手动输入。每次录音最多 60 秒，重新录音会替换当前音频，转写可自行编辑。

## 功能

- 5 个场景 × 3 个难度：日常、校园、雅思、购物、出行。
- 原生 `getUserMedia`、`MediaRecorder` 录音与回放；`SpeechRecognition` / `webkitSpeechRecognition` 实时英文转写。
- 本地规则反馈：检测有限的常见错误，提供修正文与扩句框架。这是演示，不是 GPT，不保证语法正确或回答切题。
- 可选 GPT：右上角设置中选择 GPT、输入自己的 OpenAI API Key 与模型。发送题目和转写文本，不上传录音；实际返回错误、简单版 / 高级版表达与鼓励评语。调用可能付费，不需要其他第三方 API。
- `localStorage` 存档包含题目、转写、反馈和 base64 录音。刷新后可查看、回放或删除。容量一般只有数 MB；超限会明确提示保存失败，不丢弃旧记录。只保存文字的练习更节省空间。
- XP、等级与星级奖励；星级不代表发音质量或雅思分数。

## 文件结构

```text
index.html          页面入口和设置弹窗
css/style.css       主题、响应式布局和动效
js/scenes.js        15 个关卡的题库
js/feedback.js      本地规则与可选 GPT 客户端
js/app.js           页面导航、录音、反馈、存档
tests/smoke.cjs     浏览器冒烟测试（可选 Playwright）
```

## 数据与密钥

API Key 只保存在当前页面内存，不写入存档或代码；刷新后需要重新填写。纯前端无法隐藏密钥，仅适合个人 Demo。不要把自己的密钥提交到 GitHub 或提供给其他用户。GPT 请求受浏览器跨域、网络、模型权限和 API 额度约束，失败会提示，可主动切回演示模式。

录音仅本地保存；清除浏览器站点数据会删除全部存档。`file://` 下的存储行为因浏览器而异，稳定使用推荐 localhost 或 HTTPS，并保持相同地址。远程 Google 字体可选，无法加载时自动使用系统字体。

## 验证

基础语法：`node --check js/app.js`，其他脚本同理。可选浏览器测试需要安装 Playwright 和 Chromium（`npm install --no-save --package-lock=false playwright`，然后 `npx playwright install chromium`），在项目目录执行 `node tests/smoke.cjs`；已有系统 Chromium 时可运行 `BLOOM_CHROMIUM_PATH=/usr/bin/chromium node tests/smoke.cjs`。测试启动临时静态服务器，验证关卡过滤、文本反馈、存档持久化、深色模式、删除、虚拟麦克风的原生录音与音频存档，以及模拟 GPT 响应和失败处理。真实麦克风权限、语音识别服务与真实 GPT 需要在支持的浏览器中自行验证。

项目可以作为普通静态网站部署到 GitHub Pages，不需要后端或数据库。
