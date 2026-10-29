// ============================================================
// 🗺️ TimeFlow v3.5.1 — 先修課程地圖 (prereq-map.js)
// ------------------------------------------------------------
// 以本系（本所）開授課程的先修條件畫出依賴圖：
// - 由左到右分層：最左邊不需先修，越往右需要越長的先修鏈
// - 依使用者的修課紀錄標示：已修、已規劃、可以修、待先修、順序有誤
// - 點選課程可標出整條先修鏈，並跳到找課；已排學期的課連按兩下可跳到該學期課表
// 大學部與研究所共用。
// ============================================================

const PREREQ_MAP_LAYOUT = { colWidth: 200, nodeWidth: 168, nodeHeight: 50, rowGap: 14, padding: 16, maxRows: 12 };
let prereqMapState = { graph: null, selected: null };

const PREREQ_STATUS = {
    done: { text: '已修', cls: 'done' },
    planned: { text: '已規劃', cls: 'planned' },
    blocked: { text: '順序有誤', cls: 'blocked' },
    available: { text: '可以修', cls: 'available' },
    locked: { text: '待先修', cls: 'locked' }
};

function prereqKey(name) {
    return PrerequisiteEngine.normalizeName(name);
}

/**
 * 由先修規則建立本系課程的依賴圖（節點以標準化課名合併同名課程的不同班別）
 */
function buildPrereqGraph() {
    const rules = (window.PREREQUISITE_RULES || []).filter(r => PrerequisiteEngine.isOwnDepartmentRule(r));
    const nodes = new Map();
    const edges = new Map();   // `${from}→${to}` → { from, to, minScore }

    const ensureNode = (name, isOwn) => {
        const key = prereqKey(name);
        if (!nodes.has(key)) nodes.set(key, { key, name, isOwn: false, preds: new Set(), succs: new Set() });
        if (isOwn) nodes.get(key).isOwn = true;
        return nodes.get(key);
    };

    rules.forEach(rule => {
        const target = ensureNode(rule.targetName, true);
        (rule.required || []).forEach(req => {
            const source = ensureNode(req.name, false);
            if (source.key === target.key) return;
            source.succs.add(target.key);
            target.preds.add(source.key);
            const edgeKey = `${source.key}→${target.key}`;
            const minScore = req.requirement === 'passed' ? req.minScore : null;
            const existing = edges.get(edgeKey);
            // 同一條先修在不同班別門檻不同時，取較高者提醒
            if (!existing || (minScore || 0) > (existing.minScore || 0)) edges.set(edgeKey, { from: source.key, to: target.key, minScore });
        });
    });

    // 先修課本身沒有先修條件時不會出現在規則裡：另以本系（本所）實際開授的課名判斷是否為本系課程
    const ownNames = new Set([...(window.COURSE_CATALOG || []), ...(window.COURSE_HISTORY || [])]
        .filter(c => PrerequisiteEngine.isOwnDepartmentRule({ catalogIds: [c.id] }))
        .map(c => prereqKey(c.name)));
    nodes.forEach(node => { if (ownNames.has(node.key)) node.isOwn = true; });

    // 分層：最長先修鏈的長度（防止資料中有循環）
    const depthMemo = new Map();
    const depthOf = (key, visiting = new Set()) => {
        if (depthMemo.has(key)) return depthMemo.get(key);
        if (visiting.has(key)) return 0;
        visiting.add(key);
        const preds = [...nodes.get(key).preds];
        const depth = preds.length ? 1 + Math.max(...preds.map(p => depthOf(p, visiting))) : 0;
        visiting.delete(key);
        depthMemo.set(key, depth);
        return depth;
    };
    nodes.forEach(node => { node.depth = depthOf(node.key); });

    return { nodes, edges: [...edges.values()] };
}

/**
 * 依使用者的修課紀錄標示每門課的狀態
 */
