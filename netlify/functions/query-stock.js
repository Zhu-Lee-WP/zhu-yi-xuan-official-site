// 檔案：netlify/functions/query-stock.js
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const n8nStockWebhookUrl = process.env.N8N_STOCK_WEBHOOK_URL; // 記得在 Netlify 環境變數設定好

  try {
    const resp = await fetch(n8nStockWebhookUrl);
    if (!resp.ok) {
      throw new Error(`n8n stock query failed: ${resp.status} ${resp.statusText}`);
    }

    const raw = await resp.json();

    // ↓↓↓ 這裡是關鍵：同時相容兩種情況 ↓↓↓
    // 情況 A：n8n 直接回「陣列」：[{ SKU: "...", stock: 0 }, ...]   ← 你現在是這個
    // 情況 B：n8n 回 { data: "[{ \"SKU\": \"...\", \"stock\": 0 }, ...]" }（字串包 JSON）
    let stockList;

    if (Array.isArray(raw)) {
      stockList = raw;
    } else if (raw && typeof raw.data === 'string') {
      stockList = JSON.parse(raw.data);
    } else {
      throw new Error('無法辨識 n8n 回傳的資料格式');
    }

    // 轉成 { "prod_001_half-pound": 0, ... } 的對照表，前端比較好查
    const stockMap = stockList.reduce((acc, item) => {
      if (item && item.SKU) {
        acc[item.SKU] = Number(item.stock) || 0;
      }
      return acc;
    }, {});

    return {
      statusCode: 200,
      body: JSON.stringify(stockMap),
    };
  } catch (err) {
    console.error('query-stock function 發生錯誤:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '無法取得庫存資訊' }),
    };
  }
};
