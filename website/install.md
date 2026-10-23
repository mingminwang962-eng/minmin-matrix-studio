# 敏敏矩阵工作台安装与使用

正式安装页：https://tools.minmin11538.cn/matrix/
源码：https://github.com/mingminwang962-eng/minmin-matrix-studio

1. 通过 HTTPS 读取同目录 release.json；若网页工具无法读取，使用命令行 HTTPS 请求。按 version、package_url、bytes、sha256 获取完整 ZIP，不运行其他网站提供的同名脚本。
2. 下载到临时目录，核对字节数与 SHA-256，再使用系统解压工具解压。包根目录为 minmin-matrix-studio，首先读取 SKILL.md。
3. 检查 node --version，需要 Node.js 22.13 或以上；缺少时从 https://nodejs.org/ 官方渠道安装。普通用户不需要 npm 安装依赖、Python 或 Pillow。
4. 放入用户选定的独立安装目录，再按当前 Agent 实际支持的技能目录规范注册或复制。未知客户端不要猜固定路径；包本身也可直接运行。
5. 运行 node scripts/start.mjs，打开打印的本机地址。该命令自动选择空闲端口，仅监听 127.0.0.1，不公开用户电脑服务。不默认添加开机启动。
6. 使用用户自己的名字、头像与文案。首次至少验证页面打开、背景加载、随机选图和实际 PNG 导出，并检查像素尺寸。没有浏览器控制能力时打开页面让用户操作，不谎称自动完成。
7. 成品和私有资料保存到用户自己的工作目录。当前页面不自动保存草稿，刷新前及时导出。更新前备份旧安装与用户配置，不能覆盖其他技能。

支持与限制：已在 macOS 验收；Windows/Linux 尚未实机测试。互动数字是模拟值。图片许可及来源见包内 ASSET-LICENSE.md；原有代码保留 MIT LICENSE 与原作者声明；新增署名内容与成品无水印规则见 COPYRIGHT.md 和 BRAND-LICENSE.md。

GitHub 下载方式：使用仓库 downloads/minmin-matrix-studio-1.2.1.zip 的完整包，或从本安装页取得相同版本；按 release.json 校验。只下载 GitHub 源码时，按 README 构建后再启动。

来源：敏敏制作 · https://tools.minmin11538.cn/matrix/ 。修改或分发前读取 [版权范围](COPYRIGHT.md) 和 [来源署名许可](BRAND-LICENSE.md)。用户生成图片不加水印；品牌官网待上线，暂用项目介绍页。
