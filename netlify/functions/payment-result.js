// 檔案路徑: netlify/functions/payment-result.js (智慧判斷版)

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const params = new URLSearchParams(event.body);
    const rtnCode = params.get('RtnCode');
    const orderNumber = params.get('MerchantTradeNo');
    const siteUrl = process.env.URL;

    let redirectUrl;

    // 【重要】判斷付款是否成功
    if (rtnCode === '1') {
      // 付款成功，導向感謝頁面
      redirectUrl = `${siteUrl}/coffee/thankyou.html?order=${orderNumber}`;
    } else {
      // 付款失敗或取消，導向失敗頁面
      redirectUrl = `${siteUrl}/coffee/payment-failure.html`;
    }

    // 回傳 302 Redirect 指令，讓瀏覽器跳轉到對應的網址
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl,
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