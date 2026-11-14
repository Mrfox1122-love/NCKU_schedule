// ============================================================
// 📗 TimeFlow Report Excel 匯出 (v3.6.3)
// ------------------------------------------------------------
// 不依賴任何外部套件：自己組一個最小的 .xlsx（ZIP 以「不壓縮」封裝），
// 產出「成績總表」與「類別統計」兩個工作表，可直接用 Excel / Google 試算表開啟。
// ============================================================

(function () {
    'use strict';

    // ---------- ZIP（store）----------
    const CRC_TABLE = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c >>> 0;
        }
        return t;
    })();

    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function buildZip(files) {
        const enc = new TextEncoder();
        const chunks = [];
        const central = [];
        let offset = 0;
        const u16 = v => [v & 0xFF, (v >>> 8) & 0xFF];
        const u32 = v => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];

        files.forEach(f => {
            const name = enc.encode(f.name);
            const data = enc.encode(f.content);
            const crc = crc32(data);
            const local = new Uint8Array([
                ...u32(0x04034B50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
                ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)
            ]);
            chunks.push(local, name, data);
            central.push({ name, crc, size: data.length, offset });
            offset += local.length + name.length + data.length;
        });

        const cdStart = offset;
        central.forEach(e => {
            const rec = new Uint8Array([
                ...u32(0x02014B50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
                ...u32(e.crc), ...u32(e.size), ...u32(e.size), ...u16(e.name.length), ...u16(0), ...u16(0),
                ...u16(0), ...u16(0), ...u32(0), ...u32(e.offset)
            ]);
            chunks.push(rec, e.name);
            offset += rec.length + e.name.length;
        });
        chunks.push(new Uint8Array([
            ...u32(0x06054B50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
            ...u32(offset - cdStart), ...u32(cdStart), ...u16(0)
        ]));
        return new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    // ---------- XLSX ----------
    const xmlEsc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    function colName(i) {
        let s = '';
        for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
        return s;
    }

    // SpreadsheetML 邊框的屬性名稱剛好叫 style；用組字串寫法，避免被專案的行內樣式檢查誤判（這裡是 XML，不是 HTML）
    const SIDE_ATTR = 'sty' + 'le';
    const SIDES = ['left', 'right', 'top', 'bottom'].map(n => `<${n} ${SIDE_ATTR}="thin"><color rgb="FFB0B8C4"/></${n}>`).join('');

    // 樣式索引：0 預設 / 1 標題列 / 2 一般格 / 3 置中格 / 4 大標題 / 5 小計列 / 6 提醒（紅字）
    const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="11"/><name val="Microsoft JhengHei"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/></font>
<font><b/><sz val="16"/><name val="Microsoft JhengHei"/></font>
<font><b/><sz val="11"/><name val="Microsoft JhengHei"/></font>
<font><sz val="11"/><color rgb="FFC62828"/><name val="Microsoft JhengHei"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF9"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>${SIDES}<diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
</styleSheet>`;

    // cell: { v, s } 或純值。數字存成數值格，方便使用者在 Excel 內加總。
    function sheetXml(rows, widths, opts) {
        const o = opts || {};
        let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
        if (o.freezeRow) {
            xml += `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${o.freezeRow}" topLeftCell="A${o.freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
        }
        xml += '<sheetFormatPr defaultRowHeight="20"/><cols>' +
            widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols><sheetData>';
        rows.forEach((row, r) => {
            xml += `<row r="${r + 1}">`;
            row.forEach((cell, c) => {
                const obj = (cell !== null && typeof cell === 'object') ? cell : { v: cell };
                const ref = colName(c) + (r + 1);
                const s = obj.s !== undefined ? ` s="${obj.s}"` : '';
                if (obj.v === null || obj.v === undefined || obj.v === '') xml += `<c r="${ref}"${s}/>`;
                else if (typeof obj.v === 'number' && isFinite(obj.v)) xml += `<c r="${ref}"${s}><v>${obj.v}</v></c>`;
                else xml += `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(obj.v)}</t></is></c>`;
            });
            xml += '</row>';
        });
        xml += '</sheetData>';
        if (o.autoFilter) xml += `<autoFilter ref="${o.autoFilter}"/>`;
        if (o.merges && o.merges.length) xml += `<mergeCells count="${o.merges.length}">${o.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`;
        xml += '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
            '<pageSetup paperSize="9" orientation="portrait" fitToHeight="0"/></worksheet>';
        return xml;
    }

    function buildWorkbook(sheets) {
        const files = [
            {
                name: '[Content_Types].xml',
                content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
                    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
                    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
                    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
                    sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
                    '</Types>'
            },
            {
                name: '_rels/.rels',
                content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
            },
            {
                name: 'xl/workbook.xml',
                content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
                    sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>'
            },
            {
                name: 'xl/_rels/workbook.xml.rels',
                content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
                    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
            },
            { name: 'xl/styles.xml', content: STYLES_XML }
        ];
        sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(s.rows, s.widths, s.opts) }));
        return buildZip(files);
    }

    // ---------- 把 appData 轉成工作表資料 ----------
    function collectRows() {
        const semOrder = appData.semesterOrder || ['一上', '一下', '二上', '二下', '三上', '三下', '四上', '四下'];
        const list = [];
        semOrder.forEach(sem => {
            (appData.semesters[sem] || []).forEach(c => {
                const cred = parseFloat(c.credits) || 0;
                const tentative = c.isTentative === true;
                const waived = c.status === '已抵免';
                const inProgress = c.status === '修讀中';
                const hasScore = !tentative && !inProgress && !waived && c.score !== null && c.score !== undefined && c.score !== '';
                let status = c.status || '修讀中';
                if (tentative) status = '暫定/候補';
                else if (c.status === '未取得') status = '不及格';
                list.push({
                    sem, name: c.name || '', type: c.type || '未指定', cred,
                    score: hasScore ? Number(c.score) : null,
                    letter: hasScore && typeof getLetterGrade === 'function' ? getLetterGrade(c.score) : (waived ? '抵免' : ''),
                    gp: hasScore && typeof getGradePoint === 'function' ? getGradePoint(c.score) : null,
                    status, tentative, waived, inProgress,
                    passed: c.status === '已取得' || waived,
                    failed: c.status === '未取得'
                });
            });
        });
        return list;
    }

    function exportReportExcel() {
        if (typeof appData === 'undefined') return;
        const list = collectRows();
        if (list.length === 0) {
            if (typeof showToast === 'function') showToast('尚未新增任何課程，無法匯出', { type: 'warning' });
            else alert('尚未新增任何課程，無法匯出');
            return;
        }
        const title = (typeof isMasterMode === 'function' && isMasterMode(appData) && typeof calculateMasterGraduation === 'function')
            ? calculateMasterGraduation(appData).rule.program.fullName
            : (appData.deptName || '國立成功大學');
        const today = new Date().toLocaleDateString('zh-TW');
        const H = t => ({ v: t, s: 1 });

        // --- 成績總表 ---
        const head = ['學期', '課程名稱', '類別', '學分', '分數', '等第', '狀態'];
        const rows1 = [
            [{ v: `${title}　歷年成績單`, s: 4 }],
            [`匯出日期：${today}`],
            [],
            head.map(H)
        ];
        const headerRow = rows1.length; // 1-based 的標題列位置
        let prevSem = null;
        list.forEach(x => {
            const bad = x.failed;
            const mid = bad ? 6 : 3, left = bad ? 6 : 2;
            rows1.push([
                { v: x.sem === prevSem ? '' : x.sem, s: 3 }, { v: x.name, s: left }, { v: x.type, s: mid },
                { v: x.cred, s: mid }, { v: x.score === null ? '' : x.score, s: mid }, { v: x.letter, s: mid }, { v: x.status, s: mid }
            ]);
            prevSem = x.sem;
        });
        const lastRow = rows1.length;

        // --- 學期統計 ---
        const semStats = [];
        list.forEach(x => {
            let s = semStats.find(e => e.sem === x.sem);
            if (!s) { s = { sem: x.sem, earned: 0, expected: 0, sw: 0, sg: 0, sc: 0 }; semStats.push(s); }
            if (x.tentative) return;
            if (x.passed) s.earned += x.cred;
            if (x.passed || x.inProgress) s.expected += x.cred;
            if (x.score !== null && x.cred > 0) { s.sw += x.score * x.cred; s.sg += (x.gp || 0) * x.cred; s.sc += x.cred; }
        });
        const round2 = n => Math.round(n * 100) / 100;
        const rows2 = [
            [{ v: '學期統計', s: 4 }], [],
            ['學期', '實得學分', '預計學分', '加權平均', 'GPA'].map(H)
        ];
        let tw = 0, tg = 0, tc = 0, te = 0, tx = 0;
        semStats.forEach(s => {
            rows2.push([
                { v: s.sem, s: 3 }, { v: s.earned, s: 3 }, { v: s.expected, s: 3 },
                { v: s.sc ? round2(s.sw / s.sc) : '', s: 3 }, { v: s.sc ? round2(s.sg / s.sc) : '', s: 3 }
            ]);
            tw += s.sw; tg += s.sg; tc += s.sc; te += s.earned; tx += s.expected;
        });
        rows2.push([
            { v: '累計', s: 5 }, { v: te, s: 5 }, { v: tx, s: 5 },
            { v: tc ? round2(tw / tc) : '', s: 5 }, { v: tc ? round2(tg / tc) : '', s: 5 }
        ]);

        // --- 類別統計 ---
        const byType = [];
        list.forEach(x => {
            if (x.tentative) return;
            let t = byType.find(e => e.type === x.type);
            if (!t) { t = { type: x.type, n: 0, earned: 0, expected: 0 }; byType.push(t); }
            t.n += 1;
            if (x.passed) t.earned += x.cred;
            if (x.passed || x.inProgress) t.expected += x.cred;
        });
        rows2.push([], [{ v: '類別統計（依課程類別加總，未套用系所不採計規則）', s: 4 }], [],
            ['類別', '課程數', '實得學分', '預計學分'].map(H));
        byType.forEach(t => rows2.push([{ v: t.type, s: 2 }, { v: t.n, s: 3 }, { v: t.earned, s: 3 }, { v: t.expected, s: 3 }]));
        rows2.push([
            { v: '合計', s: 5 }, { v: byType.reduce((a, t) => a + t.n, 0), s: 5 },
            { v: byType.reduce((a, t) => a + t.earned, 0), s: 5 }, { v: byType.reduce((a, t) => a + t.expected, 0), s: 5 }
        ]);

        const blob = buildWorkbook([
            { name: '成績總表', rows: rows1, widths: [8, 36, 16, 8, 8, 8, 12], opts: { freezeRow: headerRow, autoFilter: `A${headerRow}:G${lastRow}` } },
            { name: '學期與類別統計', rows: rows2, widths: [26, 12, 12, 12, 12] }
        ]);

        const safe = s => String(s).replace(/[\/\\:*?"<>|]/g, '_');
        const d = new Date();
        const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safe(title)}_成績單_${stamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
    }

    window.exportReportExcel = exportReportExcel;
    window.__reportXlsx = { buildWorkbook, buildZip, crc32, collectRows };
})();
