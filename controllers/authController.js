const User = require('../models/User');  
const LeaderboardService = require('../services/leaderboardService');  
const { LOGIN_TOKEN_REWARD, STREAK_BONUS_MULTIPLIER } = require('../config/constants');
const gamificationService = require('../services/gamificationService');
const crypto = require('crypto');

// Hàm xác thực data từ Telegram WebApp
function validateTelegramWebAppData(initData, botToken) {
  const data = new URLSearchParams(initData);
  const dataToCheck = [...data.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataToCheck)
    .digest('hex');

  return hash === data.get('hash');
}

const createUsername = (telegramData) => {
  if (telegramData.username) {
    return telegramData.username;
  }
  return `${telegramData.first_name || ''} ${telegramData.last_name || ''}`.trim() || `user${telegramData.id}`;
};

const telegramLoginOrRegister = async (req, res, next) => {
  console.log('\n--- [authController] Running telegramLoginOrRegister ---');
  console.log('[authController] Request Body:', req.body);
  const userData = req.body.user;  

  if (!userData || !userData.id) {
    return res.status(400).json({ message: 'Missing Telegram user data.' });
  }

  // Thêm đoạn mã kiểm tra initData trước khi xử lý
  if (!validateTelegramWebAppData(req.body.initData, process.env.TELEGRAM_BOT_TOKEN)) {
    return res.status(401).json({ message: 'Invalid Telegram WebApp data' });
  }

  try {
    const telegramId = String(userData.id);  
    let user = await User.findOne({ telegramId: telegramId });
    let isNewUser = false;

    if (user) {
      console.log(`[authController] Found existing user: ${user.id}`);
      let updated = false;
      if (userData.username && user.username !== userData.username) {
        user.username = userData.username;
        updated = true;
      }
      if (userData.photo_url && user.avatar !== userData.photo_url) {
        user.avatar = userData.photo_url;
        updated = true;
      }
      if (updated) {
        await user.save();  
        console.log(`[authController] User ${user.id} info updated.`);
      }
    } else {
      console.log(`[authController] Creating new user for telegramId: ${telegramId}`);
      user = new User({
        telegramId: telegramId,
        username: userData.username,
        avatar: userData.photo_url,
        tokens: 0,
      });
      await user.save();
      isNewUser = true;
      console.log(`[authController] New user created with ID: ${user.id}`);
      await LeaderboardService.updateScore(user.id, 0); 
    }
    req.session.userId = user.id;  
    req.session.save((err) => {
        if (err) {
            console.error('[authController] Error saving session:', err);
            return next(new Error('Failed to save session after login.')); 
        }
        console.log(`[authController] Session saved for userId: ${user.id}`);
        const userProfile = user.toObject();        
        res.status(isNewUser ? 201 : 200).json(userProfile); 
    });


  } catch (error) {
    console.error('[authController] Error during login/register:', error);
    next(error); 
  }
};

const handleTelegramAuth = async (req, res) => {
  const telegramData = req.body; // Dữ liệu Telegram từ frontend
  const username = createUsername(telegramData);

  // Lưu hoặc cập nhật người dùng trong cơ sở dữ liệu
  const user = await User.findOneAndUpdate(
    { telegramId: telegramData.id },
    { username, ...otherData },
    { upsert: true, new: true }
  );

  res.json(user);
};

const processDailyLogin = async (req, res, next) => {
  try {
    const userId = req.user.id; // Đảm bảo middleware đã gắn `req.user`
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    const lastLogin = user.lastDailyLogin ? new Date(user.lastDailyLogin) : null;
    const isFirstLogin = !lastLogin || lastLogin.toDateString() !== today.toDateString();

    if (isFirstLogin) {
      user.lastDailyLogin = today;
      user.tokens += 5; // Thêm token
      await user.save();
      return res.status(200).json({ isFirstLogin: true, tokensAwarded: 5 });
    }

    // Nếu không phải lần đăng nhập đầu tiên trong ngày
    return res.status(200).json({
      isFirstLogin: false,
      tokensAwarded: 0,
      currentStreak: user.dailyLoginStreak || 0,
    });
  } catch (error) {
    console.error('Error processing daily login:', error);
    next(error);
  }
};

module.exports = {
  telegramLoginOrRegister,
  processDailyLogin,
  handleTelegramAuth
};