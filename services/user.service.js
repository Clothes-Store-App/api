const { User } = require('../models');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

User.hashPassword = async function(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const getAllUsers = async () => {
  return await User.findAll();
};

const createUser = async (userData) => {
  // Cho phép thêm phone nếu có
  return await User.create(userData);
};

const updateUser = async (id, userData, imageFile = null) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error('User not found');

  // Nếu có file ảnh mới
  if (imageFile) {
    try {
      // Xóa ảnh cũ nếu có
      if (user.image) {
        await deleteFromCloudinary(user.image);
      }

      // Upload ảnh mới
      const imageUrl = await uploadToCloudinary(
        imageFile,
        'users', // folder trên cloudinary
        `user_${id}_${Date.now()}` // tên file
      );

      // Cập nhật URL ảnh mới
      userData.image = imageUrl;
    } catch (error) {
      throw new Error('Lỗi khi upload ảnh: ' + error.message);
    }
  }

  // Nếu cập nhật password
  if (userData.password) {
    userData.password = await User.hashPassword(userData.password);
  }

  // Cho phép cập nhật phone nếu có
  // Cập nhật thông tin user
  return await user.update(userData);
};

const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error('User not found');
  
  return await user.destroy();
};

// Thêm hàm xóa ảnh user
const deleteUserImage = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error('User not found');

  if (user.image) {
    await deleteFromCloudinary(user.image);
    await user.update({ image: null });
  }

  return { message: 'Đã xóa ảnh thành công' };
};

// Tạo mã xác thực 6 số
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Cấu hình nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Gửi email mã xác thực
const sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Mã xác thực đặt lại mật khẩu',
    html: `
      <h2>Đặt lại mật khẩu</h2>
      <p>Mã xác thực của bạn là: <strong>${code}</strong></p>
      <p>Mã này sẽ hết hạn sau 5 phút.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    `
  };

  return await transporter.sendMail(mailOptions);
};

// Xử lý yêu cầu quên mật khẩu
const handleForgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Email không tồn tại trong hệ thống');
  }

  // Tạo mã xác thực
  const verificationCode = generateVerificationCode();
  
  // Lưu mã và thời gian tạo vào user
  await user.update({
    reset_password_code: verificationCode,
    reset_password_expires: new Date(Date.now() + 5 * 60000) // 5 phút
  });

  // Gửi email
  await sendVerificationEmail(email, verificationCode);

  return { message: 'Mã xác thực đã được gửi đến email của bạn' };
};

// Xác thực mã và tạo token reset password
const verifyResetCode = async ({email, code}) => {
  console.log("email", email);
  console.log("code", code);
  const user = await User.findOne({ where: { email } });
  console.log("user", user);
  if (!user) {
    console.log("khong co email", email);
    throw new Error('Email không tồn tại trong hệ thống');
  }

  if (!user.reset_password_code || !user.reset_password_expires) {
    console.log("khong co ma", user.reset_password_code, user.reset_password_expires);
    throw new Error('Không có yêu cầu đặt lại mật khẩu');
  }

  if (user.reset_password_code !== code) {
    console.log("sai ma", user.reset_password_code, code);
    throw new Error('Mã xác thực không đúng');
  }

  if (new Date() > user.reset_password_expires) {
    console.log("ma het han", user.reset_password_expires);
    throw new Error('Mã xác thực đã hết hạn');
  }

  // Tạo token đặt lại mật khẩu
  const resetToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_RESET_PASSWORD_SECRET,
    { expiresIn: '15m' }
  );

  // Xóa mã xác thực đã sử dụng
  await user.update({
    reset_password_code: null,
    reset_password_expires: null
  });

  console.log("resetToken", resetToken);
  return { resetToken };
};

// Đặt lại mật khẩu mới
const resetPassword = async (resetToken, newPassword) => {
  try {
    // Verify token
    const decoded = jwt.verify(resetToken, process.env.JWT_RESET_PASSWORD_SECRET);
    
    // Tìm user
    const user = await User.findOne({ where: { email: decoded.email } });
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    // Hash và cập nhật mật khẩu mới
    const hashedPassword = await User.hashPassword(newPassword);
    await user.update({ password: hashedPassword });

    return { message: 'Đặt lại mật khẩu thành công' };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token đã hết hạn');
    }
    throw error;
  }
};

// Thêm hàm đổi mật khẩu
const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('Người dùng không tồn tại');
  }

  // Kiểm tra mật khẩu cũ
  const isValidPassword = await bcrypt.compare(oldPassword, user.password);
  if (!isValidPassword) {
    throw new Error('Mật khẩu hiện tại không đúng');
  }

  // Hash và cập nhật mật khẩu mới
  const hashedPassword = await User.hashPassword(newPassword);
  await user.update({ password: hashedPassword });

  return { message: 'Đổi mật khẩu thành công' };
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  handleForgotPassword,
  verifyResetCode,
  resetPassword,
  deleteUserImage,
  changePassword // Thêm vào exports
}; 