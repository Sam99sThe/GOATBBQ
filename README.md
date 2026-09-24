# G.O.A.T 家烤肉 — 3D 大象烤肉俱樂部

## 本機運行

需要 Node.js 22+。第一次執行 `npm ci`，之後執行 `npm start`，瀏覽 http://localhost:3000。

目前為本機開發版。所有 3D 修改尚未上傳 GitHub，也沒有部署 Render；必須等使用者確認全部調整完成後再上傳與部署。

## 已整合

- Three.js 真正 3D 場景：可拖曳旋轉、滾輪縮放、全景／烤網視角。
- 每人一隻完整大象，五個固定位置、原本約 8.97 秒的 Idle 骨架動畫，沒有行走。
- Park BBQ Grill 烤爐、Outdoor kitchen and grill 戶外環境，保留原始貼圖。
- ToxaGrom 食物包：暫用鮮魚、牛肉、雞腿、烤魚；點右上食物上架，點 3D 食物翻面／吃掉，也可從烤網清單以鍵盤操作。
- 伺服器維持五人上限、同步食物、翻面、熟度、烤焦與搶食。每面 65% 可吃，145% 烤焦。
- 右下聊天室保留最近 50 則；新訊息同步成半透明頭頂泡泡與彈幕。泡泡跟隨 3D 大象投影位置，6 秒後消失。彈幕可關閉。
- Credits 按鈕列出四組模型的正確作者、原始頁面、CC BY 4.0 連結及修改說明。詳見 ATTRIBUTION.md / credits.json。

## 模型位置

使用者原始 ZIP：assets/avatars/（不會由網站公開提供，也不會被自動加入 Git）。
網頁轉檔：assets/models/ready/*.glb。
原始贴圖：assets/models/elephant/textures、park/textures、food/textures，以及 outdoor/model/Sauna_5M_fixed_tex.jpg。

Elephant Idle.fbx 的作者為 GremorySaiyan。Source 截圖裡 Cesar Salcedo CG 的大象是另一款模型；此版本不使用它。meat-collections.zip 未整合。

戶外廚房是高面數攝影測量模型，轉檔後約 48 MB；目前先保留原形進行本機場景驗收，部署前可再依視覺確認做壓縮。

## 驗證

`npm test`：五人上限、溢出分桌、共用食物、授權、座位釋出、聊天同步、字數／頻率限制、3D 資產路由與 Credits。

## 執行與部署限制

單一 Node.js 執行個體，房間保存在記憶體。離線保留座位 45 秒，重啟後房間清空。Render 免費服務可能休眠；啟動指令 `npm start`，安裝指令 `npm ci`，健康檢查 `/health`。render.yaml 只保留設定，不會自行部署。
