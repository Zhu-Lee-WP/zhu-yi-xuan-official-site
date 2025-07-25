// 檔案路徑: netlify/functions/query-stock.js (偵錯加強版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;

    // ▼▼▼ 【偵錯日誌】我們在這裡將要使用的網址完整印出來 ▼▼▼
    console.log(`[偵錯] 準備呼叫的 n8n 庫存網址為: "${n8nStockWebhookUrl}"`);

    try {
        // 如果網址不存在或為空，就直接回報錯誤
        if (!n8nStockWebhookUrl) {
            throw new Error('N8N_STOCK_WEBHOOK_URL 環境變數未設定或為空');
        }

        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        const stockData = await response.json();

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