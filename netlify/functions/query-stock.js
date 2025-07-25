// 檔案路徑: netlify/functions/query-stock.js (最終版 - 對應乾淨的陣列)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;
    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        
        // 【重要修正】n8n 現在直接回傳乾淨的陣列，我們直接使用即可
        const stockDataList = await response.json();

        // 檢查收到的資料是否為陣列
        if (!Array.isArray(stockDataList)) {
            throw new Error('n8n 回傳的庫存資料格式不正確，預期為陣列');
        }

        // 將庫存清單轉換成方便查詢的 { SKU: stock } 格式
        const stockMap = stockDataList.reduce((map, item) => {
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