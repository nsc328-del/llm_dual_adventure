# LLM Dual Adventure

双人异步轮流制 Web 文字冒险游戏。两名玩家各自在浏览器中行动，LLM 作为叙事者实时生成故事，支持流式输出。

## 特性

- **双人轮流制** — 两名玩家轮流行动，LLM 根据双方行动推进剧情
- **本地双人模式** — 同一台机器上两人轮流操作，无需两个浏览器
- **5 个预设场景** — 翡翠之森、深海迷航、齿轮帝国、霓虹暗影、碎冠之战
- **自定义场景** — 自由创建故事世界，设定世界观、基调和开场剧情
- **5 个像素风主题** — 森林 / 海洋 / 机械 / 赛博 / 西幻，纯 CSS 实现
- **流式叙事** — LLM 生成的故事实时逐字显示，带闪烁光标
- **角色系统** — 12 种像素头像，角色名/性格/背景/外貌全部影响 LLM 叙事
- **建议行动** — 每次叙事后提供 2-3 个可点击的行动建议
- **多 LLM 支持** — 兼容 OpenAI 和 Anthropic API 协议，各玩家可用不同 API
- **SillyTavern 风格参数** — Temperature、Top P/K、Penalties 等生成参数可调

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器 (前端 :5174 + 后端 :9001)
npm run dev
```

打开浏览器访问 `http://localhost:5174`。

### 本地双人模式
1. 点击「本地双人模式」
2. 输入两位玩家的名字
3. 选择场景（或创建自定义场景）
4. 编辑角色 → 配置 LLM API → 双方准备就绪
5. 开始冒险！

### 联机模式
1. 玩家 A 输入名字 → 创建房间
2. 玩家 B 在另一台设备上输入房间 ID 加入
3. 后续流程相同

## LLM 配置

游戏需要 LLM API 来生成叙事。支持任何兼容 OpenAI 或 Anthropic 协议的服务：

| Provider | Base URL 示例 | 说明 |
|----------|-------------|------|
| OpenAI | `https://api.openai.com/v1` | 官方 API |
| Anthropic | `https://api.anthropic.com` | 官方 API |
| 本地模型 | `http://localhost:11434/v1` | Ollama 等本地推理 |
| 第三方 | 各服务商提供的 URL | 兼容 OpenAI 协议即可 |

每位玩家独立配置自己的 API Key 和 Provider，当前回合使用当前行动玩家的 API。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Zustand |
| 样式 | Tailwind CSS v4 + CSS 自定义属性 |
| 后端 | Fastify + TypeScript |
| 数据库 | Node.js 内置 SQLite |
| 实时通信 | WebSocket (@fastify/websocket) |
| LLM | 自写 fetch adapter，支持流式 |

## 项目结构

```
src/
├── shared/          # 前后端共享类型和常量
├── client/          # React 前端
│   ├── components/  # UI 组件 (lobby/setup/game/settings/theme)
│   ├── hooks/       # WebSocket、主题
│   └── stores/      # Zustand 状态管理
└── server/          # Fastify 后端
    ├── game/        # 游戏引擎、叙事者、状态
    ├── llm/         # OpenAI/Anthropic 适配器
    ├── ws/          # WebSocket 处理
    └── scenarios/   # 预设场景 JSON
```

## License

MIT
