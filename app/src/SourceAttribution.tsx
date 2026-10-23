// Copyright © 2026 敏敏. This new component is licensed under BRAND-LICENSE.md; see COPYRIGHT.md.
export function SourceAttribution() {
  return <footer data-source-attribution="minmin" style={{padding:"16px 24px",textAlign:"center",fontSize:12,lineHeight:1.8,color:"#64748b"}}>
    敏敏制作 · <a href="https://tools.minmin11538.cn/matrix/" target="_blank" rel="noopener noreferrer">敏敏矩阵工作台 · 项目介绍</a>
    {" · "}<a href={`${import.meta.env.BASE_URL}BRAND-LICENSE.md`}>来源署名许可</a>
    {" · "}<a href={`${import.meta.env.BASE_URL}UPSTREAM-MIT-LICENSE.txt`}>上游 MIT</a>
  </footer>;
}
