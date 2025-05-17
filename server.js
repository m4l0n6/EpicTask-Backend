require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');

const { bootstrap } = require('./config/bootstrap');
 
connectDB();  

const app = express();
app.use(
  cors({
    origin: ["https://epic-task-frontend.vercel.app", "http://localhost:5173"], // Thêm localhost
    methods: ["GET", "POST", "PUT", "DELETE"], // Các phương thức HTTP được phép
    credentials: true, // Cho phép cookies và credentials
    allowedHeaders: ["Content-Type", "Authorization", "user-id", "telegram-data", "x-development-mode"], // Thêm 'telegram-data' và 'x-development-mode' ở đây
  })
);
app.use(express.json());

app.use((err, req, res, next) => {
  console.error("💥 Lỗi Server (middleware sớm):", err.stack || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error - Lỗi máy chủ nội bộ',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions'
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'khóa-bí-mật-rất-mạnh',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Sử dụng secure trong môi trường production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Quan trọng cho cookie giữa các site
      domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
    }
  })
);


const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const badgeRoutes = require('./routes/badgeRoutes');


app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/badges', badgeRoutes);


const PORT = process.env.PORT || 3000;

const cleanupSessions = async () => {
  const now = new Date();
  await Session.deleteMany({ expiresAt: { $lt: now } }); // Xóa session hết hạn
};
setInterval(cleanupSessions, 24 * 60 * 60 * 1000); // Chạy mỗi ngày

const startApp = async () => {
  try {
    console.log('--- [server.js] Chuẩn bị gọi hàm bootstrap ---');
    await new Promise((resolve, reject) => {
      bootstrap((err) => {  
        if (err) {
          console.error("❌ Lỗi nghiêm trọng từ bootstrap, không thể khởi động server:", err);
          return reject(err); 
        }
        console.log('--- [server.js] Hàm bootstrap đã thực thi xong ---');
        resolve();  
      });
    });
    console.log('--- [server.js] Bootstrap hoàn thành, chuẩn bị chạy server Express ---');

    app.listen(PORT, () => {
      console.log(`-------------------------------------------------------`);
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
      console.log(` Môi trường: ${process.env.NODE_ENV || "development"}`);
      console.log(` (Nhấn CTRL+C để dừng server)`);
      console.log(`-------------------------------------------------------`);
    });

  } catch (error) {
    console.error("❌ Không thể khởi động ứng dụng do lỗi trong quá trình bootstrap hoặc server:", error);
    process.exit(1); 
  }
};
startApp();
