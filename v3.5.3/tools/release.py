# ============================================================
# 🚀 TimeFlow v3.5.3 — 發布腳本 (tools/release.py)
# ------------------------------------------------------------
# 把目前的原始碼整理成一個新版本，放進部署用的 repo（GitHub Pages 那個）。
#
# 用法（在 TimeFlow 資料夾執行）：
#   python tools/release.py 3.5.3 --deploy ../NCKU_schedule --dry-run   # 只列出會做的事
#   python tools/release.py 3.5.3 --deploy ../NCKU_schedule             # 正式執行
#   加上 --date 2026.11.20 指定日期（預設今天）
#   加上 --no-commit 只改檔案、不自動 commit
#
# 流程（任何一步失敗就停止，不會留下半套）：
#   1. 確認原始碼的 git 工作區是乾淨的
#   2. 跑自動化測試（npm test）
#   3. 用 bump_version.py 更新版本號，再跑一次測試，並 commit「vX.Y.Z」
#   4. 把網站檔案複製到 <deploy>/vX.Y.Z/（不含 tests、package.json、.github）
#   5. 更新部署 repo：根目錄 README、tests/、package.json，以及
#      .github/workflows/static.yml（先跑測試、通過才部署新版本資料夾）
#   6. 用部署 repo 內的版本資料夾再跑一次測試，確認複製沒有漏檔
#   7. 在部署 repo commit「vX.Y.Z」
# 腳本不會 push；最後會印出要執行的指令，請自己確認後再推上去。
# ============================================================

import argparse
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_RE = re.compile(r'^\d+\.\d+\.\d+$')

# 不放進部署資料夾的檔案（開發用）
EXCLUDE_PREFIXES = ('tests/', '.github/', '.claude/')
EXCLUDE_FILES = {'package.json', '.gitignore', 'package-lock.json'}

WORKFLOW_TEMPLATE = """\
# 先跑自動化測試，通過才部署到 GitHub Pages（由 tools/release.py 產生，部署資料夾：{folder}）
name: Test and deploy to Pages

on:
  push:
    branches: ["main"]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run tests against the deployed folder
        run: npm test
        env:
          TIMEFLOW_ROOT: ./{folder}

  deploy:
    needs: test
    if: github.event_name != 'pull_request'
    environment:
      name: github-pages
      url: ${{{{ steps.deployment.outputs.page_url }}}}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './{folder}'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
"""


def run(cmd, cwd=ROOT, check=True, capture=False, env=None):
    print(f'  $ {" ".join(str(c) for c in cmd)}   (在 {Path(cwd).name})')
    result = subprocess.run(cmd, cwd=cwd, check=False, text=True, encoding='utf-8',
                            capture_output=capture, env=env)
    if check and result.returncode != 0:
        if capture:
            print(result.stdout or '')
            print(result.stderr or '')
        sys.exit(f'❌ 指令失敗（結束代碼 {result.returncode}）：{" ".join(str(c) for c in cmd)}')
    return result


def npm_test(cwd, root_env=None):
    import os
    env = dict(os.environ)
    if root_env:
        env['TIMEFLOW_ROOT'] = str(root_env)
    npm = 'npm.cmd' if sys.platform == 'win32' else 'npm'
    run([npm, 'test'], cwd=cwd, env=env)


