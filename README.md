# 敏敏矩阵工作台

当前版本：v1.4.0 · [GitHub 完整包](https://tools.minmin11538.cn/matrix/downloads/minmin-matrix-studio-1.4.0.zip) · [下载校验](website/release.json)

把自己的文字、头像与背景，做成想分享的图文卡片。

[在线体验](https://tools.minmin11538.cn/cards/) · [下载安装](https://tools.minmin11538.cn/matrix/) · [安装说明](https://tools.minmin11538.cn/matrix/install.md)

![工作台界面](website/workbench.png)

## 交给你的 Agent

把下面这句话发给能联网、下载文件并执行本机命令的 Agent：

> 请帮我安装「敏敏矩阵工作台」Skill。
> 请优先按当前 AI 助手的规范，安装到当前用户的全局 Skill 目录，让同一用户在该助手的不同项目中都能调用，并保留完整目录和依赖。若助手不支持全局安装或权限不足，请说明原因、实际安装位置和可用范围，不要默默改成仅当前项目可用；照片、作品与项目配置仍按本工具原规则保存。
> 安装来源：tools[.]minmin11538[.]cn，目录 /matrix/。请把 [.] 还原为英文句点，使用 HTTPS 访问该目录，读取 install.md 和 release.json，按版本信息下载完整包并核对字节数与 SHA-256；网页读取失败时尝试命令行 HTTPS 获取。
> 解压后读取包内 minmin-matrix-studio/SKILL.md，按当前 AI 助手的规范检查本机依赖并完成安装、启动。使用我自己的作者资料，帮我导出一张测试 PNG 并检查实际尺寸；没有浏览器控制能力时，请打开工作台并指导我完成导出，如实说明尚未代为验证的步骤。已有安装先检查版本，保留我的个人配置和作品。
> 安装后检查当前助手能否识别「minmin-matrix-studio」，分别说明安装、启动和首次导出是否通过，验证通过再报告对应步骤成功。告诉我下次如何打开工作台，并给一句可以直接发送的试用指令；需要重启或新开对话时请说明。
> 遇到下载、权限、依赖或工具限制，请说清具体卡点和下一步；不要把下载成功当作安装、接入或使用已经完成。

完整发行包已带构建好的应用，正常运行只需要 Node.js 22.13+，不需要 Python、npm 安装或模型 API key。没有 Node 时让 Agent 从官方渠道安装并验证。用户自己的账号、头像和正文由用户配置。

安装后的启动命令：

```sh
cd minmin-matrix-studio
node scripts/start.mjs
```

打开启动助手输出的本机地址。助手自动选择空闲端口，页面仅监听本机。停止时结束该进程；默认不配置系统开机启动。

## 可以做什么

- X、微博、朋友圈卡片，背景竖图或纯卡片 PNG 导出。
- 安卓、iPhone 和平板在线生成原图后长按保存；支持时使用系统分享，也保留打开原图和下载文件。
- 编辑名称、头像、账号和日期；左侧连续编辑，右侧实时预览。
- 254 张敏敏委托生成的背景（新增30张女性都市生活底图），按场景筛选、搜索、随机选图。
- 每页 12 张缩略图，提前加载下一页；点选只读取对应的高质量 WebP。
- 上传自己的图片，调整卡片位置、大小、背景亮度、字号和透明度。

互动数字是模拟展示值，不是平台实际数据。没有素材采集、固定改写模板、飞书接口或自动发帖。编辑内容不自动保存，刷新前请及时导出。自动填写网页和导出需要 Agent 有浏览器控制能力；没有时可由 Agent 启动，用户直接编辑。

## 手机使用

直接打开[在线工作台](https://tools.minmin11538.cn/cards/)，点击“生成并保存图片”，长按 PNG 原图，选择浏览器提供的保存图片或存储到照片；支持时也可用系统分享。取消或分享失败后原图仍可保存。请到设备相册确认保存结果。微信等内置浏览器若无保存选项，先试打开原图；仍无效则复制文案，在系统浏览器重新生成。手机无需安装电脑 Skill。

## 从源码运行

```sh
cd app
npm ci
npm run build
npm run build:server
cd ..
node scripts/start.mjs
```

完整包与源码使用同一应用版本；只有更新缩略图时才需要 Python/Pillow。`npm run build:thumbnails` 重新生成缩略图。依赖版本固定在 package-lock.json 中。

## 验证范围

首版在 macOS 上验证：无 node_modules 的完整 ZIP 解压目录启动、不同端口并行运行、分类与分页、随机选择、背景加载及 PNG 导出。Windows/Linux 的启动助手使用跨平台 Node API，但尚未实机验收，不声称全平台已经验证。

浏览器回归：启动工作台后，在 `app` 运行 `npx playwright install chromium webkit` 与 `npm run test:browser`；可用 `STUDIO_TEST_URL` 指向待测页面。测试覆盖窄屏、PNG 尺寸、原图、分享可用/取消/失败/不支持与电脑下载。浏览器内核与设备尺寸模拟不能替代真机长按菜单和相册验收。

构建完整发行包：`python3 scripts/build_release.py`。在线版在 `app` 中用 `VITE_ONLINE_DEMO=1 npm run build -- --base=/cards/ --outDir=../.build/online` 保留线上演示资料，分享包使用中性默认资料。在线部署需保留现有演示头像和统计脚本。

## 来源与许可

代码基于 [dontbesilent Tweet Card Studio](https://github.com/line-cell/dontbesilent-tweet-card-studio) 改编，保留 line-cell 原始 MIT 版权声明。敏敏版调整连续编辑布局、多平台卡片、图库与默认视觉，移除了文案库及固定改写模板。

本版不带上游原有图库，仅带敏敏委托 imagegen 生成并逐张对应核验的 254 张底图。图片使用说明见 [ASSET-LICENSE.md](ASSET-LICENSE.md)，来源与原始/发行版哈希见 [图片来源清单](app/public/gallery-provenance.json)。生成图不表示真实地点实拍或第三方品牌授权。代码遵循 [MIT LICENSE](LICENSE)，打包依赖声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

<!-- minmin-contact:start -->
## 联系敏敏

使用中有问题，或想交流新想法？欢迎联系敏敏。

<img src="https://tools.minmin11538.cn/matrix/contact/wechat-min11538.jpg" width="180" alt="敏敏的微信二维码">

微信：**min11538** · [敏敏的个人主页](https://me.minmin11538.cn/)
<!-- minmin-contact:end -->
