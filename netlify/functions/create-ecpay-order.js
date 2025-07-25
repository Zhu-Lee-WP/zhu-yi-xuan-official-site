// 檔案路徑: netlify/functions/create-ecpay-order.js

const fetch = require('node-fetch');
const crypto = require('crypto');

/**
 * 產生綠界 API 所需的 CheckMacValue (此部分與上一部相同)
 */
function generateCheckMacValue(params, hashKey, hashIV) {
    const sortedKeys = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    let checkString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    checkString = `HashKey=${hashKey}&${checkString}&HashIV=${hashIV}`;
    let encodedString = encodeURIComponent(checkString).toLowerCase();
    encodedString = encodedString.replace(/'/g, "%27").replace(/~/g, "%7e").replace(/%20/g, "+");
    const hash = crypto.createHash('sha256').update(encodedString).digest('hex');
    return hash.toUpperCase();
}


// ============== 接下來是我們這次的重點 ==============

// Netlify Function 的主處理函式
exports.handler = async function(event, context) {
  // 1. 只接受 POST 請求
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 2. 從前端請求中解析出購物車和物流資訊
    //    我們預期前端會傳來 { cart: [...], logisticsType: 'CVS' or 'HOME', storeInfo: {...} }
    const { cart, logisticsType, storeInfo } = JSON.parse(event.body);

    // 3. 從 Netlify 環境變數中安全地讀取金鑰
    const merchantID = process.env.ECPAY_MERCHANT_ID;
    const hashKey = process.env.ECPAY_HASH_KEY;
    const hashIV = process.env.ECPAY_HASH_IV;
    // process.env.URL 是 Netlify 提供的變數，代表您網站的網址
    const returnURL = `${process.env.URL}/.netlify/functions/ecpay-return`;

    // 4. 組合綠界需要的訂單參數
    const merchantTradeNo = `BAMBOO${Date.now()}`; // 產生獨一無二的訂單編號
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); // 計算總金額
    const itemName = cart.map(item => `${item.name} x ${item.quantity}`).join('#'); // 將所有品項組合成一個字串
    const tradeDate = new Date().toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei', hour12: false, year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/-/g, '/'); // 格式化為 yyyy/MM/dd HH:mm:ss

    let orderParams = {
      MerchantID: merchantID,
      MerchantTradeNo: merchantTradeNo,
      MerchantTradeDate: tradeDate,
      PaymentType: 'aio', // 固定填 aio
      TotalAmount: totalAmount,
      TradeDesc: '竹意軒咖啡工坊線上訂單',
      ItemName: itemName,
      ReturnURL: returnURL, // 付款完成後，綠界會將使用者導回的網址
      ChoosePayment: 'ALL', // 讓綠界顯示所有可用付款方式
      EncryptType: 1,       // 固定填 1
    };

    // 5. [與您範例同步] 呼叫 n8n Webhook 來預先建立訂單紀錄
    const payloadToN8n = {
        merchantTradeNo: merchantTradeNo,
        itemName: itemName,
        totalAmount: totalAmount,
        tradeDate: tradeDate,
        status: 'PENDING', // 初始狀態為待付款
        logisticsType: logisticsType === 'CVS' ? 'CVS' : 'HOME',
        ...(logisticsType === 'CVS' && storeInfo && { storeInfo: storeInfo })
    };
    try {
      // ！！！請將此處換成您自己「建立訂單」的 n8n webhook URL！！！
      const n8n_create_order_webhook = 'https://BambooLee-n8n-free.hf.space/webhook/c188e2c1-6492-40de-9cf6-9e9d865c9fb5'; 
      await fetch(n8n_create_order_webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToN8n),
      });
      console.log(`[N8N] 已成功觸發訂單建立: ${merchantTradeNo}`);
    } catch (n8nError) {
      console.error('[N8N] 觸發訂單建立時發生錯誤:', n8nError);
      // 即使 n8n 失敗，我們仍繼續金流流程，確保顧客可以付款
    }

    // 6. 呼叫我們自己的函式來產生檢查碼
    const checkMacValue = generateCheckMacValue(orderParams, hashKey, hashIV);

    // 7. 將所有訂單參數和檢查碼回傳給前端
    return {
      statusCode: 200,
      body: JSON.stringify({
        orderData: orderParams,
        checkMacValue: checkMacValue,
        // 綠界測試環境的付款頁面網址
        paymentUrl: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut'
      })
    };

  } catch (error) {
    console.error('create-ecpay-order function 發生錯誤:', error);
    return { statusCode: 500, body: JSON.stringify({ error: `伺服器內部錯誤: ${error.message}` }) };
  }
};