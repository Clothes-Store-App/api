const { User, RefreshToken } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { Expo } = require('expo-server-sdk');
const { AUTH } = require('../constants/auth');
const { MESSAGE } = require('../constants/messages');

// Cấu hình nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Tạo mã xác thực 6 số
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Gửi email xác thực đăng ký
const sendRegistrationVerificationEmail = async (email, code, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Xác thực tài khoản đăng ký',
    html: `
      <h2>Chào mừng ${name}!</h2>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại hệ thống của chúng tôi.</p>
      <p>Mã xác thực tài khoản của bạn là: <strong>${code}</strong></p>
      <p>Mã này sẽ hết hạn sau 10 phút.</p>
      <p>Vui lòng sử dụng mã này để kích hoạt tài khoản.</p>
    `
  };

  return await transporter.sendMail(mailOptions);
};

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

  // Kiểm tra email đã được xác thực chưa
  if (!user.email_verified) {
    throw new Error('Email chưa được xác thực. Vui lòng xác thực email trước khi đăng nhập.');
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

  // Tạo mã xác thực
  const verificationCode = generateVerificationCode();
  const verificationExpires = new Date(Date.now() + 10 * 60000); // 10 phút

  // Tạo user mới với role USER nhưng chưa xác thực email
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: AUTH.ROLES.USER,
    phone,
    email_verified: false,
    email_verification_code: verificationCode,
    email_verification_expires: verificationExpires
  });

  // Gửi email xác thực
  await sendRegistrationVerificationEmail(email, verificationCode, name);

  return {
    message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      email_verified: user.email_verified
    }
  };
};

// Xác thực email
const verifyEmail = async (email, code) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Email không tồn tại trong hệ thống');
  }

  if (user.email_verified) {
    throw new Error('Email đã được xác thực');
  }

  if (!user.email_verification_code || !user.email_verification_expires) {
    throw new Error('Không có mã xác thực');
  }

  if (user.email_verification_code !== code) {
    throw new Error('Mã xác thực không đúng');
  }

  if (new Date() > user.email_verification_expires) {
    throw new Error('Mã xác thực đã hết hạn');
  }

  // Xác thực thành công
  await user.update({
    email_verified: true,
    email_verification_code: null,
    email_verification_expires: null
  });

  // Tạo token cho user đã xác thực
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    message: 'Xác thực email thành công!',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      email_verified: true
    },
    accessToken,
    refreshToken
  };
};

// Gửi lại mã xác thực email
const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Email không tồn tại trong hệ thống');
  }

  if (user.email_verified) {
    throw new Error('Email đã được xác thực');
  }

  // Tạo mã xác thực mới
  const verificationCode = generateVerificationCode();
  const verificationExpires = new Date(Date.now() + 10 * 60000); // 10 phút

  await user.update({
    email_verification_code: verificationCode,
    email_verification_expires: verificationExpires
  });

  // Gửi email xác thực
  await sendRegistrationVerificationEmail(email, verificationCode, user.name);

  return {
    message: 'Mã xác thực mới đã được gửi đến email của bạn.'
  };
};

// Lấy thông tin profile của user
const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'name', 'email', 'role', 'phone', 'image'] // Chỉ lấy các field cần thiết
  });

  if (!user) {
    throw new Error(MESSAGE.ERROR.USER_NOT_FOUND);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    image: user.image
  };
};

module.exports = {
  login,
  logout,
  refreshAccessToken,
  updatePushToken,
  register,
  verifyEmail,
  resendVerificationEmail,
  getProfile
}; 