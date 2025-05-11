const mongoose = require('mongoose');
require('dotenv').config(); // Không chỉ định path, để tự động tìm trong thư mục gốc

// Kết nối đến MongoDB sử dụng URI từ file .env
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Lỗi: Biến môi trường MONGO_URI chưa được đặt.');
  process.exit(1);
}

// Import User model
const User = require('../models/User');

async function runMigration() {
  try {
    console.log('🔄 Đang kết nối tới MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Kết nối thành công. Bắt đầu migration...');
    
    // Đếm số lượng user không có trường tokens
    const usersWithoutTokens = await User.countDocuments({
      tokens: { $exists: false }
    });
    
    console.log(`Tìm thấy ${usersWithoutTokens} user không có trường tokens`);
    
    if (usersWithoutTokens > 0) {
      // Cập nhật tất cả user chưa có trường tokens
      const result = await User.updateMany(
        { tokens: { $exists: false } },
        { $set: { tokens: 0 } }
      );
      
      console.log(`Migration thành công! Đã cập nhật ${result.modifiedCount} user.`);
    } else {
      console.log('Tất cả user đã có trường tokens. Không cần thực hiện migration.');
    }
  } catch (error) {
    console.error('Lỗi trong quá trình migration:', error);
  } finally {
    // Đóng kết nối MongoDB sau khi hoàn tất
    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối MongoDB.');
  }
}

// Chạy migration
runMigration();