def tracked_files():
    out = run(['git', 'ls-files'], capture=True).stdout.splitlines()
    files = []
    for name in out:
        if name in EXCLUDE_FILES or name.startswith(EXCLUDE_PREFIXES):
            continue
        files.append(name)
    return files


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')
    ap = argparse.ArgumentParser(description='把 TimeFlow 整理成新版本並放進部署 repo')
    ap.add_argument('version', help='新版本，例如 3.5.3')
    ap.add_argument('--deploy', required=True, help='部署 repo 的路徑（例如 ../NCKU_schedule）')
    ap.add_argument('--date', default=date.today().strftime('%Y.%m.%d'), help='版本日期 YYYY.MM.DD')
    ap.add_argument('--dry-run', action='store_true', help='只列出會做的事，不改任何檔案')
    ap.add_argument('--no-commit', action='store_true', help='不自動 commit')
    args = ap.parse_args(argv)

    if not VERSION_RE.match(args.version):
        sys.exit('❌ 版本格式應為 X.Y.Z，例如 3.5.3')
    if not re.match(r'^\d{4}\.\d{2}\.\d{2}$', args.date):
        sys.exit('❌ --date 格式應為 YYYY.MM.DD')
    deploy = Path(args.deploy).resolve()
    if not (deploy / '.git').exists():
        sys.exit(f'❌ {deploy} 不是 git repo')
    folder = f'v{args.version}'
    target = deploy / folder
    if target.exists():
        sys.exit(f'❌ {target} 已經存在，請換一個版本號，或先確認是不是已經發布過')

    print(f'🚀 發布 v{args.version}（{args.date}）→ {target}')

    # 1. 工作區必須乾淨
    status = run(['git', 'status', '--porcelain'], capture=True).stdout.strip()
    if status:
        sys.exit('❌ 原始碼還有未 commit 的變更，請先 commit 或還原：\n' + status)
    dep_status = run(['git', 'status', '--porcelain'], cwd=deploy, capture=True).stdout.strip()
    if dep_status:
        sys.exit('❌ 部署 repo 還有未 commit 的變更，請先處理：\n' + dep_status)

    files = tracked_files()
    print(f'  將複製 {len(files)} 個檔案到 {folder}/')
    if args.dry_run:
        print('（dry-run）接下來會：測試 → 升版 → 再測試 → commit → 複製 → 更新 workflow 與 tests → 在部署 repo 測試並 commit')
        return

    # 2. 測試
    print('\n[1/6] 跑測試')
    npm_test(ROOT)

    # 3. 升版、再測試、commit
    print('\n[2/6] 升版')
    run([sys.executable, 'tools/bump_version.py', args.version, '--date', args.date])
    print('\n[3/6] 升版後再測一次')
    npm_test(ROOT)
    if not args.no_commit:
        run(['git', 'commit', '-am', f'v{args.version}'])

    # 4. 複製網站檔案
    print('\n[4/6] 複製檔案')
    files = tracked_files()
    for name in files:
        src = ROOT / name
        dst = target / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    print(f'  已複製 {len(files)} 個檔案')

    # 5. 部署 repo：README、tests、package.json、workflow
    print('\n[5/6] 更新部署 repo')
    shutil.copy2(ROOT / 'README.md', deploy / 'README.md')
    if (deploy / 'tests').exists():
        shutil.rmtree(deploy / 'tests')
    shutil.copytree(ROOT / 'tests', deploy / 'tests')
    shutil.copy2(ROOT / 'package.json', deploy / 'package.json')
    wf = deploy / '.github' / 'workflows' / 'static.yml'
    wf.parent.mkdir(parents=True, exist_ok=True)
    wf.write_text(WORKFLOW_TEMPLATE.format(folder=folder), encoding='utf-8', newline='\n')
    print(f'  workflow 已改為測試通過後部署 ./{folder}')

    # 6. 用部署 repo 內的檔案再測一次
    print('\n[6/6] 在部署 repo 內測試版本資料夾')
    npm_test(deploy, root_env=target)

    if not args.no_commit:
        run(['git', 'add', '-A'], cwd=deploy)
        run(['git', 'commit', '-m', f'v{args.version}'], cwd=deploy)

    print('\n✅ 完成。腳本不會 push，請確認後自行執行：')
    print(f'    cd "{deploy}"')
    print('    git log --stat -1      # 看這次的變更')
    print('    git push               # 推上去後 GitHub Actions 會先跑測試再部署')


if __name__ == '__main__':
    main(sys.argv[1:])