function applyPrereqStatuses(graph) {
    const order = appData.semesterOrder || Object.keys(appData.semesters || {});
    const findTaken = name => {
        let found = null;
        order.forEach(sem => (appData.semesters[sem] || []).forEach(course => {
            if (!PrerequisiteEngine.isCourseMatch(course, '', name)) return;
            const done = course.status === '已取得' || course.status === '已抵免';
            if (done && (!found || !found.done)) found = { done: true, semester: sem, course };
            else if (!found && course.status !== '未取得') found = { done: false, semester: sem, course };
        }));
        return found;
    };

    graph.nodes.forEach(node => {
        node.taken = findTaken(node.name);
        if (node.taken && node.taken.done) node.status = 'done';
        else if (node.taken) {
            const check = PrerequisiteEngine.check(node.taken.course, node.taken.semester, appData.semesters, order);
            node.status = check.overallStatus === 'blocked' ? 'blocked' : 'planned';
        }
    });
    // 尚未修也未規劃：先修都已修（或沒有先修）＝可以修
    graph.nodes.forEach(node => {
        if (node.status) return;
        const allDone = [...node.preds].every(p => graph.nodes.get(p).status === 'done');
        node.status = allDone ? 'available' : 'locked';
    });
}

/**
 * 各層內的排序：依前一層先修課的平均位置（重心法）減少連線交錯
 */
function layoutPrereqGraph(graph) {
    const layers = [];
    graph.nodes.forEach(node => {
        (layers[node.depth] = layers[node.depth] || []).push(node);
    });
    layers.forEach((layer, depth) => {
        if (depth === 0) {
            layer.sort((a, b) => b.succs.size - a.succs.size || a.name.localeCompare(b.name, 'zh-Hant'));
        } else {
            const center = node => {
                const ys = [...node.preds].map(p => graph.nodes.get(p).row).filter(y => y !== undefined);
                return ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : 0;
            };
            layer.sort((a, b) => center(a) - center(b));
        }
        layer.forEach((node, row) => { node.row = row; });
    });

    // 同一層課程太多時（例如醫學系）折成多欄，避免單欄拉得很長
    const L = PREREQ_MAP_LAYOUT;
    let column = 0;
    let maxRows = 0;
    layers.forEach(layer => {
        const subColumns = Math.ceil(layer.length / L.maxRows);
        const rows = Math.ceil(layer.length / subColumns);
        layer.forEach((node, i) => {
            node.x = L.padding + (column + Math.floor(i / rows)) * L.colWidth;
            node.y = L.padding + (i % rows) * (L.nodeHeight + L.rowGap);
        });
        column += subColumns;
        maxRows = Math.max(maxRows, rows);
    });
    graph.width = L.padding * 2 + (column - 1) * L.colWidth + L.nodeWidth;
    graph.height = L.padding * 2 + maxRows * (L.nodeHeight + L.rowGap) - L.rowGap;
    graph.dense = graph.edges.length > 80;
    graph.layers = layers;
}

/**
 * 最長的先修鏈（例如 微積分(一) → 工程數學(一) → 電子學(一) → 電子學(二)）
 */
function findLongestPrereqChain(graph) {
    let tail = null;
    graph.nodes.forEach(node => { if (!tail || node.depth > tail.depth) tail = node; });
    if (!tail || tail.depth === 0) return [];
    const chain = [tail];
    let current = tail;
    while (current.preds.size) {
        current = [...current.preds].map(p => graph.nodes.get(p)).sort((a, b) => b.depth - a.depth)[0];
        chain.unshift(current);
    }
    return chain;
}

/**
 * 某門課的整條先修鏈（往前）與可解鎖的課（往後）
 */
function collectPrereqChain(graph, key) {
    const related = new Set([key]);
    const walk = (k, dir) => graph.nodes.get(k)[dir].forEach(n => {
        if (related.has(n)) return;
        related.add(n);
        walk(n, dir);
    });
    walk(key, 'preds');
    walk(key, 'succs');
    return related;
}

