// 檔案路徑: netlify/functions/query-stock.js (最終穩健版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOO_URL;

    // ▼▼▼ 【偵錯日誌】我們在這裡將要使用的網址完整印出來 ▼▼▼
    console.log(`[偵錯] 準備呼叫的 n8n 庫存網址為: "${n8nStockWebhookUrl}"`);

    try {
        if (!n8nStockWebhookUrl) {
            throw new Error('N8N_STOCK_WEBHOOK_URL 環境變數未設定或為空');
        }

        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        
        const n8nResponseData = await response.json();

        // 【重要修正】在處理資料前，先檢查它是不是一個陣列
        if (!Array.isArray(n8nResponseData)) {
            console.warn('[警告] n8n 回傳的庫存資料不是一個有效的陣列，可能庫存表為空。回傳一個空的庫存物件。');
            // 如果不是陣列 (例如 n8n 出錯或回傳空物件)，我們就直接回傳一個空的庫存 map
            return {
                statusCode: 200,
                body: JSON.stringify({}),
            };
        }

        const stockDataList = n8nResponseData.map(item => item.json);

        const stockMap = stockDataList.reduce((map, item) => {
            // 確保 item 和相關屬性存在
            if (item && item.SKU && item.庫存數量 !== undefined) {
                map[item.SKU] = item.庫存數量;
            }
            return map;
        }, {});

        return {
            statusCode: 200,
            body: JSON.stringify(stockMap),
        };

    } catch (error) {
        console.error('query-stock function 發生錯誤:', error);
        return { statusCode: 500, body: JSON.stringify({ error: '無法取得庫存資訊' }) };
    }
};