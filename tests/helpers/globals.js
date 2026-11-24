// 靜態分析：找出每支腳本宣告的頂層全域名稱，以及它引用了哪些其他腳本的全域。
// 不依賴任何 npm 套件；用一個夠用的簡易詞法分析器去掉註解、字串與正規表示式。
'use strict';
const fs = require('fs');
const path = require('path');

/**
 * 把原始碼切成 token。字串、註解、正規表示式不會產生識別字 token；
 * 模板字串 `${...}` 內的運算式照常分析。
 * 每個 token：{ type: 'id' | 'punc', value, depth }，depth 為當下的 { ( [ 巢狀深度。
 */
function tokenize(src) {
    const tokens = [];
    let i = 0;
    let depth = 0;
    const tplStack = []; // 每層模板字串 ${ 開始時的 depth
    let lastSignificant = null; // 用來判斷 / 是除號還是正規表示式

    const regexAllowedAfter = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', '=>']);
    const regexKeywords = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

    function readTemplate() {
        // i 指在 ` 之後或 } 之後（模板的延續）
        while (i < src.length) {
            const ch = src[i];
            if (ch === '\\') { i += 2; continue; }
            if (ch === '`') { i++; return 'end'; }
            if (ch === '$' && src[i + 1] === '{') {
                i += 2;
                tplStack.push(depth);
                depth++;
                return 'expr';
            }
            i++;
        }
        return 'end';
    }

    while (i < src.length) {
        const ch = src[i];
        if (/\s/.test(ch)) { i++; continue; }
        if (ch === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        }
        if (ch === '/' && src[i + 1] === '*') {
            const end = src.indexOf('*/', i + 2);
            i = end < 0 ? src.length : end + 2;
            continue;
        }
        if (ch === '"' || ch === "'") {
            i++;
            while (i < src.length && src[i] !== ch) {
                if (src[i] === '\\') i++;
                i++;
            }
            i++;
            lastSignificant = { type: 'str' };
            continue;
        }
        if (ch === '`') {
            i++;
            readTemplate();
            lastSignificant = { type: 'str' };
            continue;
        }
        if (ch === '/') {
            const prev = lastSignificant;
            const isRegex = !prev
                || (prev.type === 'punc' && regexAllowedAfter.has(prev.value))
                || (prev.type === 'id' && regexKeywords.has(prev.value));
            if (isRegex) {
                i++;
                let inClass = false;
                while (i < src.length) {
                    const c = src[i];
                    if (c === '\\') { i += 2; continue; }
                    if (c === '[') inClass = true;
                    else if (c === ']') inClass = false;
                    else if (c === '/' && !inClass) break;
                    else if (c === '\n') break;
                    i++;
                }
                i++;
                while (i < src.length && /[a-z]/i.test(src[i])) i++;
                lastSignificant = { type: 'str' };
                continue;
            }
        }
        if (/[A-Za-z_$]/.test(ch)) {
            const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i, i + 200));
            const tok = { type: 'id', value: m[0], depth, pos: i };
            tokens.push(tok);
            lastSignificant = tok;
            i += m[0].length;
            continue;
        }
        if (/[0-9]/.test(ch)) {
            const m = /^[0-9][\w.]*/.exec(src.slice(i, i + 100));
            i += m[0].length;
            lastSignificant = { type: 'num' };
            continue;
        }
        if (ch === '}' && tplStack.length && tplStack[tplStack.length - 1] === depth - 1) {
            tplStack.pop();
            depth--;
            i++;
            readTemplate();
            lastSignificant = { type: 'str' };
            continue;
        }
        let value = ch;
        if (src.startsWith('=>', i)) value = '=>';
        else if (src.startsWith('?.', i) && !/[0-9]/.test(src[i + 2] || '')) value = '?.';
        else if (src.startsWith('...', i)) value = '...';
        if ('{(['.includes(ch)) {
            tokens.push({ type: 'punc', value, depth, pos: i });
            depth++;
        } else if ('})]'.includes(ch)) {
            depth = Math.max(0, depth - 1);
            tokens.push({ type: 'punc', value, depth, pos: i });
        } else {
            tokens.push({ type: 'punc', value, depth, pos: i });
        }
        lastSignificant = tokens[tokens.length - 1];
        i += value.length;
    }
    return tokens;
}

/** 頂層（depth 0）宣告：function / class / const / let / var，以及任何深度的 window.X = */
function topLevelDeclarations(tokens) {
    const names = new Set();
    for (let k = 0; k < tokens.length; k++) {
        const t = tokens[k];
        if (t.type !== 'id') continue;
        const next = tokens[k + 1];
        if (t.depth === 0 && ['function', 'class'].includes(t.value) && next && next.type === 'id') {
            names.add(next.value);
        }
        if (t.depth === 0 && ['const', 'let', 'var'].includes(t.value)) {
            // 只處理單純的 const a = ..., b = ...（不處理解構）
            let j = k + 1;
            while (tokens[j] && tokens[j].type === 'id') {
                names.add(tokens[j].value);
                // 跳到同深度的下一個逗號或結束
                const d = tokens[j].depth;
                j++;
                while (tokens[j] && !(tokens[j].depth === d && tokens[j].type === 'punc' && [',', ';'].includes(tokens[j].value))) {
                    if (tokens[j].depth === d && tokens[j].type === 'id' && ['const', 'let', 'var', 'function', 'class'].includes(tokens[j].value)) break;
                    j++;
                }
                if (!tokens[j] || tokens[j].value !== ',') break;
                j++;
            }
        }
        if (t.value === 'window' && next && next.value === '.' && tokens[k + 2] && tokens[k + 2].type === 'id'
            && tokens[k + 3] && tokens[k + 3].value === '=' && !(tokens[k + 4] && tokens[k + 4].value === '=')) {
            names.add(tokens[k + 2].value);
        }
        // TimeFlow.expose('模組', { a, b }) 與 TimeFlow.exposeState('模組', { a: {...} })
        if (t.value === 'TimeFlow' && next && next.value === '.' && tokens[k + 2]
            && ['expose', 'exposeState'].includes(tokens[k + 2].value)) {
            for (const n of exposedNames(tokens, k + 3)) names.add(n);
        }
    }
    return names;
}

