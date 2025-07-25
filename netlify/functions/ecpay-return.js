// 檔案路徑: netlify/functions/ecpay-return.js (最終修正版)
const fetch = require('node-fetch');
const crypto = require('crypto');

// 驗證綠界回傳簽章的函式
function verifyCheckMacValue(data, hashKey, hashIV) {
    const sortedKeys = Object.keys(data).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    let checkString = sortedKeys.map(key => {
        // CheckMacValue 本身不加入計算
        if (key !== 'CheckMacValue') {
            return `${key}=${data[key]}`;
        }
        return '';
    }).filter(s => s !== '').join('&');

    checkString = `HashKey=${hashKey}&${checkString}&HashIV=${hashIV}`;
    
    // 將字串進行 URL 編碼，並轉為小寫
    let encodedString = encodeURIComponent(checkString).toLowerCase();
    
    // 綠界特規：將特定符號轉換回來
    encodedString = encodedString.replace(/'/g, "%27").replace(/~/g, "%7e").replace(/%20/g, "+");
    
    // 使用 sha256 加密
    const hash = crypto.createHash('sha256').update(encodedString).digest('hex');
    
    // 比對雜湊值 (忽略大小寫)
    return hash.toUpperCase() === data.CheckMacValue.toUpperCase();
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const params = new URLSearchParams(event.body);
        const data = Object.fromEntries(params.entries());
        console.log('[ecpay-return] 收到綠界回傳:', data);

        const hashKey = process.env.ECPAY_HASH_KEY;
        const hashIV = process.env.ECPAY_HASH_IV;
        
        // 1. 驗證簽章，確保訊息來自綠界且未被竄改
        if (!verifyCheckMacValue(data, hashKey, hashIV)) {
            console.error('[ecpay-return] CheckMacValue 驗證失敗');
            return { statusCode: 400, body: 'Invalid CheckMacValue' };
        }
        console.log('[ecpay-return] CheckMacValue 驗證成功');

        // 2. 如果付款成功 (RtnCode=1)，就將資料轉發到 n8n
        if (data.RtnCode === '1') {
            console.log('[ecpay-return] 付款成功，準備轉發至 n8n');
            const n8nUpdateWebhook = process.env.N8N_UPDATE_WEBHOOK_URL;
            
            await fetch(n8nUpdateWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            console.log('[ecpay-return] 已成功轉發至 n8n');
        }
        
        // 3. 無論如何，都要回傳 '1|OK' 給綠界，否則它會一直重試
        return { statusCode: 200, body: '1|OK' };

    } catch (error) {
        console.error('[ecpay-return] 發生嚴重錯誤:', error);
        // 即使出錯，也要回傳 '0|Error' 給綠界
        return { statusCode: 500, body: '0|Error' };
    }
};