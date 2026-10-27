# ============================================================
# 📚 成大歷年課程查詢頁面解析器 (TimeFlow v3.4.3)
# ------------------------------------------------------------
# 用法：python tools/parse_history.py <歷年查詢頁資料夾，例如 ../../課程資訊/old>
#   讀取 history/ 資料夾中以書籤存下的歷年課程查詢結果頁 (*.html)，
#   輸出 history.json（各學期課程清單，格式與 parse_courses.py 相同）。
#
# 頁面來源：https://course-query.acad.ncku.edu.tw/index.php?c=qry11225
#   本程式只解析本機檔案，不會對學校網站發出任何請求。
# ============================================================

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from parse_courses import expand_periods, parse_prerequisites, strip_tags  # noqa: E402

DAY_MAP = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7}

CARD_PATTERN = re.compile(r'<div class="row g-4 mt-3 course-card-item">(.*?)(?=<p class="line-border|<div class="row g-4 mt-3 course-card-item">|$)', re.S)


def find_text(pattern, fragment):
    m = re.search(pattern, fragment, re.S)
    return strip_tags(m.group(1)) if m else ''


def parse_time_items(fragment):
    """解析「開課時間及教室」：星期、起訖節次（ptime）、教室。"""
    slots = []
    # 每個時段以 course-time-item 開頭，切到下一個時段為止
    for item in fragment.split('course-time-item')[1:]:
        day_text = find_text(r'class="course-index[^"]*">(.*?)</div>', item)
        periods = re.findall(r'<span class="ptime">([0-9A-DN])</span>', item)
        if day_text not in DAY_MAP or not periods:
            continue
        expanded = expand_periods(periods[0], periods[-1] if len(periods) > 1 else None)
        room = find_text(r'class="schedule-room-wrap[^"]*">(.*?)</a>', item)
        if expanded:
            slots.append({'day': DAY_MAP[day_text], 'periods': expanded, 'room': room})
    return slots


def parse_badges(fragment):
    """徽章順序：學分、選必修、年級、班別、類別（部分欄位可能缺漏，依內容判定）。"""
    result = {'credits': 0, 'courseType': '', 'grade': '', 'classGroup': '', 'category': ''}
    badges = [strip_tags(b) for b in re.findall(r'<span class="course-badge[^"]*">(.*?)</span>', fragment, re.S)]
    for b in badges:
        if b.endswith('學分'):
            value = float(b.replace('學分', '').strip() or 0)
            result['credits'] = int(value) if value.is_integer() else value
        elif b in ('必修', '選修'):
            result['courseType'] = b
        elif re.fullmatch(r'\d+年級', b):
            result['grade'] = b.replace('年級', '')
        elif b.endswith('班') or re.fullmatch(r'[甲乙丙丁]+', b):
            result['classGroup'] = b.rstrip('班')
        else:
            result['category'] = b
    return result


def parse_sections(fragment):
    sections = []
    body = fragment.split('course-sections', 1)
    if len(body) < 2:
        return sections
    for sec in re.split(r'<div class="col-md-4">', body[1])[1:]:
        badges = [strip_tags(b) for b in re.findall(r'<span class="course-badge[^"]*">(.*?)</span>', sec, re.S)]
        group = next((b.replace('組', '') for b in badges if b.endswith('組')), '')
        sections.append({
            'group': group,
            'category': next((b for b in badges if not b.endswith('組')), ''),
            'teacher': find_text(r'<span class="section-teacher">(.*?)</span>', sec),
            'slots': parse_time_items(sec),
            'timeNote': '',
        })
    return sections


