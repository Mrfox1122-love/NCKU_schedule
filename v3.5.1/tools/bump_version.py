# ============================================================
# 🏷️ TimeFlow v3.5.1 — 版本號一鍵更新 (tools/bump_version.py)
# ------------------------------------------------------------
# 用法（在 TimeFlow 資料夾執行）：
#   python tools/bump_version.py 3.5.1                 # 日期預設今天
#   python tools/bump_version.py 3.5.1 --date 2026.11.02
#   python tools/bump_version.py 3.5.1 --check         # 只列出會改的地方，不寫入
#
# 會一起更新：
#   1. sw.js 的 CACHE_NAME（使用者重新整理後才會拿到新快取）
#   2. index.html 頁尾的版本與日期
#   3. 各檔案開頭註解中的「v舊版本」
# 並順便檢查 index.html 載入的腳本與樣式是否都在 sw.js 的快取清單中。
# ============================================================

import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW_JS = ROOT / 'sw.js'
INDEX_HTML = ROOT / 'index.html'

# 只改開頭註解，所以只看前幾行；自動產生的資料檔與第三方函式庫不動
HEADER_LINES = 6
SCAN_GLOBS = ['*.html', 'css/*.css', 'js/**/*.js', 'tools/*.py']
SKIP_NAMES = {'catalog-data.js', 'history-data.js'}
SKIP_DIRS = {'libs'}

VERSION_RE = re.compile(r'^\d+\.\d+\.\d+$')
CACHE_RE = re.compile(r"(const CACHE_NAME = 'timeflow-cache-v)([\d.]+)(';)")
FOOTER_RE = re.compile(r'(<span>v)([\d.]+) \((\d{4}\.\d{2}\.\d{2})\)(</span>)')


def read(path):
    # newline='' 保留原本的 CRLF／LF
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def write(path, text):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def current_version():
    m = CACHE_RE.search(read(SW_JS))
    if not m:
        sys.exit('❌ 在 sw.js 找不到 CACHE_NAME')
    return m.group(2)


def header_files():
    seen = set()
    for pattern in SCAN_GLOBS:
        for path in ROOT.glob(pattern):
            if path in seen or path.name in SKIP_NAMES or SKIP_DIRS & set(path.parts):
                continue
            seen.add(path)
            yield path


def bump_header(text, old, new):
    lines = text.splitlines(keepends=True)
    head = ''.join(lines[:HEADER_LINES])
    replaced = head.replace(f'v{old}', f'v{new}')
    return replaced + ''.join(lines[HEADER_LINES:]), replaced != head


def check_cache_list():
    """index.html 載入的本機檔案都要在 sw.js 快取清單裡，否則離線時會缺檔"""
    sw = read(SW_JS)
    cached = set(re.findall(r"'\./([^']+)'", sw))
    html = read(INDEX_HTML)
    # catalog-data.js／history-data.js 由 discover.js 延遲載入，同樣需要快取
    loaded = set(re.findall(r'<script src="([^"]+)"', html)) | set(re.findall(r'<link rel="stylesheet" href="([^"]+)"', html))
    missing = sorted(p for p in loaded if not p.startswith('http') and p not in cached)
    not_found = sorted(p for p in cached if p and not (ROOT / p).exists())
    for p in missing:
        print(f'⚠️  index.html 有載入、但 sw.js 快取清單沒有：{p}')
    for p in not_found:
        print(f'⚠️  sw.js 快取清單中的檔案不存在：{p}')
    return not missing and not not_found


def main(argv):
    # Windows 終端機輸出被導向時可能是 cp950，無法編碼的字元以 ? 代替而不中斷
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')
    args = [a for a in argv if not a.startswith('--')]
    check_only = '--check' in argv
    day = date.today().strftime('%Y.%m.%d')
    if '--date' in argv:
        i = argv.index('--date')
        if i + 1 >= len(argv) or not re.match(r'^\d{4}\.\d{2}\.\d{2}$', argv[i + 1]):
            sys.exit('❌ --date 格式應為 YYYY.MM.DD')
        day = argv[i + 1]
        args = [a for a in args if a != day]

    if len(args) != 1 or not VERSION_RE.match(args[0]):
        sys.exit(__doc__ or '用法：python tools/bump_version.py <新版本，例如 3.5.1> [--date YYYY.MM.DD] [--check]')
    new = args[0]
    old = current_version()
    print(f'版本：v{old} → v{new}（{day}）{"（只檢查）" if check_only else ""}')

    changes = {}

    sw = read(SW_JS)
    changes[SW_JS] = CACHE_RE.sub(lambda m: f'{m.group(1)}{new}{m.group(3)}', sw)

    html = read(INDEX_HTML)
    if not FOOTER_RE.search(html):
        print('⚠️  index.html 找不到頁尾版本（格式應為 <span>v3.4.3 (2026.10.27)</span>）')
    changes[INDEX_HTML] = FOOTER_RE.sub(lambda m: f'{m.group(1)}{new} ({day}){m.group(4)}', html)

    for path in header_files():
        text = changes.get(path, read(path))
        bumped, changed = bump_header(text, old, new)
        if changed:
            changes[path] = bumped

    changed_paths = [p for p, text in changes.items() if text != read(p)]
    for p in sorted(changed_paths):
        print(f'  • {p.relative_to(ROOT).as_posix()}')
    print(f'共 {len(changed_paths)} 個檔案')

    cache_ok = check_cache_list()

    if check_only:
        return
    for p in changed_paths:
        write(p, changes[p])
    print('✅ 已更新' + ('' if cache_ok else '（請處理上面的快取清單警告）'))


if __name__ == '__main__':
    main(sys.argv[1:])
