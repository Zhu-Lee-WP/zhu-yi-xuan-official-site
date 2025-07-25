// 檔案路徑: netlify/functions/query-stock.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;

    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        const stockData = await response.json();

        // 將 n8n 回傳的庫存資料，整理成一個方便查詢的格式 { "SKU": "庫存數量", ... }
        const stockMap = stockData.reduce((map, item) => {
            map[item.SKU] = item.庫存數量;
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