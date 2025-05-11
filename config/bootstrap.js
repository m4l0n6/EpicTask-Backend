console.log('--- [bootstrap.js] Bắt đầu thực thi file ---');

require('dotenv').config(); 
const { Markup } = require('telegraf'); 
const bot = require('./telegramBot'); 

module.exports.bootstrap = async function(cb) {
  console.log('--- [bootstrap.js] Hàm bootstrap ĐƯỢC GỌI ---');

  console.log('[bootstrap.js] Giá trị biến môi trường BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? `${process.env.TELEGRAM_BOT_TOKEN.substring(0,10)}...` : 'KHÔNG CÓ TOKEN');
  console.log('[bootstrap.js] Giá trị đối tượng bot import được:', bot ? 'Đối tượng Bot hợp lệ' : 'Bot là null/undefined');

  if (!bot) {
    console.warn('⚠️ [bootstrap.js] Đối tượng Bot là null, bỏ qua thiết lập và khởi chạy Bot Telegram.');
    console.log('--- [bootstrap.js] Hàm bootstrap đã thực thi xong (Bot không khởi chạy) ---');
    return cb(); 
  }

  console.log('🚀 [bootstrap.js] Đang thiết lập các trình xử lý lệnh và khởi chạy Bot Telegram...');

  const MINI_APP_URL = process.env.MINI_APP_URL;
  if (!MINI_APP_URL) {
    console.warn('⚠️ [bootstrap.js] MINI_APP_URL chưa được đặt trong .env. Nút bấm Web App có thể không hoạt động đúng.');
  }

  bot.start(async (ctx) => {
    const firstName = ctx.from.first_name || 'bạn';
    const userId = ctx.from.id;
    const username = ctx.from.username || `(id: ${userId})`;
    const welcomeText = `👋 Chào ${firstName}! Chào mừng bạn đến với Gamified Task Tracker.\n\nHãy bắt đầu quản lý nhiệm vụ và chinh phục thử thách nào!`;
    console.log(`[bootstrap.js] Lệnh /start nhận từ User: ${userId} (${username})`);
    const keyboard = Markup.inlineKeyboard([
      MINI_APP_URL
        ? Markup.button.webApp('🎮 Mở Task Tracker', MINI_APP_URL)
        : Markup.button.callback('App chưa sẵn sàng', 'app_not_ready')
    ]);
    try {
      await ctx.reply(welcomeText, { reply_markup: keyboard.reply_markup });
      console.log(`[bootstrap.js] Đã gửi trả lời /start cho User: ${userId}`);
    } catch (error) {
      console.error(`❌ [bootstrap.js] Không thể gửi trả lời /start cho User ${userId}:`, error);
    }
  });

  bot.help((ctx) => {
    const userId = ctx.from.id;
    console.log(`[bootstrap.js] Lệnh /help nhận từ User: ${userId}`);
    ctx.reply('Gửi /start để mở ứng dụng quản lý nhiệm vụ.');
  });

 
  console.log('⏳ [bootstrap.js] Chuẩn bị bắt đầu polling...');
  try {

    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log('[bootstrap.js] Đã yêu cầu xóa webhook (nếu có).');


    bot.startPolling(); 
    console.log('✅ [bootstrap.js] Bot polling đã được yêu cầu bắt đầu!'); 
    
 

  } catch (startPollingError) {
    
    console.error('❌ [bootstrap.js] LỖI khi gọi bot.startPolling():', startPollingError);
    console.warn('⚠️ [bootstrap.js] Bot có thể không hoạt động đúng.');
     
  }

   
  process.once('SIGINT', () => {
    console.log('[bootstrap.js] Nhận tín hiệu SIGINT. Đang dừng bot...');
    bot.stop('SIGINT'); 
  });
  process.once('SIGTERM', () => {
    console.log('[bootstrap.js] Nhận tín hiệu SIGTERM. Đang dừng bot...');
    bot.stop('SIGTERM'); 
  });

   
  console.log('--- [bootstrap.js] Hàm bootstrap đã thực thi xong (đã yêu cầu startPolling) ---');
  cb(); 
};