'use strict';
// 資料與設定的一致性檢查：規則表、必修表、課程資料、Service Worker 快取清單、版本號。
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, listScripts, ROOT, BROWSER_ONLY } = require('./helpers/load');

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const app = loadApp({
    scripts: [...listScripts({ skip: BROWSER_ONLY }), 'js/discover/catalog-data.js', 'js/discover/history-data.js']
});
const RULES = app.ctx.DEPARTMENT_GRADUATION_RULES;
const REQUIRED = app.ctx.DEPARTMENT_REQUIRED_COURSES;
const ruleFor = (dept, year) => { app.ctx.__a = dept; app.ctx.__y = year; return app.run('getDepartmentGraduationRule(__a, __y)'); };

describe('大學部畢業規則表', () => {
    test('年度鍵為三位數字，且必要欄位都是數字', () => {
        const bad = [];
        for (const [dept, years] of Object.entries(RULES)) {
            for (const [y, r] of Object.entries(years)) {
                if (!/^\d{3}$/.test(y)) bad.push(`${dept}: 年度鍵「${y}」格式錯誤`);
                for (const k of ['targetCredits', 'requiredCredits', 'electiveCredits']) {
                    if (typeof r[k] !== 'number' || !(r[k] >= 0)) bad.push(`${dept}/${y}: ${k}=${r[k]}`);
                }
            }
        }
        assert.deepEqual(bad, []);
    });

    test('必修＋必選＋選修不超過畢業總學分', () => {
        // 歷史系的「必選」是各領域至少修的學分（6／12 × 3 領域），屬於專業選修 73 學分的一部分，
        // 不是另外加算（依系上規定：畢業 128 = 通識 28 + 必修 27 + 專業選修 73，含外系 16）。
        const NESTED_REQ_ELECTIVE = new Set(['歷史學系', '歷史系']);
        const bad = [];
        for (const [dept, years] of Object.entries(RULES)) {
            for (const [y, r] of Object.entries(years)) {
                const nested = NESTED_REQ_ELECTIVE.has(dept);
                const sum = r.requiredCredits + (nested ? 0 : (r.requiredElectiveCredits || 0)) + r.electiveCredits;
                if (sum > r.targetCredits) bad.push(`${dept}/${y}: ${sum} > ${r.targetCredits}`);
                if (nested && r.requiredElectiveCredits > r.electiveCredits) bad.push(`${dept}/${y}: 必選大於專業選修`);
            }
        }
        assert.deepEqual(bad, []);
    });
    test('歷史學系：128 學分 = 必修 27 + 專業選修 73（含外系 16）+ 通識 28', () => {
        for (const y of ['116', '117', '118', '119']) {
            const r = RULES['歷史學系'][y];
            assert.equal(r.targetCredits, 128);
            assert.equal(r.requiredCredits, 27);
            assert.equal(r.electiveCredits, 73);
            assert.equal(r.maxOutsideDeptElective, 16);
            assert.equal(r.targetCredits - r.requiredCredits - r.electiveCredits, 28);
        }
    });

    test('別名與正式名稱指向同一份規則', () => {
        assert.equal(RULES['電機系'], RULES['電機工程學系']);
        assert.equal(RULES['歷史系'], RULES['歷史學系']);
    });
});

describe('必修科目表（課程地圖）與畢業規則一致', () => {
    // 必修表的「系定必修」學分合計，應等於該屆畢業規則的 requiredCredits。
    // 已知例外請附上原因；目前沒有（藥學系已以必修表合計 135 學分為準）。
    const KNOWN_MISMATCH = {};

    test('每個學系每個版本：必修學分合計 = 規則表 requiredCredits', () => {
        const mismatches = [];
        let compared = 0;
        for (const [dept, versions] of Object.entries(REQUIRED)) {
            for (const v of versions) {
                const pickReq = (v.pick || [])
                    .filter(p => p.countsAs === 'required')
                    .reduce((s, p) => s + p.min * p.courses[0][1], 0);
                const sum = v.required.reduce((s, x) => s + x[1], 0) + pickReq;
                const rule = ruleFor(dept, v.fromYear + 4);   // 規則表以「入學學年 + 4」為鍵
                if (rule.isCustom) continue;                   // 該屆沒有規則表（較舊的版本）
                compared++;
                if (rule.requiredCredits !== sum && !KNOWN_MISMATCH[`${dept}@${v.fromYear}`]) {
                    mismatches.push(`${dept} ${v.fromYear} 學年起：必修表 ${sum} ≠ 規則表 ${rule.requiredCredits}`);
                }
            }
        }
        assert.ok(compared > 50, `只比對了 ${compared} 組，疑似資料沒載入`);
        assert.deepEqual(mismatches, []);
    });

    test('必修表結構：課名非空、學分為非負數、版本依 fromYear 由新到舊', () => {
        const bad = [];
        for (const [dept, versions] of Object.entries(REQUIRED)) {
            const years = Array.from(versions, v => v.fromYear);
            if (years.join() !== [...years].sort((a, b) => b - a).join()) bad.push(`${dept}: 版本順序錯誤`);
            for (const v of versions) {
                const all = [...v.required, ...(v.requiredElective || []), ...(v.pick || []).flatMap(p => p.courses)];
                for (const [name, credits] of all) {
                    if (!name || typeof name !== 'string') bad.push(`${dept}/${v.fromYear}: 課名空白`);
                    if (typeof credits !== 'number' || credits < 0) bad.push(`${dept}/${v.fromYear}/${name}: 學分 ${credits}`);
                }
                for (const p of v.pick || []) {
                    if (p.min > p.courses.length) bad.push(`${dept}/${v.fromYear}: 「${p.label}」要求 ${p.min} 門但只列 ${p.courses.length} 門`);
                }
                const names = v.required.map(r => r[0]);
                const dup = names.filter((n, i) => names.indexOf(n) !== i);
                if (dup.length) bad.push(`${dept}/${v.fromYear}: 必修重複 ${dup.join('、')}`);
            }
        }
        assert.deepEqual(bad, []);
    });

    test('收錄至少 40 個學系', () => {
        assert.ok(Object.keys(REQUIRED).length >= 40);
    });
});

