import { useEffect, useRef, useState } from "react";

export type ExportedImage = { url: string; name: string; file: File };

export default function ImageSaveDialog({ image, onClose }: { image: ExportedImage; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState("");
  let canShare = false;
  try {
    canShare = typeof navigator.share === "function" && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [image.file] });
  } catch { /* Keep the original image available when file sharing is blocked. */ }

  useEffect(() => {
    const dialog = dialogRef.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => { document.body.style.overflow = overflow; };
  }, []);

  async function shareImage() {
    setSharing(true);
    setNotice("");
    try {
      // The PNG is ready before this click, preserving iOS user activation.
      await navigator.share({ files: [image.file] });
      setNotice("已交给系统处理，请到相册确认是否保存；也可继续长按原图保存。");
    } catch (error) {
      setNotice(error instanceof Error && error.name === "AbortError"
        ? "已取消分享，仍可长按下方原图保存。"
        : "系统分享暂不可用，请长按下方原图保存，或打开原图后保存。");
    } finally { setSharing(false); }
  }

  return (
    <dialog ref={dialogRef} className="image-save-dialog" aria-modal="true" aria-labelledby="image-save-title" aria-describedby="image-save-help" onClose={onClose}>
      <header className="image-save-heading">
        <h2 id="image-save-title">保存图片</h2>
        <button type="button" className="secondary-button" onClick={onClose} autoFocus>返回编辑</button>
      </header>
      <p id="image-save-help">长按下方原图，选择“保存图片”或“存储到照片”。保存的是完整 PNG，不是屏幕截图。</p>
      <div className="image-save-actions">
        {canShare && <button type="button" className="download-button" disabled={sharing} onClick={shareImage}>{sharing ? "等待系统操作" : "系统分享 / 保存"}</button>}
        <a className="secondary-button" href={image.url} target="_blank" rel="noopener">打开原图</a>
        <a className="secondary-button" href={image.url} download={image.name}>下载 PNG 文件</a>
      </div>
      <p className="image-save-notice" role="status" aria-live="polite">{notice || (canShare
        ? "也可点“系统分享 / 保存”，在系统菜单中选择可用的保存选项。"
        : "此浏览器未提供图片分享，可长按原图保存，或打开原图后保存。")}</p>
      <img className="image-save-original" src={image.url} alt="可长按保存的 PNG 原图" />
      <p className="image-save-help">微信等内置浏览器若没有保存选项，可先试“打开原图”。仍无法保存时，请复制文案，再用 Safari、Chrome 或手机自带浏览器打开工作台重新生成。修改内容后需重新生成图片。</p>
    </dialog>
  );
}