def parse_card(card):
    is_placeholder = 'course-title-virtual' in card
    main, _, _ = card.partition('course-sections')

    sem_code = find_text(r'<span class="course-code-box">(.*?)</span>', main)  # 例：0111-1
    semester = sem_code.lstrip('0')
    dept_seq = find_text(r'course-code-copyable[^>]*>(.*?)</span>', main)
    code_class = find_text(r'課程碼-分班碼\s*<span class="color-main-red">(.*?)</span>', main)
    course_code, _, class_code = code_class.partition('-')
    attr_code = find_text(r'屬性碼\s*<span class="color-main-red">\[(.*?)\]</span>', main)

    teachers = [strip_tags(t) for t in re.findall(r'<span class="teacher-name">(.*?)</span>', main, re.S)]
    # 「*」標記主負責老師，與本學期解析器一致：teacher 取主負責老師，teachers 去除標記
    teachers = [t for name in teachers for t in re.split(r'[、,，\s]+', name) if t]
    main_teacher = next((t.rstrip('*') for t in teachers if t.endswith('*')), teachers[0] if teachers else '')
    teachers = [t.rstrip('*') for t in teachers]

    tags = [strip_tags(t) for t in re.findall(r'<(?:span|a) class="badge[^"]*"[^>]*>(.*?)</(?:span|a)>', main, re.S)]
    notes, conds = [], []
    for kind, text in re.findall(r'aria-label="(課程備註|課程限選條件)"></i><div class="flex-grow-1"><span>(.*?)</span>', main, re.S):
        (notes if kind == '課程備註' else conds).append(strip_tags(text))
    cond_text = '；'.join(conds)

    # 沒有節次的時段文字（例如「未定」）保留於 timeNote，與 parse_courses.py 一致
    time_notes = [strip_tags(t) for t in re.findall(r'<div class="course-time">(.*?)</div>', main, re.S)
                  if 'ptime' not in t and 'flex-time-inline-btn' not in t and strip_tags(t)]

    syllabus = re.search(r'href="(https://class-qry[^"]+)"', main)
    badges = parse_badges(main.split('schedule-container', 1)[-1])

    return is_placeholder, {
        'id': f"{semester}_{course_code}{('-' + class_code) if class_code else ''}_{dept_seq or attr_code}",
        'semester': semester,
        'deptName': find_text(r'<span class="dept-name">(.*?)</span>', main),
        'deptSeq': dept_seq,
        'code': course_code.strip(),
        'classCode': class_code.strip(),
        'attrCode': attr_code,
        'grade': badges['grade'],
        'classGroup': badges['classGroup'],
        'group': '',
        'category': badges['category'],
        'name': find_text(r'<span class="course-title-text">(.*?)</span>', main),
        'credits': badges['credits'],
        'courseType': badges['courseType'],
        'teacher': main_teacher,
        'teachers': teachers,
        'slots': parse_time_items(main),
        # 密集授課、Coursera、畢業專題等以「上課時間」按鈕呈現，頁面上沒有固定時段
        'timeHidden': 'flex-time-schedule-item' in main,
        'timeNote': '；'.join(time_notes),
        'sections': parse_sections(card),
        'tags': tags,
        'notes': '；'.join(notes),
        'restrictions': [p.strip() for p in cond_text.split('；') if p.strip() and '先修' not in p],
        'prerequisites': parse_prerequisites(cond_text),
        'syllabusUrl': syllabus.group(1).replace('&amp;', '&') if syllabus else '',
        'courseMapUrl': '',
    }


def parse_page(path):
    text = path.read_text(encoding='utf-8')
    start = text.find('id="course-results-container"')
    if start == -1:
        raise ValueError(f'{path.name}: 找不到查詢結果，請確認是否為歷年課程查詢結果頁')
    total = re.search(r'<span id="total-course-count">(\d+)</span>', text)

    courses, skipped = [], 0
    for card in CARD_PATTERN.findall(text[start:]):
        is_placeholder, course = parse_card(card)
        if is_placeholder or (not course['deptSeq'] and not course['teachers']):
            skipped += 1
            continue
        courses.append(course)
    loaded = len(courses) + skipped
    return courses, skipped, loaded, int(total.group(1)) if total else None


def main():
    if len(sys.argv) != 2:
        print('用法：python parse_history.py <歷年查詢頁資料夾，例如 history>')
        sys.exit(1)

    src_dir = Path(sys.argv[1])
    pages = sorted(src_dir.glob('*.html'))
    if not pages:
        print(f'{src_dir} 中沒有 .html 檔案')
        sys.exit(1)

    by_id = {}
    for page in pages:
        courses, skipped, loaded, total = parse_page(page)
        warn = '' if total is None or loaded >= total else f'　⚠️ 只載入 {loaded}/{total} 筆，請重新存完整頁面'
        sems = sorted({c['semester'] for c in courses})
        print(f'{page.name}: {len(courses)} 門課（學期 {sems[0] if sems else "-"}～{sems[-1] if sems else "-"}，排除佔位 {skipped}）{warn}')
        for c in courses:
            by_id[c['id']] = c  # 不同查詢檔重疊的學期以 id 去重

    all_courses = sorted(by_id.values(), key=lambda c: (c['semester'], c['deptSeq'], c['id']))
    out_path = src_dir.with_suffix('.json')
    out_path.write_text(json.dumps(all_courses, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'共 {len(all_courses)} 門課 → {out_path}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
