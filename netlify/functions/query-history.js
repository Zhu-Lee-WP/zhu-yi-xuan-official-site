// 檔案路徑: netlify/functions/query-history.js

const fetch = require('node-fetch');
// 引入我們剛剛安裝的 firebase-admin 工具
const admin = require('firebase-admin');

// 從 Netlify 的環境變數中讀取我們設定好的安全金鑰
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // 這段程式碼會處理私密金鑰的格式問題
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

// 使用金鑰初始化 Firebase Admin，讓我們的後端程式有權限
// if (!admin.apps.length) 這個判斷是為了防止重複初始化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 這是函式的主要進入點
exports.handler = async function(event) {
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ message: '未授權：缺少憑證' }) };
  }
  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = decodedToken.email;

    const n8nHistoryWebhookUrl = process.env.N8N_HISTORY_WEBHOOK_URL;
    if (!n8nHistoryWebhookUrl) {
        return { statusCode: 500, body: JSON.stringify({ message: '後端 n8n 網址設定不完整' })};
    }

    // --- ↓↓↓ 以下是新的、更詳細的偵錯碼 ↓↓↓ ---
    console.log("--- 開始 n8n 呼叫偵錯 ---");
    console.log("讀取到的 n8n 網址:", n8nHistoryWebhookUrl);
    const fullRequestUrl = `${n8nHistoryWebhookUrl}?email=${userEmail}`;
    console.log("準備發出的完整請求網址:", fullRequestUrl);
    
    const response = await fetch(fullRequestUrl);
    
    console.log("收到來自 n8n 的回應狀態:", response.status, response.statusText);
    const data = await response.json();
    console.log("從 n8n 收到的原始 JSON 資料:", data);
    console.log("--- 結束 n8n 呼叫偵錯 ---");
    // --- ↑↑↑ 偵錯碼結束 ↑↑↑ ---

    return {
        statusCode: 200,
        body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Token 驗證失敗或後端執行出錯:', error);
    return {
        statusCode: 403,
        body: JSON.stringify({ message: '憑證無效或查詢失敗' })
    };
  }
};