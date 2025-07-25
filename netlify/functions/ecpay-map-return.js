// 檔案路徑: netlify/functions/ecpay-map-return.js (最終優化版 - postMessage)
const querystring = require('querystring');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const storeData = querystring.parse(event.body);

  const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>處理中...</title>
      <meta charset="utf-8">
      <script>
        window.onload = function() {
          const message = {
            action: 'ecpayStoreSelected',
            store: ${JSON.stringify(storeData)}
          };
          // 使用 postMessage 將資料「喊話」給開啟此視窗的父視窗
          window.opener.postMessage(message, '*');
          // 關閉自己
          window.close();
        };
      </script>
    </head>
    <body><p>資料處理中，請稍候...</p></body>
    </html>
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: htmlResponse,
  };
};