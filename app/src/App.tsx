import {
  Bookmark,
  Check,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Link,
  Maximize2,
  Minus,
  Moon,
  Move,
  RefreshCw,
  Search,
  Shuffle,
  Plus,
  Sun,
  ThumbsUp,
  Upload,
} from "lucide-react";
import { BookmarkSimple, ChartBar, ChatCircle, DotsThree, Heart, Repeat, SealCheck } from "@phosphor-icons/react";
import { toPng } from "html-to-image";
import {
  CSSProperties,
  ForwardedRef,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cleanCardText } from "./textTools";
import generatedBackgrounds from "./generated-backgrounds.json";

type Profile = {
  name: string;
  handle: string;
  date: string;
  avatar: string | null;
};

type Metrics = { comments: number; reposts: number; likes: number; views: number; bookmarks: number };
const METRIC_FIELDS: { key: keyof Metrics; label: string }[] = [
  { key: "likes", label: "点赞" },
  { key: "comments", label: "评论" },
  { key: "reposts", label: "转发" },
  { key: "views", label: "浏览" },
  { key: "bookmarks", label: "收藏" },
];
type CardPlatform = "x" | "weibo" | "moments";
const CARD_PLATFORMS: { id: CardPlatform; label: string }[] = [
  { id: "x", label: "X 卡片" },
  { id: "weibo", label: "微博卡片" },
  { id: "moments", label: "朋友圈卡片" },
];


function seededNumber(key: string, min: number, max: number) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return min + ((hash >>> 0) % (max - min + 1));
}

function demoMetrics(variant: number): Metrics {
  const key = `minmin:${variant}`;
  return {
    comments: seededNumber(`${key}:comments`, 120, 480),
    reposts: seededNumber(`${key}:reposts`, 300, 1400),
    likes: seededNumber(`${key}:likes`, 4200, 18000),
    views: seededNumber(`${key}:views`, 280000, 4200000),
    bookmarks: seededNumber(`${key}:bookmarks`, 520, 5600),
  };
}

function formatMetric(value: number) {
  if (value >= 100000) return `${Math.round(value / 10000)}万`;
  if (value >= 10000) return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}万`;
  return value.toLocaleString("en-US");
}

type Background = {
  id: string;
  name: string;
  src: string;
  keywords: string;
  category: string;
  origin?: "minmin";
};

const BACKGROUND_PAGE_SIZE = 12;
const MIN_CARD_SCALE = 45;
const MAX_CARD_SCALE = 140;

function clampCardScale(value: number) {
  return Math.min(MAX_CARD_SCALE, Math.max(MIN_CARD_SCALE, value));
}

const BACKGROUNDS: Background[] = [
  ...generatedBackgrounds.map(item => ({ ...item, origin: "minmin" as const })),
].map(item => ({ ...item, src: `${import.meta.env.BASE_URL}${item.src.replace(/^\//, "")}` }));
const BACKGROUND_CATEGORIES = ["商务建筑", "办公空间", "酒店休闲", "海滨湖景", "城市街景", "咖啡餐饮", "艺术书店", "自然庭园", "城市夜景", "雪山雪景", "汽车游艇"];

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function displayDate(date: string) {
  if (!date) return "";
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function waitForImage(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth === 0) throw new Error("图片加载失败");
  if (!image.complete || image.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("图片加载失败")), { once: true });
    });
  }
  if (typeof image.decode === "function") await image.decode();
}

async function inlineImages(target: HTMLElement) {
  const images = Array.from(target.querySelectorAll("img"));
  const replacements: Array<{ image: HTMLImageElement; originalSrc: string; dataUrl: string }> = [];

  for (const image of images) {
    await waitForImage(image);
    const originalSrc = image.getAttribute("src") || "";
    const resolvedSrc = image.currentSrc || image.src;
    if (!resolvedSrc || resolvedSrc.startsWith("data:")) continue;

    const response = await fetch(resolvedSrc, { cache: "force-cache" });
    if (!response.ok) throw new Error("图片读取失败");
    const dataUrl = await blobToDataUrl(await response.blob());
    replacements.push({ image, originalSrc, dataUrl });
  }

  for (const replacement of replacements) {
    replacement.image.src = replacement.dataUrl;
    await waitForImage(replacement.image);
  }

  return () => replacements.reverse().forEach(({ image, originalSrc }) => image.setAttribute("src", originalSrc));
}

