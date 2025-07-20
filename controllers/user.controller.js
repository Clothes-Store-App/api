const userService = require("../services/user.service");
const sendResponse = require("../utils/responseFormatter");
const { MESSAGE } = require("../constants/messages");
const { STATUS } = require("../constants/httpStatusCodes");

const getAll = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.GET_SUCCESS, users);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const create = async (req, res) => {
  try {
    // Cho phép nhận phone nếu có
    const user = await userService.createUser(req.body);
    sendResponse(res, STATUS.CREATED, MESSAGE.SUCCESS.CREATED, user);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

const update = async (req, res) => {
  try {
    const imageFile = req.file; // Lấy file từ multer
    const userData = req.body;
    // Cho phép nhận phone nếu có
    // Validate dữ liệu cơ bản
    if (Object.keys(userData).length === 0 && !imageFile) {
      return sendResponse(
        res,
        STATUS.BAD_REQUEST,
        'Không có dữ liệu để cập nhật',
        null,
        false
      );
    }
    const updatedUser = await userService.updateUser(
      req.params.id,
      userData,
      imageFile
    );
    // Loại bỏ password khỏi response
    const { password, ...userWithoutPassword } = updatedUser.toJSON();
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.UPDATED, userWithoutPassword);
  } catch (error) {
    sendResponse(
      res,
      STATUS.BAD_REQUEST,
      error.message,
      null,
      false,
      error.message
    );
  }
};

const remove = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    sendResponse(res, STATUS.SUCCESS, MESSAGE.SUCCESS.DELETED);
  } catch (error) {
    sendResponse(
      res,
      STATUS.SERVER_ERROR,
      MESSAGE.ERROR.INTERNAL,
      null,
      false,
      error.message
    );
  }
};

// Controller xử lý quên mật khẩu
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return sendResponse(
        res,
        STATUS.BAD_REQUEST,
        'Email là bắt buộc',
        null,
        false
      );
    }

    const result = await userService.handleForgotPassword(email);
    sendResponse(res, STATUS.SUCCESS, result.message);
  } catch (error) {
    sendResponse(
      res,
      STATUS.BAD_REQUEST,
      error.message,
      null,
      false
    );
  }
};

// Controller xác thực mã reset password
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log("aaaaa", email, code);
    if (!email || !code) {
      return sendResponse(
        res,
        STATUS.BAD_REQUEST,
        'Email và mã xác thực là bắt buộc',
        null,
        false
      );
    }

    const result = await userService.verifyResetCode({email, code});
    console.log("result", result);
    sendResponse(res, STATUS.SUCCESS, 'Xác thực thành công', result);
  } catch (error) {
    console.log("error", error);
    sendResponse(
      res,
      STATUS.BAD_REQUEST,
      error.message,
      null,
      false
    );
  }
};

// Controller đặt lại mật khẩu
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return sendResponse(
        res,
        STATUS.BAD_REQUEST,
        'Token và mật khẩu mới là bắt buộc',
        null,
        false
      );
    }

    if (newPassword.length < 6) {
      return sendResponse(
        res,
        STATUS.BAD_REQUEST,
        'Mật khẩu phải có ít nhất 6 ký tự',
        null,
        false
      );
    }

    const result = await userService.resetPassword(resetToken, newPassword);
    sendResponse(res, STATUS.SUCCESS, result.message);
  } catch (error) {
    sendResponse(
      res,
      STATUS.BAD_REQUEST,
      error.message,
      null,
      false
    );
  }
};

// Thêm controller xóa ảnh user
const deleteImage = async (req, res) => {
  try {
    const result = await userService.deleteUserImage(req.params.id);
    sendResponse(res, STATUS.SUCCESS, result.message);
  } catch (error) {
    sendResponse(
      res,
      STATUS.BAD_REQUEST,
      error.message,
      null,
      false
    );
  }
};

// Thêm controller đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // Validate input
    if (!oldPassword || !newPassword) {
      return sendResponse(
        res,
        STATUS.BAD_REQUEST,
        'Mật khẩu cũ và mật khẩu mới là bắt buộc',
        null,
        false
      );
    }

    const result = await userService.changePassword(req.user.id, oldPassword, newPassword);
    sendResponse(res, STATUS.SUCCESS, result.message);
  } catch (error) {
    sendResponse(
      res,
      STATUS.BAD_REQUEST,
      error.message,
      null,
      false
    );
  }
};

const ApiUserController = {
  getAll,
  create,
  update,
  remove,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  deleteImage,
  changePassword // Thêm vào exports
};

module.exports = ApiUserController; 