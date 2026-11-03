(() => {
  const asset = name => new URL(name, document.currentScript.src).href;
  const qr = asset('wechat-min11538.jpg');
  const mark = asset('bistar-b.png');
  const names = {'cover-studio':'敏敏封面工作室',matrix:'敏敏矩阵工作台',notehelper:'笔记同步助手','portrait-stickers':'真人互动表情包','personal-ip':'个人 IP 形象'};
  let dialog;
  function openGuide(tool) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'mi-dialog';
      dialog.id = 'minmin-install-guide';
      dialog.setAttribute('aria-labelledby', 'mi-title');
      dialog.setAttribute('aria-describedby', 'mi-steps');
      dialog.innerHTML = `<button class="mi-close" type="button" aria-label="关闭安装指引">×</button>
        <p class="mi-success"><span aria-hidden="true">✓</span> 已复制安装口令</p>
        <h2 id="mi-title">去 AI 助手，<br>粘贴并发送。</h2>
        <p class="mi-tool"></p>
        <ol class="mi-steps" id="mi-steps">
          <li><span>01</span><div>打开 WorkBuddy 等 AI 助手的对话框。</div></li>
          <li><span>02</span><div>粘贴刚才的口令，点击发送。<small>Mac：⌘V · Windows：Ctrl+V</small></div></li>
          <li><span>03</span><div>按助手提示完成安装，等它报告“安装成功”后再试用。<small>仅复制口令或打开网页，还没有完成安装。</small></div></li>
        </ol>
        <button class="mi-done" type="button" autofocus>知道了，去粘贴 <span aria-hidden="true">↗</span></button>
        <section class="mi-contact" aria-label="联系敏敏">
          <a href="${qr}" target="_blank" rel="noopener" aria-label="查看敏敏的微信二维码原图"><img class="mi-qr" src="${qr}" width="599" height="572" alt="敏敏的微信二维码" decoding="async"></a>
          <div><h3><img src="${mark}" width="32" height="32" alt="">联系敏敏</h3><p>使用中有问题，或想交流新想法？<br>欢迎扫码联系。</p><p class="mi-wechat">微信 <strong>min11538</strong></p></div>
        </section>`;
      document.body.append(dialog);
      dialog.querySelector('.mi-close').addEventListener('click', () => dialog.close());
      dialog.querySelector('.mi-done').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
      });
    }
    dialog.querySelector('.mi-success').lastChild.textContent = ` 已复制「${names[tool]}」安装口令`;
    dialog.querySelector('.mi-tool').textContent = names[tool];
    const completion = dialog.querySelector('.mi-steps li:last-child div');
    completion.firstChild.textContent = tool === 'notehelper' ? '按提示接好微信和飞书，转发一条资料并打开飞书验收，再确认定时同步。' : '按助手提示完成安装，等它报告“安装成功”后再试用。';
    completion.querySelector('small').textContent = tool === 'notehelper' ? '下载、安装完成后，还需要授权和同步测试。' : '仅复制口令或打开网页，还没有完成安装。';
    if (!dialog.open) dialog.showModal();
    const notice = document.querySelector('.install-copy-notice');
    if (notice) notice.hidden = true;
  }
  document.addEventListener('minmin:install-copy', event => {
    const detail = event.detail;
    if (detail?.result === 'success' && names[detail.tool]) queueMicrotask(() => openGuide(detail.tool));
  });
})();
