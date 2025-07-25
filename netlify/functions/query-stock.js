// 檔案路徑: netlify/functions/query-stock.js (最終修正版)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL;
    try {
        const response = await fetch(n8nStockWebhookUrl);
        if (!response.ok) {
            throw new Error(`n8n stock query failed: ${response.statusText}`);
        }
        
        // 接收 n8n 回傳的、包含多個項目的陣列
        const n8nResponseArray = await response.json();

        // 檢查收到的資料是否為陣列
        if (!Array.isArray(n8nResponseArray)) {
            // 如果收到的不是陣列 (例如 n8n 出錯)，就回傳錯誤
            console.error('[錯誤] n8n 回傳的資料不是預期的陣列格式:', n8nResponseArray);
            throw new Error('n8n 回傳的庫存資料格式不正確');
        }

        // 【關鍵修正】
        // 我們遍歷陣列中的每一個項目 (item)，
        // 並從 item.json 中，只挑出我們需要的 SKU 和 庫存數量
        const stockMap = n8nResponseArray.reduce((map, item) => {
            // 確認 item.json 和需要的欄位都存在
            if (item.json && item.json.SKU && item.json.庫存數量 !== undefined) {
                map[item.json.SKU] = item.json.庫存數量;
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