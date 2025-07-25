// 檔案路徑: netlify/functions/payment-result.js

exports.handler = async function(event, context) {
  // 只處理來自綠界的 POST 請求
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 解析綠界 POST 過來的表單資料
    const params = new URLSearchParams(event.body);
    const orderNumber = params.get('MerchantTradeNo');

    // 取得網站的根網址
    const siteUrl = process.env.URL;

    // 準備要重新導向的、帶有訂單編號的感謝頁面網址
    const thankYouUrl = `${siteUrl}/coffee/thankyou.html?order=${orderNumber}`;

    // 回傳 302 Redirect 指令，讓瀏覽器跳轉到上面的網址
    return {
      statusCode: 302,
      headers: {
        Location: thankYouUrl,
      },
    };
  } catch (error) {
    console.error('payment-result function 發生錯誤:', error);
    // 如果發生意外，至少導回首頁
    return {
      statusCode: 302,
      headers: {
        Location: process.env.URL,
      },
    };
  }
};