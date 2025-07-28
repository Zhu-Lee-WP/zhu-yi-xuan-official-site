// 檔案路徑: netlify/functions/ecpay-map-return.js (全新版本 - Redirect 流程)
const querystring = require('querystring');

exports.handler = async (event, context) => {
  // 只處理來自綠界的 POST 請求
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 解析綠界回傳的門市資料
  const storeData = querystring.parse(event.body);

  // 產生一段 HTML，內容包含一個腳本
  // 這個腳本的任務是：
  // 1. 將門市資料存入 sessionStorage
  // 2. 將頁面導回結帳頁
  const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>處理中...</title>
      <meta charset="utf-8">
      <script>
        (function() {
          try {
            // 將綠界回傳的門市物件轉換成字串，存入 sessionStorage
            const storeJson = ${JSON.stringify(storeData)};
            sessionStorage.setItem('ecpayStoreData', JSON.stringify(storeJson));

            // 將使用者導回到結帳頁面
            window.location.replace('/coffee/checkout.html');

          } catch (e) {
            console.error('處理綠界回傳資料時發生錯誤:', e);
            // 如果出錯，也可以導回首頁或顯示錯誤訊息
            document.body.innerHTML = '<h1>處理過程中發生錯誤，請重試。</h1>';
          }
        })();
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