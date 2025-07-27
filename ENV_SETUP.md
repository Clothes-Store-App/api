# Hướng dẫn cấu hình Environment Variables

## Tạo file .env

Tạo file `.env` trong thư mục gốc của backend với nội dung sau:

```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=milk_store_db
DB_NAME_TEST=milk_store_test_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_RESET_PASSWORD_SECRET=your_jwt_reset_password_secret_key_here

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password

# Admin Configuration
ADMIN_EMAIL=admin@milkstore.com
ADMIN_PASSWORD=admin123

# Cloudinary Configuration
API_CLOUD_NAME=your_cloudinary_cloud_name
API_CLOUD_KEY=your_cloudinary_api_key
API_SECRET_CLOUD_KEY=your_cloudinary_api_secret

# AI Service Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Client URLs
URL_CLIENT_BASE=http://localhost:3000
URL_CLIENT_BASE_PROD=https://your-production-domain.com
URL_EXPO_DEV=http://192.168.20.106:8081
URL_EXPO_GO=http://192.168.20.106:8081

# VNPay Configuration
VNP_TMN_CODE=WVHCBEIS
VNP_HASH_SECRET=G835F4FT2LR70GPLQLDMVYRIJHN2YUPT
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# VNPay Return URLs (cần cập nhật theo IP/domain thực tế)
VNP_RETURN_URL=http://192.168.20.106:8000/api/payments/vnpay-return
VNP_IPN_URL=http://192.168.20.106:8000/api/payments/process-ipn
VNP_CALLBACK_URL=http://192.168.20.106:8000/api/payments/handle-callback

# Server Configuration
PORT=8000
HOST=0.0.0.0
NODE_ENV=development
```

## Các biến quan trọng cho VNPay

### VNP_TMN_CODE và VNP_HASH_SECRET
- Đây là thông tin được cấp bởi VNPay
- Hiện tại đang sử dụng sandbox credentials
- Cho production, cần thay đổi thành credentials thật

### VNP_RETURN_URL
- URL mà VNPay sẽ redirect về sau khi thanh toán
- Phải là URL public mà VNPay có thể truy cập
- Có thể sử dụng ngrok để test: `ngrok http 8000`

### VNP_IPN_URL
- URL cho Instant Payment Notification
- VNPay sẽ gọi URL này để thông báo kết quả thanh toán
- Cũng phải là URL public

## Cách test với ngrok

1. Cài đặt ngrok:
```bash
npm install -g ngrok
```

2. Chạy ngrok:
```bash
ngrok http 8000
```

3. Cập nhật VNP_RETURN_URL và VNP_IPN_URL với URL ngrok:
```env
VNP_RETURN_URL=https://abc123.ngrok.io/api/payments/vnpay-return
VNP_IPN_URL=https://abc123.ngrok.io/api/payments/process-ipn
VNP_CALLBACK_URL=https://abc123.ngrok.io/api/payments/handle-callback
```

## Troubleshooting

### Lỗi "VNP_HASH_SECRET is undefined"
- Kiểm tra file .env có tồn tại không
- Kiểm tra VNP_HASH_SECRET có được set đúng không
- Restart server sau khi thay đổi .env

### Lỗi "VNP_TMN_CODE is not configured"
- Kiểm tra VNP_TMN_CODE trong file .env
- Đảm bảo không có khoảng trắng thừa

### Callback không hoạt động
- Kiểm tra VNP_RETURN_URL có đúng không
- Đảm bảo server accessible từ internet
- Sử dụng ngrok để test 