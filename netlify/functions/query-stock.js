// netlify/functions/query-stock.js
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const url = process.env.N8N_STOCK_WEBHOOK_URL;

  try {
    if (!url) {
      throw new Error('環境變數 N8N_STOCK_WEBHOOK_URL 沒有設定');
    }

    const resp = await fetch(url);
    const status = resp.status;
    const statusText = resp.statusText;
    const contentType = resp.headers.get('content-type') || '';
    const text = await resp.text(); // 先用 text() 拿原始字串

    // 先把狀態、Content-Type、前 500 個字印出來，幫助我們判斷
    console.log('n8n response status:', status, statusText);
    console.log('n8n content-type:', contentType);
    console.log('n8n raw text (first 500 chars):', text.slice(0, 500));

    if (!resp.ok) {
      throw new Error(`n8n 回傳非 200：${status} ${statusText}`);
    }

    // 嘗試把 text 轉成 JSON
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      // 如果不是合法 JSON，就直接丟錯，並把 text 印在上面讓我們知道長什麼樣
      throw new Error('n8n 回傳不是合法 JSON，請檢查 n8n Respond to Webhook 設定');
    }

    // 允許兩種格式：
    // A) raw = [{ SKU: "...", stock: 0 }, ...]
    // B) raw = { data: "[{ \"SKU\": \"...\", \"stock\": 0 }, ...]" }
    let list;

    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw.data === 'string') {
      list = JSON.parse(raw.data);
    } else if (raw && Array.isArray(raw.data)) {
      list = raw.data; // 有些人會直接回 { data: [ ... ] }
    } else if (raw && raw.json && Array.isArray(raw.json)) {
      // n8n 有時候會回 { json: [ ... ] }
      list = raw.json;
    } else {
      throw new Error('無法辨識 n8n 回傳的資料格式（不是陣列，也不是 { data: ... }）');
    }

    // 轉成 { SKU: stock } 對照表
    const stockMap = list.reduce((acc, item) => {
      // 兼容 n8n 常見的 { json: {...} } 包法
      const row = item.json ? item.json : item;
      if (row && row.SKU) {
        acc[row.SKU] = Number(row.stock) || 0;
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
      body: JSON.stringify({ error: err.message }),
    };
  }
};