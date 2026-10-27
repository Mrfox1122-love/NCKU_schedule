# ============================================================
# 📚 TimeFlow v3.4.3 — 歷年開課摘要建置工具 (tools/build_history.py)
# ------------------------------------------------------------
# 用法：python tools/build_history.py <parse_history.py 輸出的 JSON>
#   例如 python tools/build_history.py "../../課程資訊/old.json"
#   將歷年各學期課程彙整為「每個課號一筆」的開課摘要，
#   產生 js/discover/history-data.js，供「找課」視圖延遲載入。
# ============================================================

import json
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog import convert_prerequisite, resolve_base_type  # noqa: E402

OUTPUT = Path(__file__).resolve().parent.parent / 'js' / 'discover' / 'history-data.js'


def semester_key(sem):
    year, term = sem.split('-')
    return int(year), int(term)


def summarize(code, offerings, class_code='', section_id=''):
    offerings.sort(key=lambda c: (semester_key(c['semester']), c['deptSeq'], c['classCode']))
    sems = sorted({c['semester'] for c in offerings}, key=semester_key)

    # 以該班別最近一次開課作為課名、學分、時段等代表資料
    last_sem = sems[-1]
    latest = next(c for c in offerings if c['semester'] == last_sem)
    latest_with_prereq = next((c for c in reversed(offerings) if c['prerequisites']), None)

    # 教師以最近一次開課為主，再補上該班別歷年常見的教師
    teachers = Counter({t: 1000 for t in latest['teachers']})
    teachers.update(t for c in offerings for t in c['teachers'])
    rooms = []
    for s in latest['slots']:
        if s['room'] and s['room'] not in rooms:
            rooms.append(s['room'])

    # id、最近開課學期、開課年數、上下學期規律、課綱網址等可由 offered 推得的欄位，
    # 由前端載入時補上（discover.js 的 hydrateHistoryRecord），以縮小檔案
    record = {
        'code': code,
        'deptSeq': latest['deptSeq'],
        'dept': latest['deptName'],
        'grade': latest['grade'],
        'name': latest['name'],
        'credits': latest['credits'],
        'courseType': latest['courseType'],
        'baseType': resolve_base_type(latest),
        'teacher': '、'.join(t for t, _ in teachers.most_common(3)),
        'room': '、'.join(rooms),
        'slots': [{'day': s['day'], 'periods': s['periods']} for s in latest['slots']],
        'offered': sems,
        'lastClassCode': latest['classCode'],
    }
    optional = {
        # 同一課號有多個班別時才標示；沿用舊 id（H_課號）的班別沒有 sectionId
        'classCode': class_code,
        'sectionId': section_id,
        'timeHidden': latest['timeHidden'],
        'timeNote': latest['timeNote'],
        'tags': latest['tags'],
        'restrictions': latest['restrictions'],
        # 先修條件取最近一次有列出者（避免最新學期漏填時遺失）
        'prerequisites': [convert_prerequisite(p) for p in latest_with_prereq['prerequisites']] if latest_with_prereq else [],
    }
    record.update({k: v for k, v in optional.items() if v})
    return record


def main():
    if len(sys.argv) != 2:
        print('用法：python tools/build_history.py <歷年課程 JSON 路徑>')
        sys.exit(1)

    source = Path(sys.argv[1])
    courses = json.loads(source.read_text(encoding='utf-8'))

    by_code = defaultdict(list)
    for c in courses:
        if c['code']:
            by_code[c['code']].append(c)
    all_semesters = sorted({c['semester'] for c in courses}, key=semester_key)
    all_years = sorted({s.split('-')[0] for s in all_semesters})

    # 同課號的不同班別（教師、時段不同）各自成為一筆，避免混成同一堂課
    records = []
    for code, offerings in by_code.items():
        by_class = defaultdict(list)
        for c in offerings:
            by_class[c['classCode'] or ''].append(c)
        if len(by_class) == 1:
            records.append(summarize(code, offerings))
            continue
        # 舊版以「最近學期的第一個班別」代表整個課號，該班別保留原 id 以免已存的候選／課表失聯
        last_sem = max((c['semester'] for c in offerings), key=semester_key)
        primary = min(c['classCode'] for c in offerings if c['semester'] == last_sem)
        for class_code, items in sorted(by_class.items()):
            section_id = '' if class_code == primary else (class_code or '0')
            records.append(summarize(code, items, class_code, section_id))
    records.sort(key=lambda r: (r['deptSeq'] or 'ZZ', r['code'], r.get('classCode', '')))

    meta = {
        'from': all_semesters[0],
        'to': all_semesters[-1],
        'semesters': all_semesters,
        'years': all_years,
        'courseCount': len(courses),
        'codeCount': len(records),
        'builtAt': date.today().isoformat(),
    }

    lines = [
        '// ============================================================',
        '// 📚 TimeFlow 歷年開課摘要（由 tools/build_history.py 自動產生，請勿手動編輯）',
        f'// 來源：{source.name}　{meta["from"]}～{meta["to"]}　共 {len(courses)} 筆開課、{len(records)} 筆（課號＋班別）',
        '// ============================================================',
        '',
        f'window.COURSE_HISTORY_META = {json.dumps(meta, ensure_ascii=False)};',
        '',
        'window.COURSE_HISTORY = [',
    ]
    lines += [json.dumps(r, ensure_ascii=False, separators=(',', ':')) + ',' for r in records]
    lines.append('];')
    lines.append('')

    OUTPUT.write_text('\n'.join(lines), encoding='utf-8', newline='\n')
    size_kb = OUTPUT.stat().st_size / 1024
    print(f'{len(courses)} 筆開課 → {len(records)} 筆（課號＋班別） → {OUTPUT}（{size_kb:.0f} KB）')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
