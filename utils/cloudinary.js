const { Readable } = require("stream");
const { v2: cloudinary } = require("cloudinary");
const fs = require('fs');
const streamifier = require('streamifier');

// Load Cloudinary API keys từ biến môi trường
cloudinary.config({
    cloud_name: process.env.API_CLOUD_NAME,
    api_key: process.env.API_CLOUD_KEY,
    api_secret: process.env.API_SECRET_CLOUD_KEY,
});

/**
 * Upload file lên Cloudinary
 * @param {Object} file - File upload từ Multer
 * @param {string} folder - Thư mục trên Cloudinary
 * @param {string} fileName - Tên file trên Cloudinary
 * @returns {Promise<string>} - URL của ảnh đã upload
 */
const uploadToCloudinary = (file, folder = '', public_id = '') => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: folder,
            resource_type: 'auto'
        };

        if (public_id) {
            uploadOptions.public_id = public_id;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );

        // Chuyển buffer thành stream và pipe vào uploadStream
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
};

/**
 * Xóa ảnh trên Cloudinary theo URL
 * @param {string} imageUrl - Đường dẫn ảnh trên Cloudinary
 */
const deleteFromCloudinary = async (url) => {
    try {
        // Lấy public_id từ URL
        const splitUrl = url.split('/');
        const filename = splitUrl[splitUrl.length - 1];
        const public_id = filename.split('.')[0];

        // Xóa file từ Cloudinary
        const result = await cloudinary.uploader.destroy(public_id);
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary
};
