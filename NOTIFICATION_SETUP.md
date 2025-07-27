# Hướng dẫn sử dụng Notification System

## Tổng quan

Hệ thống notification đã được cập nhật để hỗ trợ tất cả users (không chỉ admin) đăng ký push token và nhận thông báo về đơn hàng của mình.

## Các thay đổi chính

### 1. Backend Changes

**NotificationService.js:**
- `saveAdminPushToken` → `saveUserPushToken` (cho tất cả users)
- `removeAdminPushToken` → `removeUserPushToken`
- `sendNotificationToAdmins` → `sendNotificationToUsers`
- Thêm `sendNotificationToUser` (gửi cho 1 user cụ thể)
- Giữ lại `sendNotificationToAdmins` cho backward compatibility

**Routes:**
- Bỏ middleware `isAdmin` check
- Tất cả authenticated users đều có thể đăng ký push token
- Thêm route test notification cho user cụ thể

**OrderService.js:**
- Thêm notification khi tạo đơn hàng mới
- Thêm notification khi cập nhật trạng thái đơn hàng
- Message tùy chỉnh theo từng trạng thái

### 2. Frontend Changes

**NotificationContext.tsx:**
- Thêm xử lý các loại notification khác nhau
- Auto-navigation khi tap vào notification
- **Tự động đăng ký push token khi user login**
- **Tự động hủy đăng ký khi user logout**
- Logging chi tiết cho debugging

## Các loại Notification

### 1. NEW_ORDER
- **Người nhận:** Admin users
- **Mục đích:** Thông báo có đơn hàng mới
- **Data:** `{ type: 'NEW_ORDER', orderId, total }`

### 2. ORDER_CREATED
- **Người nhận:** User đã đặt hàng
- **Mục đích:** Xác nhận đơn hàng đã được tạo
- **Data:** `{ type: 'ORDER_CREATED', orderId, total }`

### 3. ORDER_STATUS_UPDATED
- **Người nhận:** User sở hữu đơn hàng
- **Mục đích:** Thông báo cập nhật trạng thái đơn hàng
- **Data:** `{ type: 'ORDER_STATUS_UPDATED', orderId, status, oldStatus }`
- **Messages theo trạng thái:**
  - `pending`: "Đơn hàng #X của bạn đang chờ xử lý"
  - `processing`: "Đơn hàng #X của bạn đang được xử lý"
  - `shipping`: "Đơn hàng #X của bạn đang được giao hàng"
  - `delivered`: "Đơn hàng #X của bạn đã được giao thành công"
  - `cancelled`: "Đơn hàng #X của bạn đã bị hủy"
  - `completed`: "Đơn hàng #X của bạn đã hoàn thành"

### 4. PAYMENT_SUCCESS
- **Người nhận:** User đã thanh toán
- **Mục đích:** Xác nhận thanh toán thành công
- **Data:** `{ type: 'PAYMENT_SUCCESS', orderId, total }`

### 5. TEST
- **Người nhận:** Tất cả users
- **Mục đích:** Test notification system
- **Data:** `{ type: 'TEST' }`

## API Endpoints

### Đăng ký Push Token
```http
POST /api/notifications/register-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

### Hủy đăng ký Push Token
```http
POST /api/notifications/unregister-token
Authorization: Bearer <token>
```

### Test Notification cho tất cả users
```http
POST /api/notifications/test-notification
```

### Test Notification cho user cụ thể
```http
POST /api/notifications/test-notification/:userId
Content-Type: application/json

{
  "title": "Test Notification",
  "body": "This is a test notification"
}
```

## Cách sử dụng

### 1. Đăng ký Push Token (Frontend - Tự động)
```typescript
// Tự động được gọi trong NotificationContext khi user login
// Không cần gọi thủ công
```

### 2. Gửi Notification cho User (Backend)
```javascript
// Gửi notification cho user cụ thể
await NotificationService.sendNotificationToUser(
  userId,
  'Đơn hàng đã được tạo',
  'Đơn hàng #123 của bạn đã được tạo thành công',
  { type: 'ORDER_CREATED', orderId: 123 }
);

// Gửi notification cho tất cả users
await NotificationService.sendNotificationToUsers(
  'Thông báo chung',
  'Có cập nhật mới từ hệ thống',
  { type: 'GENERAL' }
);
```

### 3. Cập nhật trạng thái đơn hàng (Backend)
```javascript
// Tự động gửi notification khi cập nhật trạng thái
const updatedOrder = await orderService.updateOrder({
  id: orderId,
  status: 'processing'
});

