// 檔案路徑: netlify/functions/query-stock.js (最終偵錯版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;
    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }

        const n8nResponseData = await response.json();

        // 【關鍵偵錯】在進行任何判斷前，先將收到的原始資料完整印出來
        console.log('[偵錯] 從 n8n 收到的原始資料為:', JSON.stringify(n8nResponseData, null, 2));

        // 檢查收到的資料是否為陣列
        if (!Array.isArray(n8nResponseData)) {
            throw new Error('n8n 回傳的庫存資料格式不正確，預期為陣列');
        }

        // 將庫存清單轉換成方便查詢的 { SKU: stock } 格式
        const stockMap = n8nResponseData.reduce((map, item) => {
            if (item && item.SKU && item.stock !== undefined) {
                map[item.SKU] = item.stock;
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