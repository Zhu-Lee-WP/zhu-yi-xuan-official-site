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
  // --- 步驟一：檢查並取得前端傳來的「通行證」(JWT) ---
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 如果沒有通行證，回傳錯誤，拒絕存取
    return { statusCode: 401, body: JSON.stringify({ message: '未授權：缺少憑證' }) };
  }
  const token = authHeader.split('Bearer ')[1];

  try {
    // --- 步驟二：請 Firebase 驗證通行證的真偽 ---
    const decodedToken = await admin.auth().verifyIdToken(token);
    // 如果驗證成功，decodedToken 裡就會包含使用者的資訊，例如 email
    const userEmail = decodedToken.email;

    // --- 步驟三：呼叫 n8n，並把「已驗證的 Email」傳過去 ---
    const n8nHistoryWebhookUrl = process.env.N8N_HISTORY_WEBHOOK_URL;
    if (!n8nHistoryWebhookUrl) {
        return { statusCode: 500, body: JSON.stringify({ message: '後端服務設定不完整' })};
    }

    // 將查詢請求轉發給 n8n，這次帶上的參數是 email
    const response = await fetch(`${n8nHistoryWebhookUrl}?email=${userEmail}`);
    const data = await response.json();

    // --- 步驟四：將 n8n 的回傳結果，直接回傳給前端 ---
    return {
        statusCode: 200,
        body: JSON.stringify(data)
    };

  } catch (error) {
    // 如果 Firebase 驗證通行證失敗，會進到這裡
    console.error('Token 驗證失敗或查詢出錯:', error);
    return {
        statusCode: 403,
        body: JSON.stringify({ message: '憑證無效或查詢失敗' })
    };
  }
};