# ============================================================
# 🔄 TimeFlow v3.5.1 — 課程資料一鍵更新 (tools/update_course_data.py)
# ------------------------------------------------------------
# 用法（在 TimeFlow 資料夾執行）：
#   本學期開課：python tools/update_course_data.py current <學期資料夾>
#       例如 python tools/update_course_data.py current ../../課程資訊/115-2
#   歷年課程：  python tools/update_course_data.py history <歷年查詢頁資料夾>
#       例如 python tools/update_course_data.py history ../../課程資訊/old
#   只檢查不寫入：在最後加上 --check
#
# 依序執行：解析存下的頁面 → 產生找課資料檔 → 與目前資料比對、列出可疑之處
#          → 更新設定頁「資料來源」中的學期與更新日期。
# 本工具只處理本機檔案，不會對學校網站發出任何請求。
# ============================================================

import json
import re
import subprocess
import sys
from collections import Counter
from datetime import date
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
CATALOG_JS = ROOT / 'js' / 'discover' / 'catalog-data.js'
HISTORY_JS = ROOT / 'js' / 'discover' / 'history-data.js'
INDEX_HTML = ROOT / 'index.html'

# 系所課程數比目前資料少超過這個比例就提醒（可能漏存頁面或頁面沒載入完整）
DROP_WARN_RATIO = 0.5


def run_tool(script, *args):
    """執行同資料夾的工具並即時顯示輸出；失敗時中止。"""
    cmd = [sys.executable, str(TOOLS / script), *map(str, args)]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    output = (result.stdout or '') + (result.stderr or '')
    print(output.rstrip())
    if result.returncode != 0:
        sys.exit(f'\n❌ {script} 執行失敗，已停止。')
    return output


def read_data_js(path, var_name):
    """讀取既有的 catalog-data.js / history-data.js，回傳 (meta, 課程清單)。"""
    if not path.exists():
        return None, []
    text = path.read_text(encoding='utf-8')
    meta_match = re.search(rf'window\.{var_name}_META = (\{{.*?\}});', text)
    meta = json.loads(meta_match.group(1)) if meta_match else None
    records = [json.loads(line.rstrip(',')) for line in text.splitlines() if line.startswith('{')]
    return meta, records


def dept_code(record):
    """系號-序號的前段（例如 E2-054 → E2）；歷年資料沒有序號時以課號前兩碼代替。"""
    seq = record.get('deptSeq') or ''
    return seq.split('-')[0] if seq else (record.get('code') or '')[:2]


def compare_by_dept(old_records, new_records):
    """比較各系所課程數，回傳 (新資料缺少的系所, 課程數大幅下降的系所)。"""
    old_count = Counter(dept_code(r) for r in old_records)
    new_count = Counter(dept_code(r) for r in new_records)
    missing = sorted(code for code in old_count if code and code not in new_count)
    dropped = sorted(
        (code, old_count[code], new_count[code])
        for code in old_count
        if code in new_count and new_count[code] < old_count[code] * DROP_WARN_RATIO
    )
    return missing, dropped


def update_index_source_line(label, new_label, today):
    """更新設定頁「資料來源」中的學期標籤與更新日期，例如「本學期開課（115-1）…資料更新於 2026-10-24」。"""
    text = INDEX_HTML.read_bytes().decode('utf-8')   # 以位元組讀寫，保留原本的 CRLF 換行
    pattern = re.compile(rf'(<b>{label}（)[^）]*(）</b>.*?資料更新於 )\d{{4}}-\d{{2}}-\d{{2}}')
    new_text, count = pattern.subn(rf'\g<1>{new_label}\g<2>{today}', text, count=1)
    if count:
        INDEX_HTML.write_bytes(new_text.encode('utf-8'))
        print(f'✏️  index.html「資料來源」已更新：{label}（{new_label}），資料更新於 {today}')
    else:
        print(f'⚠️  index.html 找不到「{label}」那一行，請手動更新資料來源說明。')


def check_pages(folder, pattern):
    pages = sorted(folder.glob(pattern))
    if not pages:
        sys.exit(f'❌ {folder} 中沒有 {pattern} 檔案，請確認資料夾路徑。')
    return pages


