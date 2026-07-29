# 南島慢旅 · Southern Notes

為 2026/09/19–09/29 紐西蘭南島 11 天 10 夜旅程製作的 Mobile-First 互動旅遊手冊。

## 從零建立專案

```bash
npm create vite@latest NewZealand -- --template react
cd NewZealand
npm install
npm install tailwindcss @tailwindcss/vite lucide-react
```

本專案已完成上述設定，實際使用時只需：

```bash
pnpm install
pnpm dev
```

正式建置：

```bash
pnpm build
pnpm preview
```

## GitHub Pages

1. 將程式碼 push 到 `main` 分支。
2. 前往 GitHub Repository → **Settings → Pages**。
3. 將 **Build and deployment / Source** 設為 **GitHub Actions**。
4. `.github/workflows/deploy.yml` 會自動執行建置與部署。
5. 網站網址為 `https://sarshi1223.github.io/NewZealand/`。

`vite.config.js` 已設定 `base: '/NewZealand/'`。本專案使用單頁錨點導覽，未使用 React Router，因此不需要額外設定 `basename`，也不會遇到子路徑重新整理 404。

## 完整檔案清單

```text
.
├── .github/workflows/deploy.yml  # GitHub Pages 自動部署
├── .gitignore
├── index.html                    # SEO / Open Graph / App 入口
├── package.json                  # 套件與指令
├── pnpm-lock.yaml                # pnpm 鎖定版本
├── pnpm-workspace.yaml           # 允許 Vite 建置工具安裝
├── public/
│   └── og.png                    # 社群分享預覽圖
├── src/
│   ├── App.jsx                   # Tracker、行程、探索與導覽元件
│   ├── data.js                   # 11 日行程與分區推薦 JSON 資料
│   ├── index.css                 # Tailwind 與 Mobile-First RWD 樣式
│   └── main.jsx                  # React 掛載入口
└── vite.config.js                # Vite、Tailwind 與 Pages base 設定
```

## 資料維護

- 完整行程：編輯 `src/data.js` 的 `itinerary`
- 分區餐廳與景點：編輯 `src/data.js` 的 `regions`
- 旅程摘要：編輯 `tripMeta`
- 核心亮點：編輯 `highlights`

所有地圖按鈕會依 `place` 或推薦名稱，自動產生 Google Maps Search URL。
