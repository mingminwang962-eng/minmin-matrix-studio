import assert from "node:assert/strict";
import test from "node:test";
import { cleanCardText } from "../src/textTools.ts";

test("清理提及和网址，同时保留正文、段落与标点", () => {
  assert.equal(cleanCardText("@someone 今天先做一件小事。 https://t.co/example\n\n再检查结果。"), "今天先做一件小事。\n\n再检查结果。");
  assert.equal(cleanCardText("先看https://example.com/资料，再动手。"), "先看，再动手。");
  assert.equal(cleanCardText("谢谢@writer分享。联系 hello@example.com。"), "谢谢分享。联系 hello@example.com。");
  assert.equal(cleanCardText("＠张三 今天聊一个问题。\nwww.example.com/page\n\n先完成它。"), "今天聊一个问题。\n\n先完成它。");
});

test("链接文字仍可读，不留下 Markdown、空括号或转发前缀", () => {
  assert.equal(cleanCardText("看[这份说明](https://example.com/doc)，然后行动。"), "看这份说明，然后行动。");
  assert.equal(cleanCardText("步骤（https://example.com/a）在这里。\n![图片](https://example.com/a.png)"), "步骤在这里。");
  assert.equal(cleanCardText("RT @someone: 先完成一个任务。\nx.com/someone/status/123"), "先完成一个任务。");
});

test("空内容保持为空，只有提及和链接时不生成虚构文案", () => {
  assert.equal(cleanCardText("@someone https://t.co/example"), "");
});
