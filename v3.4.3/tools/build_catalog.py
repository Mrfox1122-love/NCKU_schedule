# ============================================================
# 📚 TimeFlow v3.4.3 — 課程資料建置工具 (tools/build_catalog.py)
# ------------------------------------------------------------
# 用法：python tools/build_catalog.py <parse_courses.py 輸出的 JSON>
#   例如 python tools/build_catalog.py "../../課程資訊/115-1.json"
#   產生 js/discover/catalog-data.js，供「找課」視圖延遲載入。
# ============================================================

import json
import sys
from datetime import date
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / 'js' / 'discover' / 'catalog-data.js'

# 學校「類別」欄 → TimeFlow 課程類別（通識領域、國文、英文）
CATEGORY_TYPES = {
    '人文學': '通識-人文',
    '社會科學': '通識-社科',
    '自然與工程科學': '通識-自然',
    '生命科學與健康': '通識-生醫',
    '生命科學': '通識-生醫',
    '科際整合': '通識-科際',
    '融合通識': '融通',
    '大學國文': '國文',
    '外國語言': '英文',
}

# 開課單位 → TimeFlow 課程類別（以系所名稱開頭比對）
DEPT_TYPES = {
    '體育室': '體育',
    '學生安全組': '軍訓',
    '服務學習': '服務學習',
    '踏溯台南': '踏溯台南',
    '外語中心': '第二外語-選修',  # 英文課的類別為「外國語言」，已先由 CATEGORY_TYPES 判定
}


def resolve_base_type(course):
    """可由資料直接判定的類別；系上課程（必修／本系選修／外系選修）回傳空字串，交由前端依使用者系所判定。"""
    if course['category'] in CATEGORY_TYPES:
        return CATEGORY_TYPES[course['category']]
    for prefix, course_type in DEPT_TYPES.items():
        if course['deptName'].startswith(prefix):
            return course_type
    return ''


def convert_prerequisite(p):
    # 「0 分以上」代表修過即可，不需登記成績
    if p['requirement'] == 'passed' and not p['minScore']:
        return {'name': p['name'], 'requirement': 'completed'}
    return {'name': p['name'], 'requirement': p['requirement'], 'minScore': p['minScore']}


def convert(course):
    rooms = []
    for s in course['slots']:
        if s['room'] and s['room'] not in rooms:
            rooms.append(s['room'])
    semester_no = course['semester'].rsplit('-', 1)[-1]

    record = {
        'id': course['id'],
        'code': course['code'],
        'classCode': course['classCode'],
        'deptSeq': course['deptSeq'],
        'dept': course['deptName'],
        'grade': course['grade'],
        'classGroup': course['classGroup'],
        'name': course['name'],
        'credits': course['credits'],
        'courseType': course['courseType'],
        'baseType': resolve_base_type(course),
        'teacher': '、'.join(course['teachers']),
        'room': '、'.join(rooms),
        'slots': [{'day': s['day'], 'periods': s['periods']} for s in course['slots']],
        'semester': '上' if semester_no == '1' else '下',
    }
    # 選填欄位：有值才輸出，縮小檔案
    optional = {
        'timeHidden': course['timeHidden'],
        'timeNote': course['timeNote'],
        'tags': course['tags'],
        'notes': course['notes'],
        'restrictions': course['restrictions'],
        'prerequisites': [convert_prerequisite(p) for p in course['prerequisites']],
        'sections': [
            {'group': sec['group'], 'teacher': sec['teacher'],
             'slots': [{'day': s['day'], 'periods': s['periods'], 'room': s['room']} for s in sec['slots']]}
            for sec in course['sections']
        ],
        'syllabusUrl': course['syllabusUrl'],
    }
    record.update({k: v for k, v in optional.items() if v})
    return record


def main():
    if len(sys.argv) != 2:
        print('用法：python tools/build_catalog.py <課程 JSON 路徑>')
        sys.exit(1)

    source = Path(sys.argv[1])
    courses = json.loads(source.read_text(encoding='utf-8'))
    records = [convert(c) for c in courses]
    meta = {
        'semester': source.stem,
        'count': len(records),
        'builtAt': date.today().isoformat(),
    }

    lines = [
        '// ============================================================',
        '// 📚 TimeFlow 課程資料庫（由 tools/build_catalog.py 自動產生，請勿手動編輯）',
        f'// 來源：{source.name}　共 {len(records)} 門課',
        '// ============================================================',
        '',
        f'window.COURSE_CATALOG_META = {json.dumps(meta, ensure_ascii=False)};',
        '',
        'window.COURSE_CATALOG = [',
    ]
    lines += [json.dumps(r, ensure_ascii=False, separators=(',', ':')) + ',' for r in records]
    lines.append('];')
    lines.append('')

    OUTPUT.write_text('\n'.join(lines), encoding='utf-8', newline='\n')
    size_kb = OUTPUT.stat().st_size / 1024
    print(f'{len(records)} 門課 → {OUTPUT}（{size_kb:.0f} KB）')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