/** 從 expose( 的 ( 開始，讀出物件字面值第一層的鍵 */
function exposedNames(tokens, openParenIdx) {
    const names = [];
    let j = openParenIdx;
    while (tokens[j] && !(tokens[j].type === 'punc' && tokens[j].value === '{')) j++;
    if (!tokens[j]) return names;
    const d = tokens[j].depth + 1;
    for (j++; tokens[j] && tokens[j].depth >= d; j++) {
        const tk = tokens[j];
        if (tk.depth !== d || tk.type !== 'id') continue;
        const before = tokens[j - 1];
        if (before && before.type === 'punc' && ['{', ','].includes(before.value)) names.push(tk.value);
    }
    return names;
}

/**
 * 回傳 tokens 中所有「裸」識別字的使用（前面不是 . 也不是物件鍵），
 * 並標註是否只出現在 typeof 檢查中、是否位於頂層（載入時就會執行）。
 */
function identifierUses(tokens) {
    const uses = [];
    // 以「目前所在的 function 深度」判斷是否在函式內：
    // 遇到 function 關鍵字或 => 之後的 { ... } 視為函式本體
    const fnBodyDepths = [];
    const CONTROL = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);
    const parenOpeners = []; // 每個 ( 前一個 token
    let lastClosedOpener = null;
    for (let k = 0; k < tokens.length; k++) {
        const t = tokens[k];
        // 函式本體的 { 位於深度 d，本體內容深度 > d；回到深度 <= d 即離開
        while (fnBodyDepths.length && t.depth <= fnBodyDepths[fnBodyDepths.length - 1]) fnBodyDepths.pop();
        if (t.type === 'punc' && t.value === '(') parenOpeners.push(tokens[k - 1] || null);
        if (t.type === 'punc' && t.value === ')') lastClosedOpener = parenOpeners.pop() || null;
        if (t.type === 'punc' && t.value === '=>') {
            const next = tokens[k + 1];
            if (next && next.type === 'punc' && next.value === '{') {
                fnBodyDepths.push(next.depth);
                k++;
                continue;
            }
            // 運算式本體的箭頭函式：直到同深度的 , ) ; } 為止都算函式內
            const d = t.depth;
            let j = k + 1;
            while (tokens[j] && !(tokens[j].depth <= d && tokens[j].type === 'punc' && [',', ')', ';', '}', ']'].includes(tokens[j].value) && tokens[j].depth <= d)) {
                if (tokens[j].depth < d) break;
                markUse(j, true);
                j++;
            }
            k = j - 1;
            continue;
        }
        // function f(...) { / function (...) { / 物件方法 name(...) { → 函式本體；if (...) { 等控制區塊不算
        const prevTok = tokens[k - 1];
        if (t.type === 'punc' && t.value === '{' && prevTok && prevTok.type === 'punc' && prevTok.value === ')'
            && lastClosedOpener && lastClosedOpener.type === 'id' && !CONTROL.has(lastClosedOpener.value)) {
            fnBodyDepths.push(t.depth);
            continue;
        }
        if (t.type === 'id') markUse(k, fnBodyDepths.length > 0);
    }

    function markUse(k, inFunction) {
        const t = tokens[k];
        if (t.type !== 'id') return;
        const prev = tokens[k - 1];
        const next = tokens[k + 1];
        if (prev && prev.type === 'punc' && (prev.value === '.' || prev.value === '?.')) {
            // window.X（不是 window.X = 指派）也算是使用全域 X
            const owner = tokens[k - 2];
            const assign = next && next.type === 'punc' && next.value === '=' && !(tokens[k + 2] && tokens[k + 2].value === '=');
            if (!(owner && owner.type === 'id' && owner.value === 'window' && !assign)) return;
            uses.push({ name: t.value, pos: t.pos, inFunction, typeofGuard: !!(tokens[k - 3] && tokens[k - 3].value === 'typeof'), viaWindow: true });
            return;
        }
        // 物件字面值的鍵：{ name: ... } 或 , name: ...（但三元運算子的 a ? b : c 例外難以分辨，接受誤判）
        if (next && next.type === 'punc' && next.value === ':' && prev && prev.type === 'punc' && ['{', ','].includes(prev.value)) return;
        const typeofGuard = prev && prev.type === 'id' && prev.value === 'typeof';
        uses.push({ name: t.value, pos: t.pos, inFunction, typeofGuard });
    }
    return uses;
}

/** 分析 index.html 列出的所有腳本 */
function analyze(root, scripts) {
    const files = scripts.map((rel, index) => {
        const src = fs.readFileSync(path.join(root, rel), 'utf8');
        const tokens = tokenize(src);
        return { rel, index, src, tokens, declared: topLevelDeclarations(tokens), uses: identifierUses(tokens) };
    });
    const owner = new Map(); // 名稱 → 第一個宣告它的腳本
    for (const f of files) {
        for (const n of f.declared) if (!owner.has(n)) owner.set(n, f);
    }
    return { files, owner };
}

function lineOf(src, pos) {
    let line = 1;
    for (let i = 0; i < pos && i < src.length; i++) if (src.charCodeAt(i) === 10) line++;
    return line;
}

module.exports = { tokenize, topLevelDeclarations, identifierUses, analyze, lineOf };