def update_current(folder, check_only):
    semester = folder.name
    if not re.fullmatch(r'\d{3}-[12]', semester):
        sys.exit(f'❌ 學期資料夾要以學年期命名（例如 115-2），目前是「{semester}」。')

    pages = check_pages(folder, '*.html')
    old_meta, old_records = read_data_js(CATALOG_JS, 'COURSE_CATALOG')
    print(f'📂 {folder}：{len(pages)} 個系所頁面')
    if old_meta:
        print(f'📦 目前資料：{old_meta["semester"]}，{old_meta["count"]} 門課（{old_meta["builtAt"]} 建置）')

    # 1. 存下的頁面與目前資料比對：少了哪些系所頁面
    saved_codes = {p.stem for p in pages}
    old_codes = {dept_code(r) for r in old_records if dept_code(r)}
    not_saved = sorted(old_codes - saved_codes)
    if not_saved:
        print(f'⚠️  目前資料有、但這次沒有存頁面的系所（{len(not_saved)} 個）：{"、".join(not_saved)}')
        print('    若這些系所本學期確實沒開課可忽略；否則請補存後再執行。')

    print('\n── 解析頁面 ──')
    run_tool('parse_courses.py', folder)
    json_path = folder.with_suffix('.json')
    new_courses = json.loads(json_path.read_text(encoding='utf-8'))

    print('\n── 比對 ──')
    new_like = [{'deptSeq': c['deptSeq'], 'code': c['code']} for c in new_courses]
    missing, dropped = compare_by_dept(old_records, new_like)
    print(f'課程數：{len(old_records)} → {len(new_courses)}')
    for code, old_n, new_n in dropped:
        print(f'⚠️  {code}：{old_n} → {new_n} 門，降幅超過 {int((1 - DROP_WARN_RATIO) * 100)}%，請確認頁面是否載入完整。')
    if not dropped and not not_saved:
        print('✅ 沒有發現可疑的系所。')

    if check_only:
        print('\n（--check 模式：只檢查，未寫入找課資料與 index.html）')
        return

    print('\n── 產生找課資料 ──')
    run_tool('build_catalog.py', json_path)
    update_index_source_line('本學期開課', semester, date.today().isoformat())
    print_next_steps()


def update_history(folder, check_only):
    check_pages(folder, '*.html')
    old_meta, old_records = read_data_js(HISTORY_JS, 'COURSE_HISTORY')
    if old_meta:
        print(f'📦 目前歷年資料：{old_meta["from"]}～{old_meta["to"]}，{old_meta.get("courseCount", "?")} 筆開課、{old_meta.get("codeCount", "?")} 個課號')

    print('\n── 解析頁面 ──')
    output = run_tool('parse_history.py', folder)
    incomplete = [line for line in output.splitlines() if '⚠️' in line]
    json_path = folder.with_suffix('.json')
    courses = json.loads(json_path.read_text(encoding='utf-8'))
    semesters = sorted({c['semester'] for c in courses}, key=lambda s: tuple(map(int, s.split('-'))))

    print('\n── 比對 ──')
    print(f'學期範圍：{semesters[0]}～{semesters[-1]}（{len(semesters)} 個學期）')
    if incomplete:
        print(f'⚠️  有 {len(incomplete)} 個頁面沒有載入完整（見上方 ⚠️），請重新存完整頁面後再執行。')
    if old_meta and len(semesters) < len(old_meta.get('semesters', [])):
        print(f'⚠️  學期數比目前資料少（{len(old_meta["semesters"])} → {len(semesters)}），請確認是否漏存。')

    if check_only:
        print('\n（--check 模式：只檢查，未寫入找課資料與 index.html）')
        return

    print('\n── 產生歷年資料 ──')
    run_tool('build_history.py', json_path)
    update_index_source_line('歷年課程', f'{semesters[0]}～{semesters[-1]}', date.today().isoformat())
    print_next_steps()


def print_next_steps():
    print('\n✅ 完成。接下來：')
    print('  1. 用瀏覽器開啟 TimeFlow，到「找課」確認資料學期、課程數與幾門熟悉的課是否正確。')
    print('  2. 更新版本號（Service Worker 快取名稱會一起更新，使用者才會拿到新資料）。')
    print('  3. git commit 後推到 GitHub Pages。')


def main():
    args = [a for a in sys.argv[1:] if a != '--check']
    check_only = '--check' in sys.argv
    if len(args) != 2 or args[0] not in ('current', 'history'):
        print(__doc__ or '')
        sys.exit('用法：python tools/update_course_data.py current|history <資料夾> [--check]')

    folder = Path(args[1]).resolve()
    if not folder.is_dir():
        sys.exit(f'❌ 找不到資料夾：{folder}')

    if args[0] == 'current':
        update_current(folder, check_only)
    else:
        update_history(folder, check_only)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
