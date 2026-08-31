// ============================================================
// 📚 找課資料庫常數 (Course Catalog Mock Data)
// ============================================================

const SAMPLE_COURSE_CATALOG = [
    { 
        id: 'cat_01', code: 'EE1001', name: '微積分 (一)', dept: '電機系', grade: '大一', credits: 4, type: '系定必修', 
        teacher: '蘇培芳', room: '92177', semester: '上', 
        slots: [{ day: 1, periods: ['3', '4'] }, { day: 3, periods: ['3', '4'] }], 
        assessment: '期中 35%, 期末 35%, 平時作業 30%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '113-1', '114-1'], pattern: '每學年常態開課',
        notes: '電機系核心必修基礎課程，先修要求：無' 
    },
    { 
        id: 'cat_02', code: 'EE1002', name: '微積分 (二)', dept: '電機系', grade: '大一', credits: 4, type: '系定必修', 
        teacher: '蘇培芳', room: '92177', semester: '下', 
        slots: [{ day: 1, periods: ['3', '4'] }, { day: 3, periods: ['3', '4'] }], 
        assessment: '期中 35%, 期末 35%, 平時作業 30%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-2', '113-2', '114-2'], pattern: '每學年常態開課',
        notes: '需先修微積分 (一)' 
    },
    { 
        id: 'cat_03', code: 'EE1003', name: '普通物理 (一)', dept: '電機系', grade: '大一', credits: 3, type: '系定必修', 
        teacher: '李明憲', room: '92178', semester: '上', 
        slots: [{ day: 2, periods: ['2', '3', '4'] }], 
        assessment: '三次段考各 30%, 隨堂 10%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '113-1', '114-1'], pattern: '每學年常態開課',
        notes: '大一工學院必修' 
    },
    { 
        id: 'cat_04', code: 'EE1004', name: '普通物理 (二)', dept: '電機系', grade: '大一', credits: 3, type: '系定必修', 
        teacher: '李明憲', room: '92178', semester: '下', 
        slots: [{ day: 2, periods: ['2', '3', '4'] }], 
        assessment: '三次段考各 30%, 隨堂 10%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-2', '113-2', '114-2'], pattern: '每學年常態開課',
        notes: '大一工學院必修' 
    },
    { 
        id: 'cat_05', code: 'EE2001', name: '電路學 (一)', dept: '電機系', grade: '大二', credits: 3, type: '系定必修', 
        teacher: '張簡嘉壬', room: '92177', semester: '上', 
        slots: [{ day: 2, periods: ['5', '6', '7'] }], 
        assessment: '期中考 40%, 期末考 40%, 作業 20%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '113-1', '114-1'], pattern: '每學年常態開課',
        notes: '電機系核心硬課' 
    },
    { 
        id: 'cat_06', code: 'EE2002', name: '電子學 (一)', dept: '電機系', grade: '大二', credits: 3, type: '系定必修', 
        teacher: '郭泰豪', room: '92201', semester: '上', 
        slots: [{ day: 4, periods: ['5', '6', '7'] }], 
        assessment: '期中 30%, 期末 40%, 小考 30%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '113-1', '114-1'], pattern: '每學年常態開課',
        notes: '建議先修電路學' 
    },
    { 
        id: 'cat_07', code: 'EE2003', name: '工程數學 (一)', dept: '電機系', grade: '大二', credits: 3, type: '系定必修', 
        teacher: '戴顯權', room: '92177', semester: '上', 
        slots: [{ day: 3, periods: ['6', '7', '8'] }], 
        assessment: '期中 35%, 期末 35%, 作業 30%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '113-1', '114-1'], pattern: '每學年常態開課',
        notes: '常微分方程與線性代數' 
    },
    { 
        id: 'cat_08', code: 'EE3001', name: '數位訊號處理', dept: '電機系', grade: '大三', credits: 3, type: '選修-本系', 
        teacher: '解巽評', room: '92388', semester: '下', 
        slots: [{ day: 1, periods: ['6', '7', '8'] }], 
        assessment: '期末專題 50%, 作業 50%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-2', '114-2'], pattern: '隔年開課',
        notes: '訊號與系統專業選修，含 Python 實作專題' 
    },
    { 
        id: 'cat_09', code: 'EE3002', name: '超大型積體電路設計', dept: '電機系', grade: '大三', credits: 3, type: '選修-本系', 
        teacher: '謝明得', room: '92401', semester: '上', 
        slots: [{ day: 5, periods: ['2', '3', '4'] }], 
        assessment: 'Lab 實作 40%, 專題 60%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '113-1', '114-1'], pattern: '每學年常態開課',
        notes: 'VLSI 晶片設計入門核心選修' 
    },
    { 
        id: 'cat_10', code: 'GE1001', name: '台灣歷史與文化', dept: '通識中心', grade: '全校', credits: 2, type: '通識-人文', 
        teacher: '陳文松', room: '光復201', semester: '全年', 
        slots: [{ day: 3, periods: ['1', '2'] }], 
        assessment: '課堂討論 40%, 期末報告 60%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '112-2', '113-1', '113-2', '114-1'], pattern: '每學期常態開課',
        notes: '人文領域通識，無期中期末考試' 
    },
    { 
        id: 'cat_11', code: 'GE1002', name: '經濟學概論', dept: '通識中心', grade: '全校', credits: 2, type: '通識-社科', 
        teacher: '王經濟', room: '社科001', semester: '全年', 
        slots: [{ day: 4, periods: ['3', '4'] }], 
        assessment: '期中考 50%, 期末考 50%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '113-1', '114-1'], pattern: '每學年常態開課',
        notes: '社會科學領域通識' 
    },
    { 
        id: 'cat_12', code: 'GE1003', name: '現代生物醫學特論', dept: '通識中心', grade: '全校', credits: 2, type: '通識-生醫', 
        teacher: '張醫學', room: '醫學院講堂', semester: '下', 
        slots: [{ day: 5, periods: ['5', '6'] }], 
        assessment: '線上測驗 50%, 心得 50%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['111-2', '113-2'], pattern: '隔年開課',
        notes: '生命與健康領域通識' 
    },
    { 
        id: 'cat_13', code: 'GE1004', name: '跨域科技創新思維', dept: '通識中心', grade: '全校', credits: 2, type: '融通', 
        teacher: '林創新', room: '未來館B1', semester: '全年', 
        slots: [{ day: 2, periods: ['8', '9'] }], 
        assessment: '跨域專案成果 100%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['113-1', '113-2', '114-1'], pattern: '每學期皆有開課',
        notes: '融合通識學分採計' 
    },
    { 
        id: 'cat_14', code: 'CC1001', name: '大學國文', dept: '中文系', grade: '大一', credits: 2, type: '國文', 
        teacher: '中文系師資', room: '中文系館', semester: '全年', 
        slots: [{ day: 1, periods: ['1', '2'] }], 
        assessment: '作文 40%, 期末 40%, 平時 20%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '112-2', '113-1', '113-2', '114-1', '114-2'], pattern: '每學期常態開課',
        notes: '校定共同必修' 
    },
    { 
        id: 'cat_15', code: 'ENG101', name: '基礎英文', dept: '外語中心', grade: '大一', credits: 2, type: '英文', 
        teacher: '外語中心師資', room: '修齊大樓', semester: '全年', 
        slots: [{ day: 4, periods: ['1', '2'] }], 
        assessment: '期中 30%, 期末 30%, 口語 40%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '112-2', '113-1', '113-2', '114-1', '114-2'], pattern: '每學期常態開課',
        notes: '校定共同必修，英文免修者免修' 
    },
    { 
        id: 'cat_16', code: 'PE1001', name: '體育 (羽球)', dept: '體育室', grade: '大一/二', credits: 0, type: '體育', 
        teacher: '體育室師資', room: '羽球館', semester: '全年', 
        slots: [{ day: 5, periods: ['3', '4'] }], 
        assessment: '出席 50%, 技能測驗 50%',
        syllabusUrl: 'https://course.ncku.edu.tw/index.php?c=qry_all',
        history: ['112-1', '112-2', '113-1', '113-2', '114-1', '114-2'], pattern: '每學期常態開課',
        notes: '校定體育必修 (0 學分)' 
    }
];