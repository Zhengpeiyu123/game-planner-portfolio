# 郑佩玉 · 游戏策划作品集

React 19 + Vite 8 + GSAP + 按需加载的 Three.js。首页为星空彩铅绘本与巨幅旋转树干展览；三个完整策划案例、设计方法、个人经历及可玩原型入口保持不变。

## 本地运行

需要 Node.js 22.12+（发布使用 Node.js 24）与 pnpm 10.11.0。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
pnpm build
pnpm lint
pnpm test
```

在 Codex 桌面环境若 `node` 不在 PATH，可直接使用 bundled Node 执行 `node_modules/vite/bin/vite.js` 和 `node_modules/oxlint/bin/oxlint`。

## 页面

- `/#top`：以用户星空大树原图为开场，向下滚动进入绘本树与空间环绕资料。
- `/#projects`、`/#process`、`/#about`、`/#contact`：精选项目、设计方法、个人经历与联系入口。
- `/#reading`、`/#reading/projects`：无 WebGL、无背景视频的直接阅读页面。阅读模式的设计方法、关于我和联系导航也保留在该模式内。
- 旧群岛书签 `/#island/{id}` 自动转到对应的原版阅读页面，不再展示地图或弹层。
- `/#project/huazhongren`：《画中人》叙事与玩法、三路线取舍、仓储交互规格；主入口直接打开双关 H5 原型。
- `/prototypes/huazhongren/index.html`：用户提供的完整 H5 游戏包，与网站同源部署，保留原包内容及相对资源路径。
- `/#project/minguo`：《民国诡事》职责、流程修改前后对照与协作复盘。
- `/#project/survivor`：《土豆幸存者》实际调参记录、数值思考与可玩链接。

项目页提供三组键盘可访问的标签、配置 CSV 导出、案例 Markdown 下载、原素材与文档下载，以及打印/保存 PDF。打印样式展开全部案例标签内容。

## 树之展览

`PaintedTrunkRenderer.js` 用真实树干网格与彩铅树皮材质实现滚轮旋转，树冠为手绘分层，HTML 资料卡共享透视轴心。镜头从枝叶进入巨幅树干，终点仍在树干中段；没有树根、地面或底座。正反滚动可回看，卡片点击有推近/渐隐转场，案例提供文字渐入和可键盘操作的图片灯箱。

旧渲染器 `TreeRenderer.js`、`StorybookRenderer.js` 保留为未启用备份。含本机路径的内部美术记录不随公开仓库提交。

- 滚动或桌面横向拖动探索；右侧编号和上下按钮可直接转到指定资料。
- 卡片可点击，正面卡与导航支持键盘。专业内容保留原来的页面和材料入口。
- “暂停环境动效”冻结手绘树的轻微摆动；滚动转场仍跟随用户操作。
- 系统要求减少动态、短横屏或插画加载失败时，自动显示静态作品列表。
- 离屏或标签页隐藏时停止动画；阅读案例时卸载插画场景并清理监听器。渲染模块按需加载。
- 《民国诡事》封面已换为用户提供的 `库形象图.png`，保存在 `/assets/project-minguo-library.png`，原 JPG 仍留存。

## 未启用的群岛备份

按用户要求撤回群岛方案。`src/App.jsx` 已解除群岛组件与样式的引用；页面不加载群岛图片、人物或移动逻辑。以下文件只保留作备份：`src/IslandWorld.jsx`、`src/IslandWorld.css`、`src/islandWorldData.js`、`src/islandPath.mjs`、`src/islandPath.test.mjs`、`public/assets/island-world.png`、`public/assets/island-traveler.png`。

地图是作品集导航插画，不代表项目实际游戏画面。原始游戏实机图保留在案例内。

## 内容维护

`src/content.js` 保存案例内容与设计方法；`src/App.jsx` 实现阅读与路由交互；`src/App.css` 保存响应式与打印样式。`scripts/generate-downloads.mjs` 根据同一份内容生成案例 Markdown 和配置 CSV，启动及构建时自动执行；开发过程中改动内容后也应重新执行，保持下载材料同步。

内容来源：

- 《画中人》游戏介绍 v5，2026-09-14，17 页。使用双关、八个模块、三条路线及原型界面；没有与《画中路人：吃土豆的人》旧方案混用。
- 《画中人》更新版项目介绍，9 页，含实机演示；对应 `public/downloads/huazhongren-project-introduction-updated.pptx`。原始文件及 H5 包来自用户桌面的 `作品集内容/《画中人》/`，原文件未改动。新版 PPT 侧重项目定位与发展方向，详细规则仍保留 17 页原说明供查阅。
- 已确认求职记录 `../郑佩玉-游戏策划简历/career-claim-ledger.json`。
- 实习述职与 `../intern_review_assets/` 中的原始制作截图。
- 《民国诡事》官方 Steam 页面：https://store.steampowered.com/app/4590810/_/?l=schinese
- 《土豆幸存者》原型链接来自原实机截图地址栏，已检查可加载开始菜单。

证据边界：

- 项目整体心愿单、播放量与交付周期，不能改写为个人独立达成；不作为实时统计。
- 配置示例是用于作品集的结构整理，不是项目生产表或源代码导出。
- 设计解释可根据原材料展开，但不能编造历史 A/B 测试、用户数量、效果提升或录用/获奖结果。
- 验证栏为后续检查方向；《画中人》兼容性、难度与全流程验证仍是原方案待完善内容。

## GitHub Pages 发布

本项目为纯静态网站，使用 hash 路由，不需要服务端或路由重写。GitHub 仓库设置中选择 **Settings → Pages → Source: GitHub Actions**，提交到 `main` 后由 `.github/workflows/pages.yml` 自动测试、构建并部署 `dist/`。

工作流通过 Pages 配置自动取得仓库前缀。手动测试相同部署路径：

```sh
VITE_BASE_PATH=/game-planner-portfolio/ pnpm build
VITE_BASE_PATH=/game-planner-portfolio/ pnpm preview
```

打开预览输出的 `/game-planner-portfolio/` 地址，而不是域名根目录。`src/publicUrl.js` 统一处理图片、下载与原型路径；CSS 静态资源由 Vite 重写。外部游戏地址与 hash 页面链接保持不变。

更新版 PPT 超过 GitHub 普通 Git 的单文件限制，因此完整文件不直接提交；`release-assets/large-downloads/` 保存三个不超过 40 MiB 的无损分片与 SHA256 清单。`pnpm build` / `pnpm dev` 自动还原到原下载路径，文件内容不作压缩或修改。也可独立检查：

```sh
node scripts/large-downloads.mjs verify
node scripts/large-downloads.mjs restore
```

不要删除分片或修改校验值。更新大文件时须重新生成清单与分片，并验证完整下载。

## 对外投递前的资料补全

- 《画中人》已接入本地 H5 包；公网发布时需随 `dist/prototypes/huazhongren/` 一起上传。若之后获得外部托管链接，可替换该案例 `materials` 的第一个入口。
- 若要公开详细运营指标，补充统计日期与可公开的原始截图。
- 当前简历链接为已有 DOCX 原件，案例页提供浏览器打印 PDF。
- 最终公开域名确定后，将 `index.html` 的 Open Graph 图片改为该域名下的绝对 URL。

不需要增加依赖即可维护内容。H5 包和项目 PPT 不会在作品集首页自动加载，只有进入原型或点击下载时才会传输相应文件。新版 PPT 约 118 MB，H5 包约 188 MB，部署平台需支持这些静态资源。
