// 檔案路徑: netlify/functions/query-stock.js (最終簡化版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;
    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        
        const n8nResponse = await response.json();
        const stockDataList = n8nResponse.data; // 直接取得 "data" 屬性

        if (!Array.isArray(stockDataList)) {
            throw new Error('n8n 回傳的庫存資料格式不正確');
        }

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