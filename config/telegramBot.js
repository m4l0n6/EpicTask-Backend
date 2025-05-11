require('dotenv').config();
const { Telegraf } = require('telegraf');

console.log('--- [telegramBot.js] Đang khởi tạo ---');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

 
console.log('[telegramBot.js] Trạng thái TELEGRAM_BOT_TOKEN:', BOT_TOKEN ? `Đã tìm thấy (bắt đầu bằng ${BOT_TOKEN.substring(0, 10)}...)` : 'KHÔNG TÌM THẤY trong file .env');

let botInstance = null;  

if (!BOT_TOKEN) {
  console.warn('⚠️ [telegramBot.js] TELEGRAM_BOT_TOKEN chưa được đặt trong .env. Chức năng bot sẽ bị vô hiệu hóa.');
} else {
  try {
    botInstance = new Telegraf(BOT_TOKEN);
    botInstance.catch((err, ctx) => {
      console.error(`❌ [telegramBot.js] Lỗi Telegraf cho loại cập nhật ${ctx.updateType}:`, err);
     
    });

    console.log('🤖 [telegramBot.js] Đối tượng Telegraf đã được khởi tạo thành công.');

  } catch (error) {
    console.error('❌ [telegramBot.js] LỖI NGHIÊM TRỌNG khi khởi tạo Telegraf:', error);
  
    botInstance = null;
  }
}

module.exports = botInstance;