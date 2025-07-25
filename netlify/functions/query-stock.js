// 檔案路徑: netlify/functions/query-stock.js (最終修正版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;

    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        
        // n8n 回傳的是一個包含 "json" 屬性的物件陣列，例如 [{ json: { SKU: '...', ... } }]
        const n8nResponseData = await response.json();

        // 【重要修正】我們先「拆開包裹」，只取出每一項的 "json" 部分
        const stockDataList = n8nResponseData.map(item => item.json);

        // 現在 stockDataList 就是一個單純的清單，可以安全地使用 .reduce()
        const stockMap = stockDataList.reduce((map, item) => {
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