// Hoặc sử dụng class method
const updatedOrder = await orderService.updateOrderStatus(orderId, 'shipping');
```

### 4. Xử lý Notification Response (Frontend)
```typescript
// Tự động được xử lý trong NotificationContext
// Khi user tap vào notification, sẽ navigate đến screen tương ứng
```

## Flow hoạt động

### 1. User Login
```
User login → AuthContext login() → 
└── NotificationContext useEffect() → registerTokenWithServer()
```

### 2. Tạo đơn hàng
```
User đặt hàng → createOrder() → 
├── Gửi notification cho admin (NEW_ORDER)
└── Gửi notification cho user (ORDER_CREATED)
```

### 3. Cập nhật trạng thái đơn hàng
```
Admin cập nhật status → updateOrder() → 
└── Gửi notification cho user (ORDER_STATUS_UPDATED)
```

### 4. Thanh toán thành công
```
Payment success → handlePaymentSuccess() → 
└── Gửi notification cho user (PAYMENT_SUCCESS)
```

### 5. User Logout
```
User logout → AuthContext logout() → 
└── NotificationContext useEffect() → unregisterTokenWithServer()
```

## Testing

### Test với script
```bash
# Test notification system
cd APP-BAN-HANG/Milk-Store-BE
node scripts/test-notification.js

# Test order status notification
node scripts/test-order-status-notification.js

# Test login notification registration
node scripts/test-login-notification.js
```

### Test với API
```bash
# Test đăng ký token
curl -X POST http://localhost:8000/api/notifications/register-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"}'

# Test gửi notification
curl -X POST http://localhost:8000/api/notifications/test-notification/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Test notification"}'

# Test cập nhật trạng thái đơn hàng
curl -X PUT http://localhost:8000/api/orders/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'
```

## Troubleshooting

### Push Token không được đăng ký
1. **Kiểm tra user đã login chưa**
   - Log: `👤 User logged in, registering push token for user: X`
   - Nếu không có log này, user chưa login

2. **Kiểm tra token có hợp lệ không**
   - Format: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
   - Kiểm tra Expo project ID

3. **Kiểm tra logs backend**
   - API call có thành công không
   - Database có lưu token không

### Notification không đến
1. **Kiểm tra push token có được lưu trong database không**
   ```sql
   SELECT id, email, push_token FROM users WHERE id = <user_id>;
   ```

2. **Kiểm tra Expo project ID có đúng không**
   - Trong `app.config.js` và backend config

3. **Kiểm tra device có kết nối internet không**
   - Test với Expo push notification tool

### Navigation không hoạt động
1. **Kiểm tra route name có đúng không**
   - `orders`, `cart-tab`, etc.

2. **Kiểm tra navigation context có được setup đúng không**
   - `NotificationProvider` phải wrap trong navigation

3. **Kiểm tra data trong notification có đúng format không**
   - `orderId`, `type`, etc.

### Status update notification không gửi
1. **Kiểm tra order có user_id không**
   ```sql
   SELECT id, user_id, status FROM orders WHERE id = <order_id>;
   ```

2. **Kiểm tra trạng thái có thay đổi không**
   - Log: `oldStatus !== newStatus`

3. **Kiểm tra user có push token không**
   - Log: `⚠️ No push token found for user X`

### Login không đăng ký token
1. **Kiểm tra NotificationContext có được import đúng không**
   - Trong `_layout.tsx`

2. **Kiểm tra useAuth hook có hoạt động không**
   - `isAuthenticated` và `user` có đúng không

3. **Kiểm tra useEffect dependency**
   - `[isAuthenticated, user, expoPushToken]`

## Database Schema

### Users Table
```sql
ALTER TABLE users ADD COLUMN push_token VARCHAR(255);
```

### Index
```sql
CREATE INDEX idx_users_push_token ON users(push_token);
```

## Production Deployment

1. **Cập nhật Expo Project ID** trong app.config.js
2. **Cấu hình Expo Access Token** cho production
3. **Test notification system** trước khi deploy
4. **Monitor notification delivery** trong Expo dashboard
5. **Test order status updates** với real orders
6. **Test login/logout flow** để đảm bảo token registration 