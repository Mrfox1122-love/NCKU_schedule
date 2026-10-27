# ============================================================
# 📚 成大課程查詢頁面解析器 (TimeFlow v3.4.3)
# ------------------------------------------------------------
# 用法：python tools/parse_courses.py <學期資料夾，例如 ../../課程資訊/115-1>
#   讀取 115-1/ 資料夾中所有手動另存的系所課程頁面 (*.html)，
#   輸出 115-1.json（課程清單，含時段、教室、先修條件）。
#
# 頁面來源：https://course.ncku.edu.tw/index.php?c=qry_all
#   由使用者在瀏覽器點選系所後「另存網頁」，本程式只解析本機檔案，
#   不會對學校網站發出任何請求。
# ============================================================

import html
import json
import re
import sys
from pathlib import Path

# 成大官方 14 節次順序（與 js/core/config.js 的 periodOrder 一致）
PERIOD_ORDER = ['1', '2', '3', '4', 'N', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D']

# 主表格表頭：用來定位課程表，避開頁面上其他表格（行動版、彈窗）
MAIN_TABLE_HEADER = '<th width="8%">系所名稱</th>'

PREREQ_PATTERN = re.compile(r'《([^《》]+)》')
SLOT_PATTERN = re.compile(r'^\[(\d)\]\s*([0-9A-DN]+)(?:~([0-9A-DN]+))?\s*(.*)$')


def strip_tags(fragment):
    """移除 HTML 標籤與註解，並收合空白。"""
    text = re.sub(r'<!--.*?-->', '', fragment, flags=re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def split_br(fragment):
    """依 <br> 切開儲存格，回傳每段的純文字。"""
    return [strip_tags(part) for part in re.split(r'<br\s*/?>', fragment)]


def expand_periods(start, end):
    """將 '3'~'4' 展開為 ['3', '4']；無法辨識時回傳空陣列。"""
    if start not in PERIOD_ORDER:
        return []
    if not end:
        return [start]
    if end not in PERIOD_ORDER:
        return []
    i, j = PERIOD_ORDER.index(start), PERIOD_ORDER.index(end)
    return PERIOD_ORDER[i:j + 1] if i <= j else []


def parse_prerequisites(cond_text):
    """
    解析「需先修以下科目:《微積分（二）/必修/3.0 學分/50 分以上》」，
    輸出 PrerequisiteEngine 可用的 required 陣列格式。
    """
    prereq_part = next((part for part in cond_text.split('；') if '先修' in part), '')
    if not prereq_part:
        return []
    result = []
    # 多門先修科目一律為「且」（全部修過才符合）
    for spec in PREREQ_PATTERN.findall(prereq_part):
        parts = [p.strip() for p in spec.split('/')]
        name = parts[0]
        credits_match = re.search(r'([\d.]+)\s*學分', spec)
        score_match = re.search(r'(\d+)\s*分以上', spec)
        result.append({
            'code': '',
            'name': name,
            'courseType': parts[1] if len(parts) > 1 else '',
            'credits': float(credits_match.group(1)) if credits_match else None,
            'requirement': 'passed' if score_match else 'completed',
            'minScore': int(score_match.group(1)) if score_match else None,
        })
    return result


def parse_time_cell(fragment):
    """
    解析時間／教室欄，例如 [2]3~4 電機系館 92271<br>[4]2 電機系館 92271。
    回傳 (slots, timeHidden, timeNote)；timeNote 保留「未定」等非時段文字。
    """
    if 'flex_time' in fragment:
        # 時間需點擊按鈕才會顯示，另存的頁面中沒有實際資料
        return [], True, ''
    slots, notes = [], []
    for part in split_br(fragment):
        m = SLOT_PATTERN.match(part)
        if not m:
            if part:
                notes.append(part)
            continue
        day, start, end, room = m.groups()
        periods = expand_periods(start, end)
        if periods:
            slots.append({'day': int(day), 'periods': periods, 'room': room.strip()})
        else:
            notes.append(part)
    return slots, False, '；'.join(notes)


def parse_section_row(cells):
    """演習／實習分組列：系所欄空白，附屬於上一列的主課程。"""
    grade_parts = split_br(cells[2]) + ['', '', '']
    slots, _, time_note = parse_time_cell(cells[8])
    return {
        'group': grade_parts[2],
        'category': strip_tags(cells[3]),
        'teacher': strip_tags(cells[6]),
        'slots': slots,
        'timeNote': time_note,
    }


def parse_row(cells, semester):
    dept_cell, code_cell, grade_cell, category_cell, name_cell, credit_cell, teacher_cell, _enroll, time_cell, link_cell = cells

    # 系號-序號 / 課程碼-分班碼 / [屬性碼]
    seq_match = re.search(r'<div class="dept_seq">(.*?)</div>', code_cell, re.S)
    dept_seq = strip_tags(seq_match.group(1)) if seq_match else ''
    code_lines = split_br(re.sub(r'<div class="dept_seq">.*?</div>', '', code_cell, flags=re.S))
    course_code, _, class_code = (code_lines[0] if code_lines else '').partition('-')
    attr_code = code_lines[1].strip('[] ') if len(code_lines) > 1 else ''

    grade_parts = split_br(grade_cell) + ['', '', '']

    # 科目名稱、微學程標籤、備註、限修條件
    name_match = re.search(r'<span class="course_name">(.*?)</span>', name_cell, re.S)
    name = strip_tags(name_match.group(1)) if name_match else ''
    map_match = re.search(r'href="(https://course-map[^"]+)"', name_cell)
    tags = [strip_tags(t) for t in re.findall(r'<div class="label[^"]*"[^>]*>(.*?)</div>', name_cell, re.S)]
    note_match = re.search(r'fa-file-text-o"></i>(.*?)<div class="cond">', name_cell, re.S)
    notes = strip_tags(note_match.group(1)) if note_match else ''
    cond_match = re.search(r'<div class="cond">(.*?)</div>', name_cell, re.S)
    cond_text = strip_tags(cond_match.group(1)) if cond_match else ''
    # 限修條件可能與先修並列，例如「限本系；需先修以下科目:《…》；限5年級以上選課」
    restrictions = [part.strip() for part in cond_text.split('；') if part.strip() and '先修' not in part]

    credit_parts = split_br(credit_cell)
    try:
        credits = float(credit_parts[0])
        credits = int(credits) if credits.is_integer() else credits
    except (ValueError, IndexError):
        credits = 0

    teachers = [t for t in split_br(teacher_cell) if t]
    main_teacher = next((t.rstrip('*') for t in teachers if t.endswith('*')), teachers[0] if teachers else '')

    slots, time_hidden, time_note = parse_time_cell(time_cell)
    syllabus_match = re.search(r'href="(https://class-qry[^"]+)"', link_cell)

    return {
        'id': f"{semester}_{course_code}{('-' + class_code) if class_code else ''}_{dept_seq or attr_code}",
        'semester': semester,
        'deptName': strip_tags(dept_cell),
        'deptSeq': dept_seq,
        'code': course_code.strip(),
        'classCode': class_code.strip(),
        'attrCode': attr_code,
        'grade': grade_parts[0],
        'classGroup': grade_parts[1],
        'group': grade_parts[2],
        'category': strip_tags(category_cell),
        'name': name,
        'credits': credits,
        'courseType': credit_parts[1] if len(credit_parts) > 1 else '',
        'teacher': main_teacher,
        'teachers': [t.rstrip('*') for t in teachers],
        'slots': slots,
        'timeHidden': time_hidden,
        'timeNote': time_note,
        'sections': [],
        'tags': tags,
        'notes': notes,
        'restrictions': restrictions,
        'prerequisites': parse_prerequisites(cond_text),
        'syllabusUrl': html.unescape(syllabus_match.group(1)) if syllabus_match else '',
        'courseMapUrl': html.unescape(map_match.group(1)) if map_match else '',
    }


def is_placeholder(course):
    """
    各系課表中的「時段佔位列」（通識課程、大學國文、外國語言、體育等），
    僅標示系上保留的時段，真正的課程由開課單位（A1、A2、A9…）另行列出。
    特徵：沒有系號-序號、沒有授課教師（分班碼皆為 Z 開頭、無課綱與課程地圖連結）。
    師培中心的「實習輔導」同樣沒有系號-序號，但有授課教師與學分，屬真實課程，予以保留。
    """
    return not course['deptSeq'] and not course['teachers']


def parse_page(path, semester):
    text = path.read_text(encoding='utf-8')
    head_idx = text.find(MAIN_TABLE_HEADER)
    if head_idx == -1:
        raise ValueError(f'{path.name}: 找不到課程主表格，請確認是否為系所課程查詢結果頁')
    body_start = text.find('<tbody', head_idx)
    body_end = text.find('</tbody>', body_start)
    body = text[body_start:body_end]

    courses = []
    for row in re.findall(r'<tr>(.*?)</tr>', body, re.S):
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)
        if len(cells) != 10:
            continue
        if not strip_tags(cells[0]):
            if courses:
                courses[-1]['sections'].append(parse_section_row(cells))
            continue
        courses.append(parse_row(cells, semester))

    real = [c for c in courses if not is_placeholder(c)]
    return real, len(courses) - len(real)


def main():
    if len(sys.argv) != 2:
        print('用法：python parse_courses.py <學期資料夾，例如 115-1>')
        sys.exit(1)

    sem_dir = Path(sys.argv[1])
    semester = sem_dir.name
    pages = sorted(sem_dir.glob('*.html'))
    if not pages:
        print(f'{sem_dir} 中沒有 .html 檔案')
        sys.exit(1)

    all_courses = []
    total_skipped = 0
    for page in pages:
        courses, skipped = parse_page(page, semester)
        hidden = sum(1 for c in courses if c['timeHidden'])
        prereq = sum(1 for c in courses if c['prerequisites'])
        print(f'{page.name}: {len(courses)} 門課（先修 {prereq}、時間未公開 {hidden}、排除佔位 {skipped}）')
        all_courses.extend(courses)
        total_skipped += skipped

    out_path = sem_dir.with_suffix('.json')
    out_path.write_text(json.dumps(all_courses, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'共 {len(all_courses)} 門課（已排除佔位 {total_skipped} 筆）→ {out_path}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
