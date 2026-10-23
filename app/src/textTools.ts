export function cleanCardText(text: string) {
  return text.replace(/\r\n?/g, "\n")
    .replace(/!\[[^\]]*\]\((?:https?:\/\/|www\.)[^)]*\)/gi, "")
    .replace(/\[([^\]]*)\]\((?:https?:\/\/|www\.)[^)]*\)/gi, "$1")
    .replace(/(?<![\w@])(?:https?:\/\/|www\.|(?:x\.com|twitter\.com|t\.co|weibo\.com)\/)[^\s<>"，。！？；、：）】》)\]}]+/gi, url => url.match(/[.,!?;]+$/)?.[0] || "")
    .replace(/(^|\n)\s*(?:RT|转发|转推)\s+[@＠][A-Za-z0-9_]+[:：]\s*/g, "$1")
    .replace(/(?<![A-Za-z0-9_.%+@-])[@＠](?:[A-Za-z0-9_]+|[\p{Script=Han}][\p{L}\p{N}_-]*)/gu, "")
    .replace(/\(\s*\)|（\s*）|\[\s*\]|【\s*】/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+([，。！？；：、])/g, "$1")
    .split("\n").map(line => line.trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n").trim();
}
