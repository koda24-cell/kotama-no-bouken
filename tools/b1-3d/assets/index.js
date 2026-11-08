// 全素材の一覧（ファイルごとに分類）
// nature/ruins/props：GPT 試作40点（名称・用途）の作り直し、modules：Claude 新規（＋一部 props の新規）
import nature from './nature.js';
import ruins from './ruins.js';
import props from './props.js';
import modules from './modules.js';
export const ASSETS = { ...nature, ...ruins, ...props, ...modules };
