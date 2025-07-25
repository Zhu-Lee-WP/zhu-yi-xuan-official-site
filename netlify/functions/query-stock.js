// 檔案路徑: netlify/functions/query-stock.js (最終版 - 處理雙層 JSON)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;
    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        
        const n8nResponse = await response.json(); // 第一次解析，得到 { data: "..." }

        // 【關鍵修正】
        // n8nResponse.data 是一段文字，我們需要用 JSON.parse() 再次解析它，才能得到真正的清單
        const stockDataList = JSON.parse(n8nResponse.data);

        // 再次檢查確保我們得到了陣列
        if (!Array.isArray(stockDataList)) {
            throw new Error('從 n8n 解析出的最終資料格式不正確，預期為陣列');
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