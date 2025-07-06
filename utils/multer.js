const multer = require('multer');

// Sử dụng memory storage vì sẽ upload lên Cloudinary
const storage = multer.memoryStorage();

// Kiểm tra file type
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh!'), false);
  }
};

// Cấu hình cơ bản cho multer
const multerConfig = {
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
};

// Khởi tạo multer với cấu hình cơ bản
const upload = multer(multerConfig);

// Middleware cho upload single
const uploadSingle = (fieldName) => upload.single(fieldName);

// Middleware cho product images
const uploadProductImages = upload.array('images', 10); // Cho phép tối đa 10 ảnh

// Wrap middleware để xử lý lỗi
const handleProductImages = (req, res, next) => {
  uploadProductImages(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ 
        message: 'Lỗi upload file', 
        error: err.message 
      });
    } else if (err) {
      return res.status(400).json({ 
        message: 'Lỗi không xác định', 
        error: err.message 
      });
    }
    next();
  });
};

module.exports = {
  upload,
  uploadSingle,
  uploadProductImages: handleProductImages
};