function renderPrereqMapSvg(graph) {
    const L = PREREQ_MAP_LAYOUT;
    const related = prereqMapState.selected ? collectPrereqChain(graph, prereqMapState.selected) : null;

    const paths = graph.edges.map(edge => {
        const from = graph.nodes.get(edge.from);
        const to = graph.nodes.get(edge.to);
        const x1 = from.x + L.nodeWidth, y1 = from.y + L.nodeHeight / 2;
        const x2 = to.x, y2 = to.y + L.nodeHeight / 2;
        const mid = (x1 + x2) / 2;
        const active = related && related.has(edge.from) && related.has(edge.to);
        const cls = related ? (active ? 'active' : 'faded') : '';
        return `<path class="prereq-edge ${cls}" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2 - 4},${y2}" marker-end="url(#prereqArrow)"><title>${escapeHTML(from.name)} → ${escapeHTML(to.name)}${edge.minScore ? `（${edge.minScore} 分以上）` : ''}</title></path>`;
    }).join('');

    const nodesHtml = [...graph.nodes.values()].map(node => {
        const status = PREREQ_STATUS[node.status] || PREREQ_STATUS.locked;
        const faded = related && !related.has(node.key) ? 'faded' : '';
        const selected = prereqMapState.selected === node.key ? 'selected' : '';
        const sub = node.taken && !node.taken.done ? `${status.text}・${node.taken.semester}` : (node.taken ? `${status.text}・${node.taken.semester}` : status.text);
        return `
            <button type="button" class="prereq-node ${status.cls} ${faded} ${selected} ${node.isOwn ? '' : 'external'}"
                style="left:${node.x}px; top:${node.y}px; width:${L.nodeWidth}px; height:${L.nodeHeight}px;"
                data-key="${escapeHTML(node.key)}" onclick="selectPrereqNode(this.dataset.key)" title="${escapeHTML(node.name)}${node.taken ? `（連按兩下跳到 ${escapeHTML(node.taken.semester)} 課表）` : ''}">
                <span class="prereq-node-name">${escapeHTML(node.name)}</span>
                <span class="prereq-node-status">${escapeHTML(sub)}${node.isOwn ? '' : '・外系'}</span>
            </button>`;
    }).join('');

    return `
        <div class="prereq-canvas ${graph.dense ? 'dense' : ''}" style="width:${graph.width}px; height:${graph.height}px;">
            <svg class="prereq-svg" width="${graph.width}" height="${graph.height}" aria-hidden="true">
                <defs><marker id="prereqArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="prereq-arrow"></path></marker></defs>
                ${paths}
            </svg>
            ${nodesHtml}
        </div>`;
}

function renderPrereqDetail(graph) {
    const key = prereqMapState.selected;
    if (!key || !graph.nodes.has(key)) {
        return '<div class="master-muted">點選任一門課，會標出它的整條先修鏈，並列出修完後可以解鎖的課；已排進課表的課連按兩下可跳到該學期。</div>';
    }
    const node = graph.nodes.get(key);
    const preds = [...node.preds].map(p => {
        const edge = graph.edges.find(e => e.from === p && e.to === key);
        const pred = graph.nodes.get(p);
        return `${pred.name}${edge && edge.minScore ? `（${edge.minScore} 分以上）` : ''}`;
    });
    const succs = [...node.succs].map(s => graph.nodes.get(s).name);
    const status = PREREQ_STATUS[node.status] || PREREQ_STATUS.locked;
    return `
        <div class="prereq-detail">
            <div class="prereq-detail-head">
                <b>${escapeHTML(node.name)}</b>
                <span class="prereq-chip ${status.cls}">${escapeHTML(status.text)}${node.taken ? `・${escapeHTML(node.taken.semester)}` : ''}</span>
                ${typeof findCoursesButtonHTML === 'function' ? findCoursesButtonHTML({ keyword: node.name }, '找這門課') : ''}
            </div>
            <div class="master-muted">需要先修：${preds.length ? escapeHTML(preds.join('、')) : '無'}</div>
            <div class="master-muted">修完可解鎖：${succs.length ? escapeHTML(succs.join('、')) : '無'}</div>
            ${node.status === 'blocked' ? '<div class="master-callout warning">這門課排定的學期早於（或同於）它的先修課，請調整排課順序。</div>' : ''}
        </div>`;
}

