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
    const text = await resp.text(); // 先拿字串

    console.log('n8n response status:', status, statusText);
    console.log('n8n content-type:', contentType);
    console.log('n8n raw text (first 500 chars):', text.slice(0, 500));

    if (!resp.ok) {
      throw new Error(`n8n 回傳非 200：${status} ${statusText}`);
    }

    let raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new Error('n8n 回傳不是合法 JSON，請檢查 n8n Respond to Webhook 設定');
    }

    // ====== 關鍵：把所有我們可能遇到的型態都吃下來 ======
    let list;

    if (Array.isArray(raw)) {
      // 1) 直接是陣列
      list = raw;
    } else if (raw && raw.SKU !== undefined) {
      // 2) 你現在的情況：單一物件
      list = [raw];
    } else if (raw && typeof raw.data === 'string') {
      // 3) { data: "JSON字串" }
      list = JSON.parse(raw.data);
    } else if (raw && Array.isArray(raw.data)) {
      // 4) { data: [ ... ] }
      list = raw.data;
    } else if (raw && raw.json && Array.isArray(raw.json)) {
      // 5) { json: [ ... ] }
      list = raw.json;
    } else if (raw && Array.isArray(raw.items)) {
      // 6) { items: [ { json: {...} }, ... ] } 之類
      list = raw.items.map(i => i.json || i);
    } else {
      throw new Error('無法辨識 n8n 回傳的資料格式（不是陣列、不是單一物件、也不是 { data: ... }）');
    }

    // 轉成 { SKU: stock } 對照表
    const stockMap = list.reduce((acc, item) => {
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
