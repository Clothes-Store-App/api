const { User, RefreshToken } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Expo } = require('expo-server-sdk');
const { AUTH } = require('../constants/auth');
const { MESSAGE } = require('../constants/messages');

// Tạo access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: AUTH.TOKEN.ACCESS_TOKEN_EXPIRES }
  );
};

// Tạo refresh token
const generateRefreshToken = async (userId) => {
  // Tạo token
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: AUTH.TOKEN.REFRESH_TOKEN_EXPIRES }
  );

  // Tính thời gian hết hạn (30 ngày)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Lưu token vào database
  await RefreshToken.create({
    user_id: userId,
    token: refreshToken,
    is_used: false,
    expires_at: expiresAt
  });

  return refreshToken;
};

// Đăng nhập
const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error(MESSAGE.ERROR.USER_NOT_FOUND);
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error(MESSAGE.ERROR.PASSWORD_WRONG);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    },
    accessToken,
    refreshToken
  };
};

// Đăng xuất
const logout = async (userId) => {
  try {
    // Xóa push token khi đăng xuất
    await User.update(
      { push_token: null },
      { 
        where: { id: userId }
      }
    );
  } catch (error) {
    console.error('Error removing push token during logout:', error);
    // Không throw error vì đây không phải lỗi nghiêm trọng
  }
};

// Thêm hàm mới để cập nhật push token
const updatePushToken = async (userId, pushToken) => {
  await User.update(
    { push_token: pushToken },
    { where: { id: userId } }
  );
};

// Làm mới access token bằng refresh token
const refreshAccessToken = async (refreshToken) => {
  // Tìm refresh token trong database
  const tokenRecord = await RefreshToken.findOne({
    where: { token: refreshToken, is_used: false }
  });

  if (!tokenRecord) {
    throw new Error(MESSAGE.ERROR.REFRESH_TOKEN_INVALID);
  }

  // Kiểm tra refresh token có hết hạn không
  const now = new Date();
  if (now > tokenRecord.expires_at) {
    await tokenRecord.update({ is_used: true });
    throw new Error(MESSAGE.ERROR.REFRESH_TOKEN_EXPIRED);
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Tìm user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new Error(MESSAGE.ERROR.USER_NOT_FOUND);
    }

    // Đánh dấu token cũ đã sử dụng
    await tokenRecord.update({ is_used: true });

    // Tạo token mới
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error(MESSAGE.ERROR.REFRESH_TOKEN_EXPIRED);
    }
    throw new Error(MESSAGE.ERROR.REFRESH_TOKEN_INVALID);
  }
};

// Đăng ký tài khoản mới
const register = async (name, email, password, phone) => {
  // Kiểm tra email đã tồn tại chưa
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error(MESSAGE.ERROR.EMAIL_EXISTS);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Tạo user mới với role USER
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: AUTH.ROLES.USER,
    phone
  });

  // Tạo token
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    },
    accessToken,
    refreshToken
  };
};

// Lấy thông tin profile của user
const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'name', 'email', 'role', 'phone'] // Chỉ lấy các field cần thiết
  });

  if (!user) {
    throw new Error(MESSAGE.ERROR.USER_NOT_FOUND);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone
  };
};

module.exports = {
  login,
  logout,
  refreshAccessToken,
  updatePushToken,
  register,
  getProfile
}; 