function renderPrereqMap() {
    const body = document.getElementById('prereqMapBody');
    if (!body) return;
    const graph = prereqMapState.graph;

    if (!graph || !graph.nodes.size) {
        body.innerHTML = `<div class="master-muted">${escapeHTML(getPrereqMapOwnerName())} 的課程資料沒有列出先修條件，所以沒有可以畫的先修地圖。</div>`;
        return;
    }

    const chain = findLongestPrereqChain(graph);
    const counts = {};
    graph.nodes.forEach(n => { counts[n.status] = (counts[n.status] || 0) + 1; });

    body.innerHTML = `
        <div class="prereq-summary">
            <span>${escapeHTML(getPrereqMapOwnerName())}：${graph.nodes.size} 門課、${graph.edges.length} 條先修關係</span>
            <span class="prereq-legend">
                ${Object.entries(PREREQ_STATUS).map(([k, s]) => `<span class="prereq-chip ${s.cls}">${s.text} ${counts[k] || 0}</span>`).join('')}
            </span>
        </div>
        ${chain.length ? `<div class="master-callout info">最長的先修鏈有 ${chain.length} 層：${chain.map(n => escapeHTML(n.name)).join(' → ')}。鏈上的課越早開始修，越不容易延畢。</div>` : ''}
        <div class="prereq-scroll">${renderPrereqMapSvg(graph)}</div>
        ${renderPrereqDetail(graph)}
        <div class="master-muted">先修關係整理自課程查詢頁面的「需先修以下科目」；虛線外框為他系開授的先修課。各班別條件可能不同，實際以當學期公告為準。</div>`;
}

function getPrereqMapOwnerName() {
    if (typeof isMasterMode === 'function' && isMasterMode(appData) && typeof getMasterProgram === 'function') {
        return getMasterProgram(appData.masterProgram, appData.masterCustom).fullName;
    }
    return appData.deptName || '本系';
}

let lastPrereqClick = { key: null, time: 0 };

function selectPrereqNode(key) {
    // 點一下會重繪節點，原生 dblclick 不一定觸發，改由連續兩次點擊判斷
    const now = Date.now();
    const isDouble = lastPrereqClick.key === key && now - lastPrereqClick.time < 400;
    lastPrereqClick = { key, time: isDouble ? 0 : now };
    const node = prereqMapState.graph && prereqMapState.graph.nodes.get(key);
    if (isDouble && node && node.taken) {
        jumpToSemester(node.taken.semester);
        return;
    }
    prereqMapState.selected = prereqMapState.selected === key ? null : key;
    renderPrereqMap();
}

/**
 * 關閉地圖彈窗並切到課表的指定學期
 */
function jumpToSemester(semester) {
    const select = document.getElementById('semSelect');
    if (!select || ![...select.options].some(o => o.value === semester)) return;
    ModalManager.closeAll();
    if (typeof switchView === 'function') switchView('plan');
    select.value = semester;
    switchSemester();
}

function openPrereqMap() {
    const body = document.getElementById('prereqMapBody');
    ModalManager.open('prereqMapModal');
    if (body) body.innerHTML = '<div class="master-muted">正在載入課程資料…</div>';

    loadCourseCatalog().then(() => {
        const graph = buildPrereqGraph();
        if (graph.nodes.size) {
            applyPrereqStatuses(graph);
            layoutPrereqGraph(graph);
        }
        prereqMapState = { graph, selected: null };
        renderPrereqMap();
    }).catch(() => {
        if (body) body.innerHTML = '<div class="master-muted">課程資料載入失敗，請確認網路連線後再試一次。</div>';
    });
}

function closePrereqMap(e) {
    if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) return;
    ModalManager.close('prereqMapModal');
}

if (typeof window !== 'undefined') {
    window.openPrereqMap = openPrereqMap;
    window.closePrereqMap = closePrereqMap;
    window.selectPrereqNode = selectPrereqNode;
    window.jumpToSemester = jumpToSemester;
    window.buildPrereqGraph = buildPrereqGraph;
}