export default function App() {
  const [profile, setProfile] = useState<Profile>({ name: "你的名字", handle: "", date: localDate(), avatar: `${import.meta.env.BASE_URL}default-avatar.svg` });
  const metricVariant = useRef(Date.now());
  const [metrics, setMetrics] = useState<Metrics>(() => demoMetrics(metricVariant.current));
  const [activeTool, setActiveTool] = useState("author");
  const [editedText, setEditedText] = useState("");
  const [outputMode, setOutputMode] = useState<"douyin" | "card">("douyin");
  const [canvasAspect, setCanvasAspect] = useState<"portrait" | "tall">("portrait");
  const [cardPlatform, setCardPlatform] = useState<CardPlatform>("x");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [cardTheme, setCardTheme] = useState<"light" | "dark">("light");
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0]);
  const [backgroundQuery, setBackgroundQuery] = useState("");
  const [backgroundCategory, setBackgroundCategory] = useState("全部");
  const [backgroundPage, setBackgroundPage] = useState(0);
  const [selectingBackground, setSelectingBackground] = useState(false);
  const selectionRequest = useRef(0);
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [loadingBackground, setLoadingBackground] = useState(false);
  const [dim, setDim] = useState(0);
  const [cardScale, setCardScale] = useState(90);
  const [bodySize, setBodySize] = useState(28);
  const [cardOpacity, setCardOpacity] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [exported, setExported] = useState<{ url: string; name: string } | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(720);
  const artboardRef = useRef<HTMLDivElement>(null);
  const tweetCardRef = useRef<HTMLElement>(null);
  const dragRef = useRef({ active: false, clientX: 0, clientY: 0, x: 0, y: 0 });
  const resizeRef = useRef({ active: false, clientX: 0, clientY: 0, scale: 90 });

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveTool((entry.target as HTMLElement).dataset.tool!);
      }
    }, { rootMargin: "-90px 0px -60% 0px" });
    document.querySelectorAll("[data-tool]").forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = artboardRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => setCanvasWidth(canvas.clientWidth));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [outputMode]);

  const backgroundCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of BACKGROUNDS) {
      const category = item.category;
      counts[category] = (counts[category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredBackgrounds = useMemo(() => {
    const keyword = backgroundQuery.trim().toLowerCase();
    return BACKGROUNDS.filter((item) =>
      (backgroundCategory === "全部" || item.category === backgroundCategory) &&
      `${item.name} ${item.keywords}`.toLowerCase().includes(keyword),
    );
  }, [backgroundQuery, backgroundCategory]);

  const pageCount = Math.max(1, Math.ceil(filteredBackgrounds.length / BACKGROUND_PAGE_SIZE));
  const visibleBackgrounds = filteredBackgrounds.slice(backgroundPage * BACKGROUND_PAGE_SIZE, (backgroundPage + 1) * BACKGROUND_PAGE_SIZE);

  // Load the next page's tiny thumbnails ahead of navigation; originals load only on selection.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      filteredBackgrounds.slice((backgroundPage + 1) * BACKGROUND_PAGE_SIZE, (backgroundPage + 2) * BACKGROUND_PAGE_SIZE).forEach(background => {
        const image = new Image();
        image.src = `${import.meta.env.BASE_URL}gallery-thumbs/${background.id}.webp`;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filteredBackgrounds, backgroundPage]);

  async function selectBackground(background: Background) {
    const request = ++selectionRequest.current;
    setSelectingBackground(true);
    try {
      const image = new Image();
      image.src = background.src;
      await image.decode();
      if (request !== selectionRequest.current) return;
      setSelectedBackground(background);
      setCustomBackground(null);
      setExported(null);
      setLoadError("");
    } catch {
      if (request === selectionRequest.current) setLoadError("这张背景暂时未能加载，请重试或换一张。");
    } finally {
      if (request === selectionRequest.current) setSelectingBackground(false);
    }
  }

  function randomBackground() {
    const choices = filteredBackgrounds.filter(background => background.id !== selectedBackground.id || customBackground);
    if (choices.length) {
      const background = choices[Math.floor(Math.random() * choices.length)];
      setBackgroundPage(Math.floor(filteredBackgrounds.indexOf(background) / BACKGROUND_PAGE_SIZE));
      void selectBackground(background);
    }
  }

  const backgroundSrc = customBackground || selectedBackground.src;
  const previewText = cleanCardText(editedText);
  const platformLabel = CARD_PLATFORMS.find(item => item.id === cardPlatform)!.label;
  const rawCardWidth = orientation === "landscape" ? 760 : 620;
  const effectiveBodySize = Math.max(
    12,
    bodySize - (previewText.length > 900 ? 6 : previewText.length > 650 ? 5 : previewText.length > 420 ? 3 : previewText.length > 260 ? 1 : 0),
  );

  async function useBackgroundUrl() {
    if (!backgroundUrl.trim()) return;
    setLoadingBackground(true);
    const request = ++selectionRequest.current;
    setSelectingBackground(false);
    try {
      const url = new URL(backgroundUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported URL");
      const knownHosts = ["tiance-tweet-card.leobai825.chatgpt.site", "dontbesilent-tweet-card-studio.vercel.app", "images.unsplash.com", "pbs.twimg.com", "upload.wikimedia.org"];
      const response = await fetch(knownHosts.includes(url.hostname) ? `${import.meta.env.BASE_URL}api/background-image?url=${encodeURIComponent(url.href)}` : url.href, { credentials: "omit" });
      if (!response.ok) throw new Error("image fetch failed");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not an image");
      const image = await blobToDataUrl(blob);
      if (request !== selectionRequest.current) return;
      setCustomBackground(image);
      setLoadError("");
    } catch {
      setLoadError("网络图片无法读取，请检查链接，或保存图片后通过“上传自己的背景”导入。");
    } finally { setLoadingBackground(false); }
  }

  async function handleUpload(file: File | undefined, kind: "avatar" | "background") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLoadError("请选择图片文件。");
      return;
    }
    const request = kind === "background" ? ++selectionRequest.current : 0;
    if (kind === "background") setSelectingBackground(false);
    try {
      const dataUrl = await blobToDataUrl(file);
      if (kind === "background" && request !== selectionRequest.current) return;
      if (kind === "avatar") setProfile((current) => ({ ...current, avatar: dataUrl }));
      else setCustomBackground(dataUrl);
      setLoadError("");
    } catch {
      setLoadError("图片读取失败，请重新选择。");
    }
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (outputMode !== "douyin") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      clientX: event.clientX,
      clientY: event.clientY,
      x: position.x,
      y: position.y,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!dragRef.current.active) return;
    setPosition({
      x: dragRef.current.x + event.clientX - dragRef.current.clientX,
      y: dragRef.current.y + event.clientY - dragRef.current.clientY,
    });
  }

  function stopDrag() {
    dragRef.current.active = false;
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (outputMode !== "douyin") return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      active: true,
      clientX: event.clientX,
      clientY: event.clientY,
      scale: cardScale,
    };
  }

  function moveResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!resizeRef.current.active) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = Math.max(event.clientX - resizeRef.current.clientX, event.clientY - resizeRef.current.clientY);
    setCardScale(clampCardScale(Math.round(resizeRef.current.scale + delta / 3)));
  }

  function stopResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    resizeRef.current.active = false;
  }

  function fitCardToCanvas() {
    const canvasWidth = artboardRef.current?.clientWidth;
    const cardWidth = tweetCardRef.current?.offsetWidth;
    if (!canvasWidth || !cardWidth) return;
    setCardScale(clampCardScale(Math.round(((canvasWidth - 48) / (cardWidth * canvasWidth / 720)) * 100)));
    setPosition({ x: 0, y: 0 });
  }

  async function downloadImage(pureCard = false) {
    const mode = pureCard ? "card" : outputMode;
    const target = mode === "douyin" ? artboardRef.current : tweetCardRef.current;
    if (!target || !previewText.trim()) return;
    setLoadError("");
    setIsDownloading(true);
    let restoreImages = () => {};
    const exportClassTarget = mode === "douyin" ? artboardRef.current : null;
    try {
      exportClassTarget?.classList.add("is-exporting");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await document.fonts.ready;
      restoreImages = await inlineImages(target);
      const pixelRatio = mode === "douyin" ? 1 : 2;
      const dataUrl = await toPng(target, {
        cacheBust: false,
        pixelRatio,
        style: mode === "card" ? { maxWidth: "none", width: `${target.offsetWidth}px`, transform: "none", position: "static", inset: "auto", margin: "0" } : undefined,
        canvasWidth: mode === "douyin" ? 1080 : undefined,
        canvasHeight: mode === "douyin" ? (canvasAspect === "tall" ? 1920 : 1440) : undefined,
        filter: node => !(node instanceof HTMLElement && node.classList.contains("card-resize-handle")),
        backgroundColor: mode === "douyin" ? "#0b0b0b" : cardTheme === "light" ? "#ffffff" : "#000000",
      });
      const link = document.createElement("a");
      const fileName = `minmin-${cardPlatform}-${profile.date || localDate()}-${mode === "douyin" ? (canvasAspect === "tall" ? "1080x1920" : "1080x1440") : "card"}-${orientation}.png`;
      setExported({ url: dataUrl, name: fileName });
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch {
      setLoadError("图片导出失败，请检查图片是否加载完成，或重新上传图片。");
    } finally {
      restoreImages();
      exportClassTarget?.classList.remove("is-exporting");
      setIsDownloading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><img src={profile.avatar || `${import.meta.env.BASE_URL}default-avatar.svg`} alt="工作台头像" /></div>
          <div>
            <p className="eyebrow">MINMIN MATRIX STUDIO</p>
            <h1>敏敏矩阵工作台</h1>
          </div>
        </div>
        <div className="status-pill">写文案 · 选背景 · 导出图片</div>
      </header>

      <div className="workspace">
        <aside className="control-panel">
          <nav className="tool-nav" aria-label="编辑工具定位">
            {[["author", "作者"], ["text", "正文"], ["style", "样式"], ["background", "背景"], ["export", "导出"]].map(([id, label]) => (
              <button key={id} aria-current={activeTool === id ? "location" : undefined} onClick={() => {
                setActiveTool(id);
                document.getElementById(`tool-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>{label}</button>
            ))}
          </nav>
          <section className="control-section profile-section" id="tool-author" data-tool="author">
            <SectionHeading number="01" title="作者资料" subtitle="当天日期会在打开页面时自动填入，也可手动修改" />
            <div className="profile-avatar-row">
              <div className="profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="作者头像" /> : <span>你</span>}</div>
              <label className="upload-button">
                <Upload size={17} /> 上传头像
                <input type="file" accept="image/*" aria-label="上传头像" onChange={(event) => handleUpload(event.target.files?.[0], "avatar")} />
              </label>
            </div>
            <div className="profile-fields">
              <label>显示名称<input value={profile.name} maxLength={30} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
              {cardPlatform === "x" && <label>X 账号（可留空）<input value={profile.handle} maxLength={32} placeholder="@你的账号" onChange={(event) => setProfile({ ...profile, handle: event.target.value })} /></label>}
              <label>日期（可留空）<input type="date" value={profile.date} onChange={(event) => setProfile({ ...profile, date: event.target.value })} /></label>
            </div>
          </section>

          <section className="control-section editor-section" id="tool-text" data-tool="text">
            <SectionHeading number="02" title="卡片文案" subtitle="写下想法或粘贴正文，右侧实时预览" />
            <textarea aria-label="卡片文案" value={editedText} onChange={(event) => { setEditedText(event.target.value); setExported(null); }} onBlur={event => { const text = cleanCardText(event.target.value); if (text !== event.target.value) setEditedText(text); }} rows={8} placeholder="粘贴你的文案，右侧会实时预览。用空行分段。" />
            <div className="text-count">{Array.from(previewText).length} 字</div>
          </section>

          <section className="control-section" id="tool-style" data-tool="style">
            <SectionHeading number="03" title="发布样式" subtitle="选卡片风格，再选背景图片或纯卡片" />
            <div className="platform-options" role="group" aria-label="卡片平台">
              {CARD_PLATFORMS.map(platform => <button key={platform.id} aria-pressed={cardPlatform === platform.id} className={cardPlatform === platform.id ? "active" : ""} onClick={() => { setCardPlatform(platform.id); setPosition({ x: 0, y: 0 }); setExported(null); setLoadError(""); }}>{platform.label}</button>)}
            </div>
            <div className="choice-grid">
              <button className={outputMode === "douyin" ? "selected" : ""} onClick={() => setOutputMode("douyin")}>
                <ImageIcon size={19} /><span><strong>背景图片</strong><small>{canvasAspect === "tall" ? "1080 × 1920" : "1080 × 1440"} PNG</small></span>
              </button>
              <button className={outputMode === "card" ? "selected" : ""} onClick={() => setOutputMode("card")}>
                <Bookmark size={19} /><span><strong>纯文字卡片</strong><small>只导出{platformLabel}</small></span>
              </button>
            </div>
            {outputMode === "douyin" && <div className="card-option-row"><span>画布比例</span><div className="theme-toggle" role="group" aria-label="画布比例"><button className={canvasAspect === "portrait" ? "active" : ""} onClick={() => { setCanvasAspect("portrait"); setPosition({ x: 0, y: 0 }); setExported(null); }}>3:4 竖图</button><button className={canvasAspect === "tall" ? "active" : ""} onClick={() => { setCanvasAspect("tall"); setPosition({ x: 0, y: 0 }); setExported(null); }}>9:16 竖图</button></div></div>}
            <div className="card-option-row"><span>卡片版式</span><div className="theme-toggle"><button className={orientation === "portrait" ? "active" : ""} onClick={() => { setOrientation("portrait"); setPosition({ x: 0, y: 0 }); }}>竖版卡片</button><button className={orientation === "landscape" ? "active" : ""} onClick={() => { setOrientation("landscape"); setPosition({ x: 0, y: 0 }); }}>横版卡片</button></div></div>
            <div className="card-option-row">
              <span>卡片颜色</span>
              <div className="theme-toggle" role="group" aria-label="卡片颜色">
                <button className={cardTheme === "light" ? "active" : ""} onClick={() => setCardTheme("light")}><Sun size={15} /> 白色</button>
                <button className={cardTheme === "dark" ? "active" : ""} onClick={() => setCardTheme("dark")}><Moon size={15} /> 黑色</button>
              </div>
            </div>
            {cardPlatform !== "moments" && <fieldset className="metric-fields">
              <legend>互动数据</legend>
              <button className="random-metrics" onClick={() => { setMetrics(demoMetrics(++metricVariant.current)); setExported(null); }}><Shuffle size={14} /> 换一组数据</button>
              <div>{METRIC_FIELDS.filter(field => cardPlatform === "x" || !["views", "bookmarks"].includes(field.key)).map(field => <label key={field.key}>{field.label}<input aria-label={`${field.label}数量`} type="number" min={0} step={1} value={metrics[field.key]} onChange={event => { setMetrics(current => ({ ...current, [field.key]: Math.max(0, Math.trunc(Number(event.target.value) || 0)) })); setExported(null); }} /></label>)}</div>
              <p>打开页面自动生成一组展示值，也可手动修改；不代表真实平台数据。</p>
            </fieldset>}
          </section>

          {outputMode === "douyin" && (
            <section className="control-section background-section" id="tool-background" data-tool="background">
              <SectionHeading
                number="04"
                title="选择背景"
                subtitle={`敏敏生成的 ${BACKGROUNDS.length} 张底图，先选场景，再挑图片`}
              />
              <div className="category-tabs background-categories" role="group" aria-label="背景类别">
                {["全部", ...BACKGROUND_CATEGORIES.filter(category => backgroundCategoryCounts[category])].map(category => (
                  <button key={category} aria-pressed={backgroundCategory === category} className={backgroundCategory === category ? "active" : ""} onClick={() => { setBackgroundCategory(category); setBackgroundPage(0); }}>
                    {category}<small>{category === "全部" ? Object.values(backgroundCategoryCounts).reduce((total, count) => total + count, 0) : backgroundCategoryCounts[category]}</small>
                  </button>
                ))}
              </div>
              <label className="search-box full">
                <Search size={17} />
                <input
                  aria-label="搜索背景图库"
                  value={backgroundQuery}
                  onChange={(event) => {
                    setBackgroundQuery(event.target.value);
                    setBackgroundPage(0);
                  }}
                  placeholder="搜名称、颜色或场景，如：海景、酒红、办公室"
                />
              </label>
              <div className="url-row"><label><Link size={15} /><input aria-label="网络背景图片地址" value={backgroundUrl} onChange={event => setBackgroundUrl(event.target.value)} placeholder="粘贴网络图片地址" /></label><button disabled={loadingBackground || !backgroundUrl.trim()} onClick={useBackgroundUrl}>{loadingBackground ? "读取中" : "使用"}</button></div>
              <div className="gallery-heading"><p className="filter-summary">{backgroundCategory} · {filteredBackgrounds.length} 张</p><button className="secondary-button" disabled={!filteredBackgrounds.length || selectingBackground} onClick={randomBackground}><Shuffle size={15} /> {selectingBackground ? "加载背景中…" : "随机一张"}</button></div>
              <p className="filter-summary" aria-live="polite">当前背景：{selectedBackground.name}{selectingBackground ? " · 加载中" : ""}</p>
              <div className="background-grid">
                {visibleBackgrounds.map((background) => (
                  <button key={background.id} title={`${background.category} · ${background.name}`} className={selectedBackground.id === background.id && !customBackground ? "selected" : ""} onClick={() => void selectBackground(background)}>
                    <img src={`${import.meta.env.BASE_URL}gallery-thumbs/${background.id}.webp`} alt={background.name} loading="eager" decoding="async" width={192} height={192} />
                    <small className="background-tag">{background.category}</small>
                    <span>{background.name}</span>
                  </button>
                ))}
              </div>
              <div className="gallery-pages" aria-label="背景分页">
                <button disabled={backgroundPage === 0} onClick={() => setBackgroundPage(page => page - 1)}>上一页</button>
                <label><span>跳转页面</span><select aria-label="背景页码" value={backgroundPage} onChange={event => setBackgroundPage(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, page) => <option key={page} value={page}>第 {page + 1} / {pageCount} 页</option>)}</select></label>
                <button disabled={backgroundPage + 1 >= pageCount} onClick={() => setBackgroundPage(page => page + 1)}>下一页</button>
              </div>
              {!filteredBackgrounds.length && <p className="filter-summary">没有找到匹配背景，试试其他场景或关键词。</p>}
              <label className="upload-button">
                <Upload size={17} /> 上传自己的背景
                <input type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0], "background")} />
              </label>
              <RangeControl label="背景压暗" value={`${dim}%`} min={0} max={55} current={dim} onChange={setDim} />
              <CardScaleControl current={cardScale} onChange={setCardScale} onFit={fitCardToCanvas} />
              <div className="drag-help"><Move size={16} /> 在右侧拖动卡片调整位置 <button onClick={() => setPosition({ x: 0, y: 0 })}><RefreshCw size={14} /> 居中重置</button></div>
            </section>
          )}

          <section className="control-section" id="tool-export" data-tool="export">
            <SectionHeading number="05" title="调整与导出" subtitle="右侧看到的就是最终图片，长文会自动缩小字号" />
            <RangeControl label="正文字号" value={`${bodySize}px`} min={14} max={40} current={bodySize} onChange={setBodySize} />
            <RangeControl label="卡片透明度" value={`${cardOpacity}%`} min={55} max={100} current={cardOpacity} onChange={setCardOpacity} />
            {cardPlatform !== "moments" && <p className="filter-summary">互动数字为卡片展示值，可在“选择发布样式”里修改。</p>}
            <button className="secondary-button direct-card-button" disabled={!previewText.trim() || isDownloading} onClick={() => downloadImage(true)}><Download size={15} /> 直接导出纯卡片</button>
          </section>

        </aside>

        <section className="preview-panel">
          <div className="preview-toolbar">
            <strong><span className="live-dot" />{outputMode === "douyin" ? `${platformLabel} · ${canvasAspect === "tall" ? "9:16" : "3:4"} 预览` : `${platformLabel}预览`}</strong>
            <div>
              {outputMode === "douyin" && <button disabled={!filteredBackgrounds.length || selectingBackground} onClick={randomBackground}><Shuffle size={14} /> 随机背景</button>}
              <span className="preview-dimensions">{outputMode === "douyin" ? (canvasAspect === "tall" ? "1080 × 1920" : "1080 × 1440") : "PNG"}</span>
              {cardPlatform !== "moments" && <button onClick={() => { setMetrics(demoMetrics(++metricVariant.current)); setExported(null); }}><Shuffle size={14} /> 换一组数据</button>}
            </div>
          </div>

          <div className={`preview-stage ${outputMode}`}>
            <div
              ref={artboardRef}
              className={`artboard ${outputMode === "card" ? `card-only theme-${cardTheme}` : `canvas-${canvasAspect}`}`}
              style={undefined}
            >
              {outputMode === "douyin" && (
                <>
                  <img className="canvas-background" src={backgroundSrc} alt="" />
                  <div className="canvas-dim" style={{ background: `rgba(0,0,0,${dim / 100})` }} />
                </>
              )}
              <TweetCard
                ref={tweetCardRef}
                profile={profile}
                platform={cardPlatform}
                metrics={metrics}
                text={previewText}
                fontSize={effectiveBodySize}
                theme={cardTheme}
                opacity={cardOpacity}
                className={outputMode === "douyin" ? "movable-card" : ""}
                style={outputMode === "douyin" ? {
                  width: rawCardWidth,
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${cardScale / 100 * canvasWidth / 720})`,
                } : { width: rawCardWidth, transform: `scale(${Math.min(1, (canvasWidth - 80) / rawCardWidth)})` }}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                resizeControl={outputMode === "douyin" ? (
                  <button
                    type="button"
                    className="card-resize-handle"
                    title="拖动调整卡片大小"
                    aria-label="拖动调整卡片大小"
                    onPointerDown={startResize}
                    onPointerMove={moveResize}
                    onPointerUp={stopResize}
                    onPointerCancel={stopResize}
                  >
                    <Maximize2 size={13} />
                  </button>
                ) : null}
              />
            </div>
          </div>

          <div className="preview-footer">
            <p><Check size={16} /> 导出 PNG 图片后，可上传到你的发布平台。</p>
            <div>
              <button className="download-button" onClick={() => downloadImage()} disabled={isDownloading || selectingBackground || !previewText.trim()}>
                {isDownloading ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}
                {isDownloading ? "正在生成" : "导出 PNG"}
              </button>
            </div>
          </div>
          {loadError && <p className="export-notice" role="alert">{loadError}</p>}
          {exported && (
            <section className="export-result" aria-label="已生成图片">
              <a href={exported.url} download={exported.name}><img src={exported.url} alt="已生成 PNG 预览" /></a>
              <div><strong>图片已生成</strong><p>点击保存本次导出的 PNG。修改内容后请重新导出。</p><a href={exported.url} download={exported.name}>保存图片</a></div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="section-heading">
      <span>{number}</span>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
    </div>
  );
}

function RangeControl({ label, value, min, max, current, onChange }: { label: string; value: string; min: number; max: number; current: number; onChange: (value: number) => void }) {
  return (
    <label className="range-control">
      <span>{label}<strong>{value}</strong></span>
      <input type="range" min={min} max={max} value={current} onChange={(event) => onChange(Number(event.target.value))} aria-label={`${label} ${value}`} />
    </label>
  );
}

function CardScaleControl({ current, onChange, onFit }: { current: number; onChange: (value: number) => void; onFit: () => void }) {
  const update = (value: number) => onChange(clampCardScale(value));
  return (
    <div className="range-control scale-control">
      <span>卡片大小<strong>{current}%</strong></span>
      <div className="scale-adjuster">
        <button title="缩小 5%" aria-label="缩小卡片" onClick={() => update(current - 5)}><Minus size={15} /></button>
        <input type="range" min={MIN_CARD_SCALE} max={MAX_CARD_SCALE} value={current} onChange={(event) => update(Number(event.target.value))} aria-label={`卡片大小 ${current}%`} />
        <label className="scale-number">
          <input type="number" min={MIN_CARD_SCALE} max={MAX_CARD_SCALE} value={current} onChange={(event) => update(Number(event.target.value))} aria-label="输入卡片大小" />
          <span>%</span>
        </label>
        <button title="放大 5%" aria-label="放大卡片" onClick={() => update(current + 5)}><Plus size={15} /></button>
        <button title="接近画布满宽" aria-label="卡片接近满宽" onClick={onFit}><Maximize2 size={15} /></button>
      </div>
    </div>
  );
}

const TweetCard = forwardRef(function TweetCard({
  profile, platform, metrics, text, fontSize, theme, opacity, className, style,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel, resizeControl,
}: {
  profile: Profile;
  platform: CardPlatform;
  metrics: Metrics;
  text: string;
  fontSize: number;
  theme: "light" | "dark";
  opacity: number;
  className?: string;
  style?: CSSProperties;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp?: () => void;
  onPointerCancel?: () => void;
  resizeControl?: ReactNode;
}, ref: ForwardedRef<HTMLElement>) {
  const handle = profile.handle.trim().replace(/^@+/, "");
  return (
    <article ref={ref} className={`tweet-card platform-${platform} theme-${theme} ${className || ""}`}
      style={{ ...style, "--tweet-size": `${fontSize}px`, "--card-alpha": opacity / 100 } as CSSProperties}
      aria-label="卡片图片预览" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
      <header className="tweet-header">
        <div className="tweet-avatar">
          {profile.avatar ? <img src={profile.avatar} alt="作者头像" /> : <span>{Array.from(profile.name.trim())[0] || "你"}</span>}
        </div>
        <div className="tweet-identity">
          <div className="tweet-name-line">
            <strong>{profile.name.trim() || "敏敏"}</strong>
            {platform === "x" && <SealCheck className="verified-icon" weight="fill" aria-label="认证标记" />}
            {platform === "weibo" && <span className="weibo-verified" aria-label="模板认证标记">V</span>}
            {platform === "x" && handle && <span>@{handle}</span>}
            {platform === "x" && profile.date && <><span>·</span><span>{displayDate(profile.date)}</span></>}
          </div>
          {platform === "weibo" && profile.date && <div className="weibo-date">{displayDate(profile.date)}</div>}
        </div>
        {platform !== "moments" && <div className="tweet-actions-top" aria-hidden="true"><DotsThree size={25} /></div>}
      </header>
      <div className="tweet-body">
        {text.trim() || <span className="card-placeholder">你的文字会显示在这里</span>}
      </div>
      {platform === "x" && <footer className="tweet-metrics" aria-label="模拟互动数据">
        <span aria-label={`评论 ${formatMetric(metrics.comments)}`}><ChatCircle /><em>{formatMetric(metrics.comments)}</em></span>
        <span aria-label={`转发 ${formatMetric(metrics.reposts)}`}><Repeat /><em>{formatMetric(metrics.reposts)}</em></span>
        <span className="liked" aria-label={`点赞 ${formatMetric(metrics.likes)}`}><Heart weight="fill" /><em>{formatMetric(metrics.likes)}</em></span>
        <span aria-label={`浏览 ${formatMetric(metrics.views)}`}><ChartBar /><em>{formatMetric(metrics.views)}</em></span>
        <span aria-label={`收藏 ${formatMetric(metrics.bookmarks)}`}><BookmarkSimple /><em>{formatMetric(metrics.bookmarks)}</em></span>
      </footer>}
      {platform === "weibo" && <footer className="weibo-metrics" aria-label="模拟互动数据">
        <span aria-label={`转发 ${formatMetric(metrics.reposts)}`}><Repeat /><em>{formatMetric(metrics.reposts)}</em></span>
        <span aria-label={`评论 ${formatMetric(metrics.comments)}`}><ChatCircle /><em>{formatMetric(metrics.comments)}</em></span>
        <span className="liked" aria-label={`点赞 ${formatMetric(metrics.likes)}`}><ThumbsUp /><em>{formatMetric(metrics.likes)}</em></span>
      </footer>}
      {platform === "moments" && <footer className="moments-footer">
        <div className="moments-meta"><span>{displayDate(profile.date)}</span><span className="moments-menu" aria-hidden="true"><DotsThree weight="bold" size={22} /></span></div>
      </footer>}
      {resizeControl}
    </article>
  );
});
