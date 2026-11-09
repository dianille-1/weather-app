# 天氣 App — 前端技術作業

搜尋城市、查看即時天氣與未來一週預報的單頁應用。

以 React 19 + TypeScript + Vite + React Router 實作，後端完全不需要：
天氣與地名兩個資料來源都是免註冊、免 API key 的公開服務。
整份原始碼可直接 `npm install && npm run dev` 跑起來。

---

## 目錄

- [功能](#功能)
- [快速開始](#快速開始)
- [技術選型](#技術選型)
- [系統架構](#系統架構)
  - [分層](#分層)
  - [目錄結構](#目錄結構)
  - [路由](#路由)
  - [資料流](#資料流)
- [資料來源與一個真實的坑](#資料來源與一個真實的坑)
- [關鍵設計決策與取捨](#關鍵設計決策與取捨)
- [錯誤處理](#錯誤處理)
- [狀態管理](#狀態管理)
- [測試](#測試)
- [無障礙與響應式](#無障礙與響應式)
- [已知限制與下一步](#已知限制與下一步)
- [環境變數](#環境變數)

---

## 功能

| 功能 | 說明 |
| --- | --- |
| 地名搜尋 | 300ms debounce、最少 2 字、↑↓ / Enter / Esc 鍵盤操作、ARIA combobox 語意 |
| 即時天氣 | 溫度、體感溫度、天況、濕度、風速與風向、降水量、觀測時間、當地時間 |
| 一週預報 | 未來 7 天每日天況、高低溫、降雨機率 |
| 單位切換 | °C / °F（風速同步切換 km/h / mph），偏好寫入 localStorage |
| 最近瀏覽 | 最近 5 個地點，可一鍵切換、可刪除 |
| 當地天氣 | 沒有搜尋任何城市時，預設用瀏覽器定位顯示所在城市的即時天氣與預報 |
| 可分享 | 選取地點同步到網址（`?lat=&lon=&name=…`），重新整理／分享連結都停在同一個城市 |
| 設定頁 | `/settings`：單位偏好、最近瀏覽管理、資料來源說明、鍵盤操作說明 |
| 載入與錯誤狀態 | 骨架屏、錯誤橫幅含重試按鈕、查無結果提示、404 頁、全域錯誤邊界 |
| 響應式 | 單欄（< 880px）↔ 側欄 + 內容（≥ 880px） |

---

## 快速開始

```bash
npm install
cp .env.example .env      # 可選：全部都有預設值，不設定也能跑
npm run dev               # http://localhost:5173
```

其他指令：

```bash
npm run build      # typecheck + 正式版建置（dist/）
npm run preview    # 預覽正式版
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest（單元測試 + 元件測試）
npm run test:watch # 監看模式
LIVE_API_TESTS=1 npm test   # 額外跑「打真實 API」的煙霧測試
```

> **注意**：若 `npm install` 遇到 `EALLOWREMOTE` 錯誤，代表 `package-lock.json` 記錄的是
> npmmirror 等第三方鏡像，而 npm 12 預設封鎖非官方 registry 的 tarball。
> 改成用鏡像安裝即可：`npm install --registry=https://registry.npmmirror.com`。

---

## 技術選型

| 選擇 | 理由 |
| --- | --- |
| **React 19 + TypeScript** | 題目指定的方向；TS 讓「外部資料」與「領域模型」之間的轉換有編譯期保護 |
| **Vite** | 啟動快、建置快；測試用 Vitest 直接共用同一套設定 |
| **React Router 7** | 需要多個頁面（天氣、設定、404）與可分享的網址狀態。宣告式模式足夠，不需要 data router 的負載能力 |
| **CSS Modules** | 零 runtime、零相依；元件樣式就近維護，不必引入 CSS-in-JS 的額外成本 |
| **原生 fetch** | 兩個 API 都是簡單的 GET + JSON，不需要 axios；fetch 的 AbortSignal 正好用來處理競態 |
| **Vitest + Testing Library** | 與 Vite 共用設定，測試環境就是開發環境 |
| **不引入狀態管理套件** | 理由見[狀態管理](#狀態管理) |

---

## 系統架構

### 分層

```
┌───────────────────────────────────────────────────────────┐
│ app/          App（組裝）· router（路由表）· providers      │  應用程式組裝
├───────────────────────────────────────────────────────────┤
│ pages/        WeatherPage · SettingsPage · NotFoundPage    │  頁面：組出畫面
├───────────────────────────────────────────────────────────┤
│ components/   layout/（外框）common/（共用）search/ weather/│  元件
├───────────────────────────────────────────────────────────┤
│ hooks/        useLocationSearch / useWeather / …            │  狀態與副作用
├───────────────────────────────────────────────────────────┤
│ api/          port（介面）+ adapter（實作）+ 裝飾器          │  與外部世界的邊界
├───────────────────────────────────────────────────────────┤
│ types/ utils/                                              │  領域模型與純函式
└───────────────────────────────────────────────────────────┘
```

依賴方向永遠朝上：`pages → hooks → api → types/utils`，反向不通。
`types` 與 `utils` 不依賴任何東西，因此可以被任何層安全引用。

**頁面只做三件事**：讀取狀態、呼叫 hook、組出畫面。
它們不認識 API（只認識 port）、也不認識彼此（天氣頁不知道設定頁存在）。

### 目錄結構

```
src/
├─ app/                       應用程式組裝層
│  ├─ App.tsx                 只做組裝：ErrorBoundary > Router > Providers > Routes
│  ├─ router.tsx              路由表（新增頁面只改這裡）
│  ├─ providers.tsx           DataSource / Preferences / Tone 三個 Provider
│  ├─ dataSources.ts          context + useDataSources()
│  ├─ preferences.ts          context + usePreferences()
│  ├─ tone.ts                 context + useTone() + useReportTone()
│  └─ router.test.tsx         路由煙霧測試
├─ pages/                     頁面層（route → component）
│  ├─ WeatherPage.tsx         天氣頁（/）
│  ├─ SettingsPage.tsx        設定頁（/settings）
│  └─ NotFoundPage.tsx        404（*）
├─ components/
│  ├─ layout/                 頁面外框：AppShell / AppHeader / AppFooter
│  ├─ common/                 跨頁面共用：ErrorBoundary / ErrorNotice / EmptyState / Spinner / UnitToggle
│  ├─ search/                 SearchPanel / RecentLocations
│  └─ weather/                CurrentConditions / ForecastSection / WeatherIcon / WeatherSkeleton
├─ hooks/                     useAsyncResource / useWeather / useLocationSearch / useCurrentLocation / …
├─ api/
│  ├─ callOptions.ts          # 呼叫共用選項（目前只有 AbortSignal）
│  ├─ errors.ts               # AppError：把各種失敗正規化成 10 種 kind
│  ├─ http.ts                 # fetch 包裝：逾時、取消、狀態碼 → AppError
│  ├─ cache.ts                # 記憶體 TTL 快取
│  ├─ index.ts                # 工廠：唯一組裝資料來源的地方
│  ├─ weatherProvider.ts      # port：預報
│  ├─ openMeteoProvider.ts    # adapter：Open-Meteo 預報
│  └─ geocoding/
│     ├─ geocoder.ts            # port：地名搜尋（地名 → 座標）
│     ├─ reverseGeocoder.ts     # port：反向地理編碼（座標 → 地名）
│     ├─ openMeteoGeocoder.ts   # adapter：Open-Meteo 地名
│     ├─ nominatimGeocoder.ts   # adapter：OSM Nominatim（搜尋 + 反查，共用節流器）
│     ├─ fallbackGeocoder.ts    # 裝飾器：查無結果才切換來源
│     ├─ expandedGeocoder.ts    # 裝飾器：改用其他寫法再試
│     ├─ cachedGeocoder.ts      # 裝飾器：TTL 快取
│     └─ queryVariants.ts       # 查詢字串變體規則
├─ types/                     Location、WeatherSnapshot（與資料來源無關的領域模型）
├─ utils/                     格式化、單位換算、WMO 天氣代碼、網址狀態
├─ styles/global.css          全域樣式與設計 token
└─ test/setup.ts              測試環境設定
```

### 路由

| 路徑 | 頁面 | 說明 |
| --- | --- | --- |
| `/` | `WeatherPage` | 天氣頁，選取的城市放在查詢參數 |
| `/settings` | `SettingsPage` | 設定頁 |
| `*` | `NotFoundPage` | 找不到頁面時的 404 |

```
<AppShell>            ← 版面外框（頁首、導覽、頁尾），所有頁面共用
├─ index  → <WeatherPage />
└─ settings → <SettingsPage />
```

**新增一個頁面只要兩步**：

1. 在 `pages/` 底下寫一個元件
2. 在 `app/router.tsx` 加一條 `<Route>`

`App.tsx`、外框、其他頁面都不需要動 —— 這就是把頁面從 `App` 拆出來的目的。

**路徑與查詢參數的分工**：

- 路徑代表「是哪一個頁面」（`/`、`/settings`）
- 查詢參數代表「這個頁面的狀態」（`?lat=…&lon=…` = 目前選取的城市）

導覽時刻意保留查詢參數，否則使用者從設定頁回到天氣頁會看到空白畫面。

### 資料流

```
URL ?lat=..&lon=..          ← 「目前顯示哪個城市」的唯一真實來源
      │
      ▼
  WeatherPage ──── useSearchParams / parseLocationFromSearch
      │
      ├─ 網址列沒有城市？
      │     └─► useCurrentLocation ──► Geolocation API（座標）
      │                                      │
      │                                      ▼
      │                              ReverseGeocoder（座標 → 地名）
      │                                      │
      │                                      └──► 寫回網址列
      │
      ├─ useWeather(provider, location, units) ──► api/weatherProvider
      │        └─ useAsyncResource：狀態機 + AbortController + 請求序號
      │
      └─ SearchPanel ──► useLocationSearch ──► api/geocoding（快取→備援→展開）
                                    │
                                    └──► 選中 → setSearchParams（寫回網址列）
```

---

## 資料來源與一個真實的坑

### 天氣：Open-Meteo

- 端點：`https://api.open-meteo.com/v1/forecast`
- 免註冊、免 API key，一次請求即可拿到即時觀測 + 7 天預報
- 回傳 WMO 天氣代碼（語意跨國一致），不用處理在地化字串
- 官方文件：<https://open-meteo.com/en/docs>

### 地名：Open-Meteo Geocoding + OSM Nominatim（備援）

- 端點：`https://geocoding-api.open-meteo.com/v1/search` /
  `https://nominatim.openstreetmap.org/search`
- 兩個都免註冊、免 API key、開放 CORS
- Nominatim 是 OpenStreetMap 官方服務，使用條款：
  <https://operations.osmfoundation.org/policies/nominatim/>

**這裡有一個實測才會發現的坑**：Open-Meteo 的地名索引是「名稱索引」，
各語言的收錄完整度不一，中文對台灣地名尤其不齊。實測結果：

| 查詢 | Open-Meteo（`language=zh`） | Nominatim |
| --- | --- | --- |
| 台北 | ✗ | ✓ 臺北市 |
| 台北市 | ✓ 台北市 | ✓ |
| 台中 | ✗ | ✗（但「台中市」✓）|
| 桃園 | ✗ | ✗（但「桃園市」✓）|
| 高雄 | ✓ | ✗（但「高雄市」✓）|
| 臺中 | ✗（但「臺中市」✓）| ✗（但「臺中市」✓）|
| 香港 / 東京 / 北京 | ✓ | ✓ |

也就是說：**使用者最直覺的輸入（打「台北」）剛好落在他們查不到的位置**。
三種解法與取捨：

1. **改用全站瀏覽器體驗** —— 不做處理，使用者搜不到台中。
2. **自己維護一份地名對照表** —— 資料會過期，且要處理全球地名，不合理。
3. **用「查詢展開 + 備援來源」補上缺口** —— ✅ 採這個。

因此搜尋鏈會在查無結果時做兩件事：**改用其他寫法再試**（`台中 → 台中市 → 臺中 → 臺中市`），
以及**改用第二個地名來源**。兩者結合後，上面表格中的所有地名都能查到
（`src/api/liveApi.test.ts` 就是拿這些案例做真實 API 驗證）。

> **為什麼不做簡繁轉換或拼音？** 兩者都需要一份不小的字典，
> 對「補上台灣地名缺口」這個需求來說太重了；只做「加『市』」與「台 ↔ 臺」
> 這兩種最保守的寫法變體，就涵蓋了絕大多數情況。

### Nominatim 的四個實作細節

1. **User-Agent**：Nominatim 會以 `403` 拒絕 `User-Agent: node` 的請求
   （Node 內建 `fetch` 的預設值就是它）。程式裡雖然有設定自己的 UA，
   但 `User-Agent` 是 Fetch spec 的 forbidden header name，**瀏覽器會直接忽略**
   並改帶自己的瀏覽器 UA + Referer —— 也就是說這行只影響 Node 環境（測試 / 未來若做 SSR）。
2. **頻率限制**：條款要求最多 1 request/second。`nominatimGeocoder` 內部用一個
   閉包變數記錄上次請求時間，確保兩次請求至少間隔 1 秒；
   **搜尋與反查共用同一個實例，因此共用同一個節流器** ——
   這個限制是針對整個服務的，不是針對單一端點。
   加上 debounce 與 TTL 快取，實際使用時對它的請求非常稀疏。
3. **反向查詢回傳的是「最近的物件」**：拿台中的座標去反查，回來的可能是
   「台灣野村」這棟辦公大樓，而不是「臺中市」。因此城市名要從
   `address.city` / `address.town` / `address.state` … 這些行政層級欄位取，
   並且用**輸入的座標**（使用者所在位置）而不是反查物件的座標去查天氣。
4. **反查結果有 TTL 快取**：同一組座標永遠對應同一個地方。
   這除了省下重複請求，也讓 React StrictMode 重複執行 effect 時不會多打上游
   （取消檢查放在發出請求之前，快取則放在節流之後檢查，兩個機制一起擋）。

---

## 關鍵設計決策與取捨

### 1. 頁面獨立於 App，並且有路由

**決策**：`App.tsx` 只做組裝，頁面放在 `pages/`，路由集中在 `app/router.tsx`。

**理由**：
- 把整頁 markup 塞在 `App` 裡，之後每加一個頁面都要回頭改同一個檔案，
  而且「頁面」與「版面外框」會糾纏在一起。
- 有了路由，網址列才能同時表達「在哪一頁」與「這個頁面的狀態」，
  新增頁面時不必重新發明狀態編碼方式。

**代價**：多了一個 `react-router-dom` 相依，以及「導覽時要保留查詢參數」這類
容易被忽略的細節（實際上踩過一次：從設定頁回天氣頁城市消失）。

### 2. 不引入 Redux / Zustand

**決策**：狀態管理只用 React 內建能力（`useState` / `useReducer` / `useMemo` / Context）。

**理由**：跨元件的狀態其實只有三份 —— 使用者偏好（單位、最近瀏覽）、
介面色調、以及各頁面自己的資料（搜尋結果、天氣）。
前者用 Context 提供，後者留在頁面的 hook 裡。
引入狀態管理套件會多一個相依、多一套心智模型，卻換不到任何可觀察的收益。

**代價**：若未來要加「多城市面板」「地圖模式」「跨分頁同步」，
再引入 Zustand 或 Context + reducer 都不難 —— 狀態已經收斂在 `app/` 與 `hooks/` 中，遷移成本低。

### 3. Context 的使用邊界

**決策**：只有「跨頁面、而且無法用 props 表達」的狀態才放 Context，目前是三個：
資料來源服務、使用者偏好、介面色調。

**理由**：資料來源必須是同一個實例（內部有快取，外框與頁面都要用）；
偏好必須跨頁面一致（否則在設定頁刪掉一筆最近瀏覽、天氣頁不會更新）；
色調則是「天氣頁算得出來、外框要用的」。

**代價**：context 與 Provider 分成兩個檔案（`.ts` + `.tsx`），
否則 React Fast Refresh 會因為混合匯出而退化成整頁重載。

### 4. 自製 `useAsyncResource` 狀態機

**決策**：不用 `useState<{ loading, data, error }>`，改用 `useReducer` 表達狀態機。

**理由**：兩件事。
- **狀態組合會爆炸**：`loading && error && data` 是合法的嗎？用三個 boolean 表達
  遠端資料的狀態，合法組合有 8 種，其中一半沒有意義。
- **競態**：使用者快速切換城市時，晚回來的舊請求會覆蓋新請求的結果。

實作上用**雙重保險**：`AbortController`（新請求發出時中止舊請求，省頻寬）
加上**請求序號**（即使舊請求已經送出，回應序號不符也直接丟棄）。

另外把 `loading` 與 `isRefreshing` 分開：切換城市時保留上一次的資料繼續顯示，
只顯示「更新中…」，不會整頁閃爍成骨架屏。

### 5. 三個 port，而不是一個大 provider

**決策**：`WeatherProvider`（預報）、`Geocoder`（地名搜尋）、
`ReverseGeocoder`（座標反查地名）分開定義。

**理由**：見[資料來源](#資料來源與一個真實的坑) —— 兩者的上游服務、使用條款、
失敗模式都不同。反查又是第三種能力（只有 Nominatim 做得到）。
實作上的直接結果是：**備援只在「查無結果」時觸發，不在「服務故障」時觸發**。
「這個地名沒有收錄」和「天氣服務掛了」是兩件完全不同的事，UI 也該給不同的訊息。

### 6. 錯誤正規化成 `AppError`

**決策**：把 fetch 的各種失敗（逾時、離線、404、429、5xx、JSON 解析失敗…）
正規化成 8 種 `kind`。

**理由**：UI 依 `error.kind` 決定訊息與是否提供「重試」，不必到處 `instanceof`
判斷原生錯誤型別。原始錯誤保留在 `cause`，除錯時不會丟失脈絡。

### 7. 全域錯誤邊界

**決策**：用 `ErrorBoundary` 包住整個應用程式。

**理由**：React 的錯誤處理是「往下」的：沒有邊界的話，元件在 render 中拋出的例外
會讓整棵樹 unmount，使用者只會看到一片空白，連「發生什麼事」都不知道。
加了邊界之後，最壞的情況是畫面中央出現一段可讀的訊息，並提供重試按鈕。

注意：錯誤邊界只處理 render / lifecycle 階段的例外，
資料抓取失敗是另一套機制（`api/errors.ts` 的 `AppError`）。

### 8. 單位換算放在 provider 邊界

**決策**：向 API 固定請求攝氏 / km-h，換算在 provider 內完成，
**領域模型永遠是使用者選擇的單位**。

**理由**：UI 層不需要到處判斷單位，格式化函式也只需要接收一個單位參數。
換成別的資料來源時，只要維持「回傳使用者單位」這個契約，上層完全不用改。

### 9. 網址列是頁面狀態的唯一真實來源

**決策**：「目前選取的地點」只存在網址列的查詢參數裡
（`?lat=&lon=&name=&region=&country=&cc=`），不做雙向綁定。

**理由**：讓每個天氣頁面都能直接分享、重新整理後停在同一個城市，
而且不必另外設計狀態同步機制。

**代價**：
- 使用者手動改網址列時，畫面不會即時反應（刻意不做雙向綁定）。
- 換頁時必須保留查詢參數，否則會遺失選取的城市 —— 這點有寫在
  `AppHeader` 的註解裡，也補了瀏覽器實測。
- 網址帶上 `region` / `country` / `cc`，是為了讓「分享出去的連結」
  和「本人看到的畫面」一致（否則重新整理後少了行政區副標）。

### 10. localStorage 一律容錯

**決策**：所有讀寫包在 `try/catch`，讀出時用 `revive` 驗證格式。

**理由**：隱私瀏覽器或配額用盡時 `localStorage` 會直接拋錯；
而且使用者可以手動改內容，不能盲信。驗證失敗就退回預設值。

### 11. 搜尋的四道防線

| 機制 | 解決的問題 |
| --- | --- |
| debounce 300ms | 每敲一個字就打一次 API |
| 最少 2 字 | 打一個字就送出無意義的請求 |
| AbortController + 請求序號 | 舊回應覆蓋新回應的競態 |
| TTL 快取 5 分鐘 | 重複查詢、反覆打上游（同時降低 Nominatim 的請求頻率） |

### 12. 沒有搜尋時，預設顯示當地天氣

**決策**：使用者還沒搜尋任何城市時，直接用瀏覽器的 Geolocation API
取得所在位置，顯示那個城市的天氣。

**理由**：天氣 App 的第一個問題永远是「我這裡現在怎麼樣」。
先要求使用者打字才能看到天氣，是把工具的門檻設得太高。

**實作上的三個決定**：

- **定位失敗不該是死路**：權限被拒絕或瀏覽器不支援時，
  退回「請搜尋城市」的空狀態，並說明原因，而不是丟一個錯誤。
  反查（座標 → 地名）失敗也只會讓地名顯示「目前位置」，天氣照樣看得到。
- **自動定位到的城市要寫回網址列**：網址列描述的永遠是畫面上顯示的那個地方，
  分享出去的連結才會是對的內容；重新整理也不會再問一次定位。
- **反查需要第三個 port**：瀏覽器只給座標，沒有地名。
  Open-Meteo 沒有反向查詢，所以這件事只有 Nominatim 能做，
  於是定義 `ReverseGeocoder` 介面 —— 不塞進 `Geocoder`，
  免得用 optional method 表達「這個來源做不了」。

**代價**：

- 首次進入會跳出瀏覽器的定位授權提示。
- 定位與天氣 API 都要求**安全上下文**（HTTPS 或 localhost）。
- 為了避免「同一個地方被換成等價物件就重新打一次 API」，
  `useWeather` 改成以**座標**（而不是地點物件的身分）判斷是否需要重新查詢。

---

## 錯誤處理

所有對外的錯誤都被正規化成 `AppError`，並對應到使用者看得懂的訊息：

| kind | 觸發情況 | 使用者看到的訊息 | 是否有重試 |
| --- | --- | --- | --- |
| `network` | 離線 / DNS / CORS 被擋 | 無法連線至服務，請檢查網路連線後再試 | ✅ |
| `timeout` | 超過 10 秒 | 連線逾時，請稍後再試 | ✅ |
| `aborted` | 請求被取代或元件卸載 | （不顯示，使用者已主動切換） | — |
| `notFound` | HTTP 404 | 找不到相符的地點，請試試其他關鍵字 | — |
| `rateLimited` | HTTP 429 | 查詢過於頻繁，請稍後再試 | ✅ |
| `server` | HTTP 5xx | 天氣服務暫時無法使用，請稍後再試 | ✅ |
| `parse` | 回應不是合法 JSON / 缺必要欄位 | 資料格式無法解析 | ✅ |
| `permissionDenied` | 定位權限被拒絕 | 無法取得你的位置（權限被拒絕），請改用搜尋選擇城市 | — |
| `unsupported` | 瀏覽器不支援定位 / 無法取得位置 | 目前無法取得你的位置，請改用搜尋選擇城市 | — |
| `unknown` | 其他 | 發生未預期的錯誤，請稍後再試 | ✅ |

設計原則：

- **查無結果不是錯誤**：搜尋查不到地名是正常結果，UI 顯示提示而非紅色錯誤。
- **錯誤會保留舊資料**：重新整理失敗時，上一次的天氣仍然顯示，錯誤另外以橫幅呈現。
- **逾時是必要的**：沒有 timeout 的 fetch 會永遠掛著，畫面就永遠停在 loading。
- **render 層級的例外**另有 `ErrorBoundary` 接住，不會讓整頁變空白。

---

## 狀態管理

| 狀態 | 放在哪 | 生命週期 |
| --- | --- | --- |
| 顯示哪個城市 | 網址列查詢參數（`utils/urlState.ts`） | 可分享、可重新整理 |
| 使用者所在位置 | `hooks/useCurrentLocation.ts`（頁面生命週期，結果會寫回網址列） | 頁面生命週期 |
| 單位偏好 | `app/preferences.ts` → `hooks/useUnits` → localStorage | 持久化、跨頁面 |
| 最近瀏覽 | `app/preferences.ts` → `hooks/useRecentLocations` → localStorage | 持久化、跨頁面 |
| 資料來源服務 | `app/dataSources.ts` | App 生命週期（單一實例，快取有效）|
| 介面色調 | `app/tone.ts` | 隨天氣頁回報更新 |
| 搜尋結果 | `hooks/useLocationSearch` → `useAsyncResource` | 頁面生命週期 |
| 天氣資料 | `hooks/useWeather` → `useAsyncResource` | 頁面生命週期 |
| 搜尋關鍵字 | `SearchPanel` 的 `useState` | 元件生命週期 |

原則：**能用元件內狀態解決的就不往上放；能放上層的就不要放進全域**。
需要跨頁面共享的三件事（偏好、資料來源、色調）用 Context 提供，
其餘狀態留在各頁面的 hook 裡。

---

## 測試

```bash
npm test                        # 64 個測試
LIVE_API_TESTS=1 npm test       # 額外跑打真實 API 的煙霧測試（+4）
```

| 類型 | 涵蓋內容 |
| --- | --- |
| 轉換層測試 | Open-Meteo / Nominatim 的原始回應 → 領域模型的對應、欄位清理、非聚落層級過濾、反查取城市名 |
| 裝飾器測試 | 備援只在查無結果時切換、快取命中與過期、查詢展開的嘗試次數 |
| 狀態機測試 | `useAsyncResource` 的 loading / success / error / aborted 轉換與競態 |
| 定位測試 | 定位成功／反查失敗降級／權限被拒絕／瀏覽器不支援／未啟用時不請求 |
| 元件測試 | `SearchPanel` 的搜尋、選取、字數不足、錯誤與重試 |
| 路由測試 | 每個路徑對應到正確的頁面、版面外框包覆、未知路徑的 404 |
| 網址狀態測試 | 地點 ↔ 查詢參數的編碼 / 還原、缺欄位時的容錯 |
| 純函式測試 | 單位換算、WMO 天氣代碼對應 |
| 真實 API 測試 | 端到端驗證「台北 / 台中 / 桃園 / 高雄 / 臺中」都能查得到、反查得到城市名、天氣資料正確 |

真實 API 測試預設是 **skip** 的：一般 CI 不該依賴外網，
需要時用 `LIVE_API_TESTS=1` 啟用。

---

## 無障礙與響應式

- 搜尋框使用 `role="combobox"` + `aria-expanded` / `aria-activedescendant`，
  結果清單使用 `role="listbox"` / `role="option"`，螢幕閱讀器可正確朗讀與操作
- 錯誤訊息使用 `role="alert"`，會立即朗讀
- 載入狀態使用 `role="status"`
- 主要導覽使用 `<nav aria-label="主要導覽">`，目前頁面以 `aria-current` 標示
- 所有圖示為純 SVG 且標記 `aria-hidden`，資訊不只靠圖示傳達
- 單位切換使用 `aria-pressed` 表達選取狀態
- 位於 `<main>` / `<article>` 內的元素刻意不用 `<header>`，避免與頁首的
  banner 角色衝突
- 單欄 / 雙欄在 880px 斷點切換，行動裝置可用

---

## 已知限制與下一步

**已知限制**

1. **Nominatim 的使用條款**：官方要求「最多 1 request/second」且不得大量自動查詢。
   純前端無法自訂 `User-Agent`（瀏覽器禁止），也無法在前端做嚴格的全域限流。
   本 App 已用 debounce + TTL 快取 + 請求間隔控制把頻率壓到很低，
   但**正式產品應由後端代理**，在伺服器端設定固定的 User-Agent 與限流。
2. **時區**：當地時間取自天氣 API 回傳的 IANA 時區，換算交給 `Intl.DateTimeFormat`。
   名稱搜尋來源的時區欄位為空（不影響顯示，天氣 API 會自行回傳）。
3. **沒有離線支援**：沒有 Service Worker，也沒有快取天氣資料到 localStorage。
4. **定位的隱私與環境限制**：首次進入會跳出瀏覽器的定位授權提示；
   定位與天氣 API 都要求安全上下文（HTTPS 或 localhost）。
   正式產品通常會把「使用我的位置」做成明確的按鈕，而不是自動索取權限。
5. **單一語系**：文案與 WMO 天氣代碼的說明都是繁體中文寫死在程式碼裡，
   還沒有 i18n 架構。
6. **路由使用 History API**：部署到靜態託管時需要設定 SPA fallback
   （`vite preview` 預設已支援；GitHub Pages 需要加 `404.html` 轉址）。

**如果繼續做下去，會依這個順序**

1. 後端 BFF：代理 Nominatim（處理 UA 與限流）、快取天氣資料、做 API key 管理
2. 離線：Service Worker + 快取最近查詢過的天氣資料
3. i18n：把文案抽成 locale 資源（`describeWeather` 已經把天況集中在一處，改造範圍可控）
4. 測試補完：`useWeather` 的元件級測試、視覺回歸測試

---

## 環境變數

全部都有合理的預設值，**不設定也能直接跑**。

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `VITE_WEATHER_PROVIDER` | `open-meteo` | 天氣資料來源 id |
| `VITE_GEOCODING_LANGUAGE` | `zh` | 地名搜尋語言（ISO 639-1） |
| `VITE_GEOCODING_FALLBACK` | `on` | 設為 `off` 可關閉 Nominatim 備援，只用 Open-Meteo 地名索引 |
