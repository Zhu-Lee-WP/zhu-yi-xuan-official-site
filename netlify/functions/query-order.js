// 檔案路徑: netlify/functions/query-order.js
const fetch = require('node-fetch');

exports.handler = async function(event) {
    const orderId = event.queryStringParameters.orderId;
    const n8nQueryWebhookUrl = process.env.N8N_QUERY_WEBHOOK_URL;

    if (!orderId) {
        return { statusCode: 400, body: JSON.stringify({ status: 'error', message: '缺少訂單編號' }) };
    }

    try {
        // 將查詢請求轉發給 n8n
        const response = await fetch(`${n8nQueryWebhookUrl}?orderId=${orderId}`);
        const data = await response.json();

        // 將 n8n 的回傳結果，直接回傳給前端
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ status: 'error', message: '查詢服務暫時無法使用' })
        };
    }
};