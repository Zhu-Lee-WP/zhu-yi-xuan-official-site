// 檔案路徑: netlify/functions/query-stock.js (最終兼容版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;
    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        
        const n8nResponseData = await response.json();

        // 【重要修正】無論 n8n 回傳的是單一物件還是陣列，我們都強制將它變成陣列
        const stockDataList = Array.isArray(n8nResponseData) ? n8nResponseData : [n8nResponseData];

        // 將庫存清單轉換成方便查詢的 { SKU: stock } 格式
        const stockMap = stockDataList.reduce((map, item) => {
            // 從 item 中找到我們需要的乾淨資料 (item 本身或 item.json)
            const cleanItem = item.json || item; 
            
            if (cleanItem && cleanItem.SKU && cleanItem.庫存數量 !== undefined) {
                map[cleanItem.SKU] = cleanItem.庫存數量;
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