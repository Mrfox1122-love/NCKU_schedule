# 課程資料更新流程

TimeFlow「找課」使用兩份資料：

| 資料 | 檔案 | 來源 | 多久更新一次 |
|---|---|---|---|
| 本學期開課 | `js/discover/catalog-data.js` | 課程查詢 course.ncku.edu.tw 各系所頁面 | 每學期選課前 |
| 歷年課程 | `js/discover/history-data.js` | 歷年課程查詢 course-query.acad.ncku.edu.tw | 每學年一次（加入剛結束的兩個學期） |

所有工具都只解析**你自己存下來的頁面**，不會對學校網站發出任何請求。學校禁止爬蟲，請不要改成自動抓取。

---

## 一、事前準備（只需做一次）

1. 用瀏覽器打開 `tools/bookmarklet.html`，把「📥 存課程頁」按鈕拖到書籤列。
2. 建議在 Chrome 設定 →「下載」把下載位置改成要存放的資料夾，就不用搬檔案；第一次下載若詢問「允許下載多個檔案」請選允許。

## 二、每學期：更新本學期開課

1. 建立以學年期命名的資料夾，例如 `課程資訊/115-2/`（名稱必須是 `學年-學期`）。
2. 打開 course.ncku.edu.tw/index.php?c=qry_all，逐一點進每個系所，等列表**完全載入**後按書籤「📥 存課程頁」，會存成 `E2.html` 這類檔名。
3. 先檢查（不會改動 TimeFlow）：

   ```
   python tools/update_course_data.py current ../../課程資訊/115-2 --check
   ```

   會列出：
   - 上學期有、這次沒存的系所頁面（可能漏存）
   - 課程數比目前資料少一半以上的系所（可能頁面沒載入完整）

   有警告就補存或重存那幾個系所，再檢查一次。
4. 確認沒問題後正式更新（拿掉 `--check`）：

   ```
   python tools/update_course_data.py current ../../課程資訊/115-2
   ```

   會產生新的 `catalog-data.js`，並自動更新設定頁「資料來源」的學期與日期。

## 三、每學年：更新歷年課程

1. 打開 course-query.acad.ncku.edu.tw/index.php?c=qry11225，選學年期範圍與系所後查詢。
2. 一直捲到最底，直到出現「已載入全部課程」（請不要捲太快，學校有請求頻率限制），再按書籤存檔。若出現「已達本次載入上限」，請縮小學期範圍或系所分次查詢。
3. 全部存到同一個資料夾（例如 `課程資訊/old/`），然後：

   ```
   python tools/update_course_data.py history ../../課程資訊/old --check
   python tools/update_course_data.py history ../../課程資訊/old
   ```

   檢查時會標出沒有載入完整的頁面，以及學期數比目前資料少的情況。

> 建議保留約 4 學年（8 個學期）的範圍：太短看不出開課規律，太長檔案會變大、找課載入變慢。

## 四、更新後

1. 用瀏覽器開啟 TimeFlow，到「找課」確認資料學期、課程數，並搜尋幾門熟悉的課確認時段、教室正確。
2. 更新版本號：`python tools/bump_version.py <新版本>`（Service Worker 快取名稱會一起更新，使用者才會拿到新資料）。
3. `git commit` 後推到 GitHub Pages。

---

## 工具一覽

| 檔案 | 用途 |
|---|---|
| `update_course_data.py` | 一鍵更新：依序執行下面四個工具，並比對、更新資料來源說明 |
| `parse_courses.py` | 解析本學期系所頁面 → `<學期>.json` |
| `parse_history.py` | 解析歷年查詢頁 → `<資料夾>.json` |
| `build_catalog.py` | `<學期>.json` → `js/discover/catalog-data.js` |
| `build_history.py` | 歷年 json → `js/discover/history-data.js` |
| `bookmarklet.html` | 存頁面用的書籤與使用說明 |

先修條件規則會在載入資料時自動由課程資料產生（`js/course/prerequisite-rules.js`），不需另外處理。
