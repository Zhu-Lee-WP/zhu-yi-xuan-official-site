// 檔案路徑: netlify/functions/create-order.js

const fetch = require('node-fetch');
const crypto = require('crypto');

// 這個函式我們之前已經建立過，現在直接複製過來使用
function generateCheckMacValue(params, hashKey, hashIV) {
    const sortedKeys = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    let checkString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    checkString = `HashKey=${hashKey}&${checkString}&HashIV=${hashIV}`;
    let encodedString = encodeURIComponent(checkString).toLowerCase();
    encodedString = encodedString.replace(/'/g, "%27").replace(/~/g, "%7e").replace(/%20/g, "+");
    const hash = crypto.createHash('sha256').update(encodedString).digest('hex');
    return hash.toUpperCase();
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { cart, shippingMethod, recipientInfo, orderTotal } = JSON.parse(event.body);

        // 從 Netlify 環境變數中安全地讀取所有機敏資訊
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
        const merchantID = process.env.ECPAY_MERCHANT_ID;
        const hashKey = process.env.ECPAY_HASH_KEY;
        const hashIV = process.env.ECPAY_HASH_IV;
        const siteUrl = process.env.URL; // Netlify 提供的網站網址

        // 產生這次交易獨一無二的訂單編號
        const merchantTradeNo = `bamboo${new Date().getTime()}`;

        // 1. 【守門人機制】先將訂單資訊送到 n8n
        const n8nPayload = {
            orderNumber: merchantTradeNo,
            totalAmount: orderTotal,
            shippingMethod: shippingMethod,
            recipient: recipientInfo,
            cart: cart,
            status: 'PENDING_PAYMENT' // 初始狀態：待付款
        };
        
        console.log('[n8n] 準備發送訂單至 n8n:', n8nPayload);
        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload)
        });

        // 如果 n8n 沒有成功回應，就中斷流程，回傳錯誤
        const n8nResult = await n8nResponse.json();
if (!n8nResponse.ok || n8nResult.status !== 'success') {
    console.error('[錯誤] n8n 回應:', n8nResult);
    throw new Error('n8n 訂單建立失敗，未收到成功狀態');
}
        console.log('[n8n] n8n 訂單建立成功');
        
        // 2. 檢查付款方式，並執行對應操作
        const paymentMethod = recipientInfo.paymentMethod;

        if (paymentMethod === 'CreditCard') {
            // --- 信用卡付款流程 ---
            const tradeDate = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/-/g, '/');
            const itemName = cart.map(item => `${item.name} x ${item.quantity}`).join('#');

            let orderParams = {
                MerchantID: merchantID,
                MerchantTradeNo: merchantTradeNo,
                MerchantTradeDate: tradeDate,
                PaymentType: 'aio',
                TotalAmount: orderTotal,
                TradeDesc: '竹意軒咖啡工坊線上訂單',
                ItemName: itemName,
                ReturnURL: `${siteUrl}/.netlify/functions/ecpay-return`, // 付款後 Server-side 回傳位置
                OrderResultURL: `${siteUrl}/.netlify/functions/payment-result`,
                ChoosePayment: 'Credit',
                EncryptType: 1,
            };

            const checkMacValue = generateCheckMacValue(orderParams, hashKey, hashIV);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'SUCCESS',
                    paymentMethod: 'CreditCard',
                    orderData: orderParams,
                    checkMacValue: checkMacValue,
                    paymentUrl: 'https://payment.ecpay.com.tw/Cashier/AioCheckOut'
                })
            };

        } else if (paymentMethod === 'COD') {
            // --- 取貨付款流程 ---
            // 因為 n8n 已成功，我們只需要回傳成功狀態和訂單編號
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'SUCCESS',
                    paymentMethod: 'COD',
                    orderNumber: merchantTradeNo
                })
            };
        }

    } catch (error) {
        console.error('create-order function 發生錯誤:', error);
        return { statusCode: 500, body: JSON.stringify({ status: 'ERROR', message: error.message }) };
    }
};