describe('課程資料（catalog / history）', () => {
    const catalog = app.ctx.COURSE_CATALOG;
    const history = app.ctx.COURSE_HISTORY;

    test('資料與 meta 筆數一致', () => {
        assert.equal(catalog.length, app.ctx.COURSE_CATALOG_META.count);
        assert.equal(history.length, app.ctx.COURSE_HISTORY_META.codeCount);
    });
    test('本學期課程 id 不重複，且必要欄位存在', () => {
        const seen = new Set();
        const bad = [];
        for (const c of catalog) {
            if (seen.has(c.id)) bad.push(`重複 id ${c.id}`);
            seen.add(c.id);
            if (!c.code || !c.name || !c.dept) bad.push(`${c.id} 缺 code/name/dept`);
            if (typeof c.credits !== 'number' || c.credits < 0 || c.credits > 20) bad.push(`${c.id} 學分 ${c.credits}`);
            if (!c.id.startsWith(app.ctx.COURSE_CATALOG_META.semester)) bad.push(`${c.id} 學期與 meta 不符`);
        }
        assert.deepEqual(bad.slice(0, 20), []);
    });
    test('所有上課時段的星期與節次都合法', () => {
        const VALID = new Set(['1', '2', '3', '4', 'N', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D']);
        const bad = [];
        for (const list of [catalog, history]) {
            for (const c of list) {
                for (const s of c.slots || []) {
                    if (!(s.day >= 1 && s.day <= 7)) bad.push(`${c.code} day=${s.day}`);
                    for (const p of s.periods) if (!VALID.has(String(p))) bad.push(`${c.code} period=${p}`);
                }
            }
        }
        assert.deepEqual(bad.slice(0, 20), []);
    });
    test('歷年資料的開課學期都落在 meta 範圍內', () => {
        const allowed = new Set(app.ctx.COURSE_HISTORY_META.semesters);
        const bad = [];
        for (const c of history) for (const s of c.offered || []) if (!allowed.has(s)) bad.push(`${c.code}: ${s}`);
        assert.deepEqual(bad.slice(0, 20), []);
    });
    test('先修規則可由本學期課程資料建立', () => {
        const rules = app.run('buildPrerequisiteRulesFromCatalog(COURSE_CATALOG)');
        assert.ok(rules.length > 100, `只產生 ${rules.length} 條`);
        for (const r of rules) {
            assert.ok(r.targetCode && r.required.length > 0);
        }
    });
});

describe('PWA 與版本', () => {
    const sw = read('sw.js');
    const html = read('index.html');

    test('index.html 載入的 css / js 都在 sw.js 快取清單內', () => {
        const assets = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].map(m => m[1])
            .filter(a => !a.startsWith('js/libs/'));
        const missing = assets.filter(a => !sw.includes(`./${a}`));
        assert.deepEqual(missing, []);
    });
    test('sw.js 快取清單中的檔案都真的存在', () => {
        const listed = [...sw.matchAll(/'\.\/([^']+\.(?:js|css|html|png|webmanifest))'/g)].map(m => m[1]);
        assert.ok(listed.length > 40);
        const gone = listed.filter(f => !fs.existsSync(path.join(ROOT, f)));
        assert.deepEqual(gone, []);
    });
    test('安裝時預先快取的檔案總量要小（大型課程資料改為第一次使用時才快取）', () => {
        const listed = [...sw.matchAll(/'\.\/([^']+\.(?:js|css|html|png|webmanifest))'/g)].map(m => m[1]);
        assert.ok(!listed.some(f => /catalog-data|history-data/.test(f)), '課程資料不應放進預先快取清單');
        const total = listed.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
        assert.ok(total < 3 * 1024 * 1024, `預先快取共 ${(total / 1048576).toFixed(1)} MB，超過 3 MB`);
        assert.match(sw, /LAZY_DATA_PATHS/, 'sw.js 應有課程資料的延遲快取邏輯');
    });
    test('版本號在 sw.js 與 JS 檔頭註解一致', () => {
        const swVersion = sw.match(/timeflow-cache-v([\d.]+)/)[1];
        const stale = [];
        for (const rel of listScripts()) {
            const head = read(rel).split('\n').slice(0, 8).join('\n');
            const m = head.match(/TimeFlow v([\d.]+)/);
            if (m && m[1] !== swVersion) stale.push(`${rel}: v${m[1]} ≠ v${swVersion}`);
        }
        assert.deepEqual(stale, []);
    });
    test('manifest 圖示檔案存在', () => {
        const manifest = JSON.parse(read('manifest.webmanifest'));
        for (const icon of manifest.icons) {
            assert.ok(fs.existsSync(path.join(ROOT, icon.src)), icon.src);
        }
    });
});
