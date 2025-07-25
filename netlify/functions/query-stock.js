// 檔案路徑: netlify/functions/query-stock.js (最終修正版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;

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

        // 【重要修正】從 n8n 回傳的物件中，只取出 "data" 這個屬性，它才是真正的陣列
        const stockDataList = n8nResponseData.data;

        // 在處理資料前，再次檢查 stockDataList 是不是一個有效的陣列
        if (!Array.isArray(stockDataList)) {
            console.warn('[警告] 從 n8n 解析出的庫存資料不是一個有效的陣列。');
            return {
                statusCode: 200,
                body: JSON.stringify({}),
            };
        }

        // 現在 stockDataList 就是一個單純的清單，可以安全地使用 .reduce()
        const stockMap = stockDataList.reduce((map, item) => {
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