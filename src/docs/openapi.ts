import { OpenAPIV3 } from 'openapi-types';

export const apiSpecification: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Booking App API',
    version: '1.0.0',
    description: `
    # Booking App REST API
    
    API documentation cho hệ thống đặt vé xe khách - Booking App.
    
    ## Tính năng chính
    - 🔐 Xác thực & Phân quyền
    - 👥 Quản lý người dùng
    - 📅 Quản lý đặt vé xe khách
    - 🏨 Quản lý vé xe khách
    `,
    contact: {
      name: 'API Support',
      email: 'support@bookingapp.com',
    },
    license: {
      name: 'MIT License',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.WEBSERVICE_URL || 'http://localhost:5000/api',
      description: 'Test web server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication endpoints',
    },
    {
      name: 'User',
      description: 'User management endpoints',
    },
    {
      name: 'Geography',
      description: 'Geographic information endpoints',
    },
    {
      name: 'Role',
      description: 'Role management endpoints',
    },
    {
      name: 'Permission',
      description: 'Permission management endpoints',
    },
    {
      name: 'Post',
      description: 'Post management endpoints',
    },
    {
      name: 'Category',
      description: 'Category management endpoints',
    },
    {
      name: 'Tag',
      description: 'Tag management endpoints',
    },
    {
      name: 'Route',
      description: 'Route management endpoints',
    },
    {
      name: 'Bus Stop',
      description: 'Bus stop management endpoints',
    },
    {
      name: 'Route Stop',
      description: 'Route stop management endpoints',
    },
    {
      name: 'Vehicle Type',
      description: 'Vehicle type management endpoints',
    },
    {
      name: 'Vehicle',
      description: 'Vehicle management endpoints',
    },
  ],
  paths: {
    // Authentication
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng ký tài khoản mới',
        description: 'Đăng ký tài khoản mới và gửi email xác thực',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', example: 'Password123!' },
                  gender: {
                    type: 'string',
                    enum: ['MALE', 'FEMALE'],
                    example: 'MALE',
                  },
                  phoneNumber: { type: 'string', example: '+84123456789' },
                  age: { type: 'number', example: 25 },
                  address: { type: 'string', example: 'Ho Chi Minh City' },
                },
                required: ['name', 'email', 'password', 'gender', 'phoneNumber', 'age', 'address'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Đăng ký thành công',
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
        },
      },
    },
    '/auth/verify-email/{token}': {
      post: {
        tags: ['Authentication'],
        summary: 'Xác thực email',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Email đã được xác thực',
          },
          '400': {
            description: 'Token không hợp lệ hoặc đã hết hạn',
          },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Authentication'],
        summary: 'Gửi lại email xác thực',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Đã gửi lại email xác thực',
          },
        },
      },
    },
    '/auth/check-verification-token/{token}': {
      get: {
        tags: ['Authentication'],
        summary: 'Kiểm tra token xác thực email',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Token hợp lệ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isValid: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Token không hợp lệ hoặc đã hết hạn',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng nhập',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  rememberMe: { type: 'boolean' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Đăng nhập thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        permissions: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Quên mật khẩu',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Đã gửi email khôi phục mật khẩu',
          },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Đặt lại mật khẩu',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string' },
                  confirmPassword: { type: 'string' },
                },
                required: ['token', 'password', 'confirmPassword'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Đặt lại mật khẩu thành công',
          },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Đổi mật khẩu',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password' },
                  confirmPassword: { type: 'string', format: 'password' },
                },
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Đổi mật khẩu thành công',
          },
          '400': {
            description: 'Dữ liệu không hợp lệ hoặc mật khẩu không khớp',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
        },
      },
    },
    '/auth/google': {
      get: {
        tags: ['Authentication'],
        summary: 'Đăng nhập bằng Google',
        responses: {
          '302': {
            description: 'Chuyển hướng đến trang đăng nhập Google',
          },
        },
      },
    },
    '/auth/google/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Callback URL cho đăng nhập Google',
        responses: {
          '200': {
            description: 'Đăng nhập Google thành công',
          },
        },
      },
    },
    '/auth/refresh-access-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Làm mới access token',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token đã được làm mới',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Refresh token không hợp lệ hoặc hết hạn',
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng xuất',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Đăng xuất thành công',
          },
        },
      },
    },
    '/auth/logout-all-devices': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng xuất khỏi tất cả thiết bị',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Đã đăng xuất khỏi tất cả thiết bị',
          },
        },
      },
    },
    // User
    '/users': {
      get: {
        tags: ['User'],
        summary: 'Lấy danh sách người dùng',
        description: 'Lấy danh sách người dùng với phân trang, tìm kiếm và lọc (yêu cầu quyền ADMIN_USER_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm',
          },
          {
            in: 'query',
            name: 'searchFields',
            schema: { type: 'string' },
            description: 'Các trường tìm kiếm, cách nhau bởi dấu phẩy (mặc định: name,email,phoneNumber)',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"name","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"AVAILABLE"})',
          },
          {
            in: 'query',
            name: 'returnAll',
            schema: { type: 'boolean' },
            description: 'Trả về tất cả dữ liệu (bỏ qua phân trang)',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách người dùng',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          email: { type: 'string' },
                          phoneNumber: { type: 'string' },
                          age: { type: 'number' },
                          gender: { type: 'string', enum: ['MALE', 'FEMALE'] },
                          status: { type: 'string', enum: ['AVAILABLE', 'DISABLED'] },
                          avatar: { type: 'string', nullable: true },
                          address: { type: 'string', nullable: true },
                          role: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              permissions: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    code: { type: 'string' },
                                    name: { type: 'string' },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_USER_MANAGE)',
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['User'],
        summary: 'Lấy thông tin người dùng',
        description: 'Lấy chi tiết người dùng (yêu cầu quyền ADMIN_USER_MANAGE hoặc SELF_ACCESS)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Thông tin người dùng',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        age: { type: 'number', nullable: true },
                        gender: { type: 'string', enum: ['MALE', 'FEMALE'], nullable: true },
                        status: { type: 'string', enum: ['AVAILABLE', 'DISABLED'] },
                        avatar: { type: 'string', nullable: true },
                        address: { type: 'string', nullable: true },
                        avatarUrl: { type: 'string', nullable: true },
                        role: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            permissions: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  code: { type: 'string' },
                                  name: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['User'],
        summary: 'Cập nhật thông tin người dùng',
        description: 'Cập nhật thông tin người dùng (yêu cầu quyền ADMIN_USER_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên người dùng' },
                  email: { type: 'string', format: 'email', description: 'Email (yêu cầu xác thực nếu thay đổi)' },
                  phoneNumber: { type: 'string', description: 'Số điện thoại' },
                  gender: { type: 'string', enum: ['MALE', 'FEMALE'], description: 'Giới tính' },
                  age: { type: 'number', description: 'Tuổi' },
                  address: { type: 'string', description: 'Địa chỉ' },
                  status: { type: 'string', enum: ['AVAILABLE', 'DISABLED'], description: 'Trạng thái (admin only)' },
                  avatar: { type: 'string', format: 'binary', description: 'File ảnh đại diện' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        age: { type: 'number', nullable: true },
                        gender: { type: 'string', enum: ['MALE', 'FEMALE'], nullable: true },
                        status: { type: 'string', enum: ['AVAILABLE', 'DISABLED'] },
                        avatar: { type: 'string', nullable: true },
                        address: { type: 'string', nullable: true },
                        avatarUrl: { type: 'string', nullable: true },
                        role: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['User'],
        summary: 'Xóa mềm người dùng',
        description: 'Xóa mềm người dùng bằng cách đặt trạng thái thành DISABLED (yêu cầu quyền ADMIN_USER_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm thành công',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/users/avatar/{id}': {
      get: {
        tags: ['User'],
        summary: 'Lấy avatar người dùng',
        description: 'Lấy URL avatar của người dùng (công khai)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'URL avatar của người dùng',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    avatarUrl: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['User'],
        summary: 'Upload avatar người dùng',
        description: 'Upload ảnh đại diện cho người dùng (yêu cầu quyền ADMIN_USER_MANAGE hoặc SELF_ACCESS)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'File ảnh đại diện',
                  },
                },
                required: ['avatar'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Upload avatar thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        avatar: { type: 'string' },
                      },
                    },
                    avatarUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Không có file được upload',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/users/{id}/change-password': {
      post: {
        tags: ['User'],
        summary: 'Thay đổi mật khẩu người dùng',
        description: 'Thay đổi mật khẩu của người dùng (yêu cầu quyền ADMIN_USER_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  newPassword: { type: 'string', format: 'password', description: 'Mật khẩu mới' },
                },
                required: ['newPassword'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Thay đổi mật khẩu thành công',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/users/{id}/restore': {
      post: {
        tags: ['User'],
        summary: 'Khôi phục người dùng',
        description: 'Khôi phục người dùng đã bị xóa mềm (yêu cầu quyền ADMIN_USER_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Khôi phục thành công',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/users/{id}/role': {
      put: {
        tags: ['User'],
        summary: 'Gán vai trò cho người dùng',
        description: 'Gán vai trò cho người dùng (yêu cầu quyền ADMIN_USER_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của người dùng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  roleName: { type: 'string', description: 'Tên vai trò' },
                },
                required: ['roleName'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Gán vai trò thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        roleName: { type: 'string' },
                        role: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            permissions: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  code: { type: 'string' },
                                  name: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy người dùng hoặc vai trò',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/users/role/{roleName}': {
      put: {
        tags: ['User'],
        summary: 'Lấy người dùng theo vai trò',
        description: 'Lấy danh sách người dùng có vai trò cụ thể (yêu cầu quyền ADMIN_USER_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'roleName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Tên vai trò',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách người dùng theo vai trò',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                      },
                    },
                    users: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          email: { type: 'string' },
                          phoneNumber: { type: 'string', nullable: true },
                          status: { type: 'string', enum: ['AVAILABLE', 'DISABLED'] },
                          avatar: { type: 'string', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy vai trò',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/users/profile': {
      get: {
        tags: ['User'],
        summary: 'Lấy thông tin cá nhân',
        description: 'Lấy thông tin của người dùng hiện tại',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Thông tin người dùng hiện tại',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        age: { type: 'number', nullable: true },
                        gender: { type: 'string', enum: ['MALE', 'FEMALE'], nullable: true },
                        status: { type: 'string', enum: ['AVAILABLE', 'DISABLED'] },
                        avatar: { type: 'string', nullable: true },
                        address: { type: 'string', nullable: true },
                        avatarUrl: { type: 'string', nullable: true },
                        role: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            permissions: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  code: { type: 'string' },
                                  name: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['User'],
        summary: 'Cập nhật thông tin cá nhân',
        description: 'Cập nhật thông tin của người dùng hiện tại',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên người dùng' },
                  phoneNumber: { type: 'string', description: 'Số điện thoại' },
                  gender: { type: 'string', enum: ['MALE', 'FEMALE'], description: 'Giới tính' },
                  age: { type: 'number', description: 'Tuổi' },
                  address: { type: 'string', description: 'Địa chỉ' },
                  avatar: { type: 'string', format: 'binary', description: 'File ảnh đại diện' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        age: { type: 'number', nullable: true },
                        gender: { type: 'string', enum: ['MALE', 'FEMALE'], nullable: true },
                        status: { type: 'string', enum: ['AVAILABLE', 'DISABLED'] },
                        avatar: { type: 'string', nullable: true },
                        address: { type: 'string', nullable: true },
                        avatarUrl: { type: 'string', nullable: true },
                        role: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy người dùng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    // Geo
    '/geo/provinces': {
      get: {
        tags: ['Geo'],
        summary: 'Lấy danh sách tất cả tỉnh/thành phố',
        description: 'Lấy danh sách tất cả tỉnh/thành phố (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách tỉnh/thành phố',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    provinces: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          code: { type: 'string' },
                          latitude: { type: 'number', nullable: true },
                          longitude: { type: 'number', nullable: true },
                          status: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/geo/provinces/{idOrCode}': {
      get: {
        tags: ['Geo'],
        summary: 'Lấy chi tiết tỉnh/thành phố',
        description: 'Lấy chi tiết một tỉnh/thành phố theo ID hoặc mã (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'idOrCode',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID hoặc mã của tỉnh/thành phố',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết tỉnh/thành phố',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    province: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        code: { type: 'string' },
                        latitude: { type: 'number', nullable: true },
                        longitude: { type: 'number', nullable: true },
                        status: { type: 'string' },
                        districts: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              latitude: { type: 'number', nullable: true },
                              longitude: { type: 'number', nullable: true },
                              status: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy tỉnh/thành phố',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/geo/provinces/{provinceIdOrCode}/districts': {
      get: {
        tags: ['Geo'],
        summary: 'Lấy danh sách quận/huyện của tỉnh/thành phố',
        description: 'Lấy danh sách quận/huyện thuộc một tỉnh/thành phố (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'provinceIdOrCode',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID hoặc mã của tỉnh/thành phố',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách quận/huyện',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    province: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        code: { type: 'string' },
                      },
                    },
                    districts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          latitude: { type: 'number', nullable: true },
                          longitude: { type: 'number', nullable: true },
                          status: { type: 'string' },
                          _count: {
                            type: 'object',
                            properties: {
                              wards: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy tỉnh/thành phố',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/geo/districts/{districtIdOrCode}': {
      get: {
        tags: ['Geo'],
        summary: 'Lấy chi tiết quận/huyện',
        description: 'Lấy chi tiết một quận/huyện theo ID (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'districtIdOrCode',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của quận/huyện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết quận/huyện',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    district: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        latitude: { type: 'number', nullable: true },
                        longitude: { type: 'number', nullable: true },
                        status: { type: 'string' },
                        wards: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              latitude: { type: 'number', nullable: true },
                              longitude: { type: 'number', nullable: true },
                              status: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy quận/huyện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/geo/districts/{districtIdOrCode}/wards': {
      get: {
        tags: ['Geo'],
        summary: 'Lấy danh sách phường/xã của quận/huyện',
        description: 'Lấy danh sách phường/xã thuộc một quận/huyện (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'districtIdOrCode',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của quận/huyện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách phường/xã',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    district: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    wards: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          latitude: { type: 'number', nullable: true },
                          longitude: { type: 'number', nullable: true },
                          status: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy quận/huyện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/geo/search': {
      get: {
        tags: ['Geo'],
        summary: 'Tìm kiếm địa điểm',
        description: 'Tìm kiếm tỉnh/thành phố, quận/huyện, phường/xã theo từ khóa (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'query',
            schema: { type: 'string' },
            required: true,
            description: 'Từ khóa tìm kiếm (tối thiểu 2 ký tự)',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Kết quả tìm kiếm',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          latitude: { type: 'number', nullable: true },
                          longitude: { type: 'number', nullable: true },
                          status: { type: 'string' },
                          type: { type: 'string', enum: ['PROVINCE', 'DISTRICT', 'WARD'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Từ khóa tìm kiếm quá ngắn hoặc không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    // Role
    '/roles': {
      get: {
        tags: ['Role'],
        summary: 'Lấy danh sách vai trò',
        description:
          'Lấy danh sách vai trò với phân trang, tìm kiếm và lọc (yêu cầu xác thực và quyền ADMIN_ROLE_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm',
          },
          {
            in: 'query',
            name: 'searchFields',
            schema: { type: 'string' },
            description: 'Các trường tìm kiếm, cách nhau bởi dấu phẩy (mặc định: name,description)',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"name","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"ACTIVE"})',
          },
          {
            in: 'query',
            name: 'returnAll',
            schema: { type: 'boolean' },
            description: 'Trả về tất cả dữ liệu (bỏ qua phân trang)',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách vai trò',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          permissions: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                code: { type: 'string' },
                                name: { type: 'string' },
                                description: { type: 'string', nullable: true },
                              },
                            },
                          },
                        },
                      },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_ROLE_MANAGE)',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Role'],
        summary: 'Tạo vai trò mới',
        description: 'Tạo một vai trò mới (yêu cầu xác thực và quyền ADMIN_ROLE_MANAGE)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên vai trò' },
                  description: { type: 'string', description: 'Mô tả vai trò', nullable: true },
                  permissionIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Danh sách ID của các quyền',
                  },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tạo vai trò thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        permissions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              code: { type: 'string' },
                              name: { type: 'string' },
                              description: { type: 'string', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tên vai trò đã tồn tại hoặc quyền không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_ROLE_MANAGE)',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/roles/{id}': {
      get: {
        tags: ['Role'],
        summary: 'Lấy chi tiết vai trò',
        description: 'Lấy chi tiết một vai trò theo ID (yêu cầu xác thực và quyền ADMIN_ROLE_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của vai trò',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết vai trò',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        permissions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              code: { type: 'string' },
                              name: { type: 'string' },
                              description: { type: 'string', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_ROLE_MANAGE)',
          },
          '404': {
            description: 'Không tìm thấy vai trò',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Role'],
        summary: 'Cập nhật vai trò',
        description: 'Cập nhật thông tin vai trò (yêu cầu xác thực và quyền ADMIN_ROLE_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của vai trò',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên vai trò' },
                  description: { type: 'string', description: 'Mô tả vai trò', nullable: true },
                  permissionIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Danh sách ID của các quyền',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật vai trò thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        permissions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              code: { type: 'string' },
                              name: { type: 'string' },
                              description: { type: 'string', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tên vai trò đã tồn tại hoặc quyền không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_ROLE_MANAGE)',
          },
          '404': {
            description: 'Không tìm thấy vai trò',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Role'],
        summary: 'Xóa vai trò',
        description:
          'Xóa một vai trò (yêu cầu xác thực và quyền ADMIN_ROLE_MANAGE, không thể xóa nếu vai trò đang được sử dụng)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của vai trò',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa vai trò thành công',
          },
          '400': {
            description: 'Vai trò đang được sử dụng bởi người dùng',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_ROLE_MANAGE)',
          },
          '404': {
            description: 'Không tìm thấy vai trò',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/roles/{id}/permissions': {
      put: {
        tags: ['Role'],
        summary: 'Cập nhật quyền của vai trò',
        description: 'Gán hoặc cập nhật danh sách quyền cho vai trò (yêu cầu xác thực và quyền ADMIN_ROLE_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của vai trò',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  permissionIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Danh sách ID của các quyền',
                  },
                },
                required: ['permissionIds'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật quyền thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        permissions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              code: { type: 'string' },
                              name: { type: 'string' },
                              description: { type: 'string', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Quyền không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_ROLE_MANAGE)',
          },
          '404': {
            description: 'Không tìm thấy vai trò',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    // Permission
    '/permissions': {
      get: {
        tags: ['Permission'],
        summary: 'Lấy danh sách quyền',
        description:
          'Lấy danh sách quyền với phân trang, tìm kiếm và lọc (yêu cầu xác thực và quyền ADMIN_PERMISSION_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm',
          },
          {
            in: 'query',
            name: 'searchFields',
            schema: { type: 'string' },
            description: 'Các trường tìm kiếm, cách nhau bởi dấu phẩy (mặc định: code,name,description)',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"name","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"ACTIVE"})',
          },
          {
            in: 'query',
            name: 'returnAll',
            schema: { type: 'boolean' },
            description: 'Trả về tất cả dữ liệu (bỏ qua phân trang)',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách quyền',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          code: { type: 'string' },
                          name: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          roles: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                description: { type: 'string', nullable: true },
                              },
                            },
                          },
                        },
                      },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_PERMISSION_MANAGE)',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Permission'],
        summary: 'Tạo quyền mới',
        description: 'Tạo một quyền mới (yêu cầu xác thực và quyền ADMIN_PERMISSION_MANAGE)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Mã quyền' },
                  name: { type: 'string', description: 'Tên quyền' },
                  description: { type: 'string', description: 'Mô tả quyền', nullable: true },
                },
                required: ['code', 'name'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tạo quyền thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    permission: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Mã quyền đã tồn tại',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_PERMISSION_MANAGE)',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/permissions/{id}': {
      get: {
        tags: ['Permission'],
        summary: 'Lấy chi tiết quyền',
        description: 'Lấy chi tiết một quyền theo ID (yêu cầu xác thực và quyền ADMIN_PERMISSION_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của quyền',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết quyền',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    permission: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        roles: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              description: { type: 'string', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_PERMISSION_MANAGE)',
          },
          '404': {
            description: 'Không tìm thấy quyền',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Permission'],
        summary: 'Cập nhật quyền',
        description: 'Cập nhật thông tin quyền (yêu cầu xác thực và quyền ADMIN_PERMISSION_MANAGE)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của quyền',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Mã quyền' },
                  name: { type: 'string', description: 'Tên quyền' },
                  description: { type: 'string', description: 'Mô tả quyền', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật quyền thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    permission: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Mã quyền đã tồn tại',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_PERMISSION_MANAGE)',
          },
          '404': {
            description: 'Không tìm thấy quyền',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Permission'],
        summary: 'Xóa quyền',
        description:
          'Xóa một quyền (yêu cầu xác thực và quyền ADMIN_PERMISSION_MANAGE, không thể xóa nếu quyền đang được sử dụng)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của quyền',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa quyền thành công',
          },
          '400': {
            description: 'Quyền đang được sử dụng bởi vai trò',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ (thiếu ADMIN_PERMISSION_MANAGE)',
          },
          '404': {
            description: 'Không tìm thấy quyền',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    // Post Management
    '/posts': {
      get: {
        tags: ['Post'],
        summary: 'Lấy danh sách bài viết',
        description: 'Lấy danh sách bài viết với phân trang, tìm kiếm và lọc',
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, default: 10 },
            description: 'Số bài viết trên mỗi trang',
          },
          {
            in: 'query',
            name: 'categoryId',
            schema: { type: 'string' },
            description: 'ID của danh mục',
          },
          {
            in: 'query',
            name: 'tagId',
            schema: { type: 'string' },
            description: 'ID của thẻ',
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'] },
            description: 'Trạng thái bài viết',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm trong tiêu đề, nội dung hoặc tóm tắt',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách bài viết',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    posts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                          slug: { type: 'string' },
                          content: { type: 'string' },
                          excerpt: { type: 'string', nullable: true },
                          featuredImage: { type: 'string', nullable: true },
                          author: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                            },
                          },
                          category: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              slug: { type: 'string' },
                            },
                            nullable: true,
                          },
                          postTags: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                tag: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    slug: { type: 'string' },
                                  },
                                },
                              },
                            },
                          },
                          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'] },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        currentPage: { type: 'number' },
                        totalPages: { type: 'number' },
                        totalPosts: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Post'],
        summary: 'Tạo bài viết mới',
        description: 'Tạo một bài viết mới (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Tiêu đề bài viết' },
                  content: { type: 'string', description: 'Nội dung bài viết' },
                  excerpt: { type: 'string', description: 'Tóm tắt bài viết', nullable: true },
                  featuredImage: { type: 'string', format: 'binary', description: 'Ảnh nổi bật', nullable: true },
                  categoryId: { type: 'string', description: 'ID của danh mục', nullable: true },
                  tagIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Danh sách ID của các thẻ',
                  },
                  metaTitle: { type: 'string', description: 'Tiêu đề SEO', nullable: true },
                  metaDescription: { type: 'string', description: 'Mô tả SEO', nullable: true },
                  metaKeywords: { type: 'string', description: 'Từ khóa SEO', nullable: true },
                  status: {
                    type: 'string',
                    enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'],
                    description: 'Trạng thái bài viết',
                    nullable: true,
                  },
                  scheduledAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời gian lên lịch xuất bản',
                    nullable: true,
                  },
                },
                required: ['title', 'content'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tạo bài viết thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    post: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        slug: { type: 'string' },
                        content: { type: 'string' },
                        excerpt: { type: 'string', nullable: true },
                        featuredImage: { type: 'string', nullable: true },
                        authorId: { type: 'string' },
                        category: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                          },
                          nullable: true,
                        },
                        postTags: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tag: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  name: { type: 'string' },
                                  slug: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                        metaTitle: { type: 'string', nullable: true },
                        metaDescription: { type: 'string', nullable: true },
                        metaKeywords: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'] },
                        scheduledAt: { type: 'string', format: 'date-time', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ hoặc thiếu trường bắt buộc',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/posts/{slugOrId}': {
      get: {
        tags: ['Post'],
        summary: 'Lấy chi tiết bài viết',
        description: 'Lấy chi tiết bài viết theo slug hoặc ID',
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của bài viết',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết bài viết',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    post: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        slug: { type: 'string' },
                        content: { type: 'string' },
                        excerpt: { type: 'string', nullable: true },
                        featuredImage: { type: 'string', nullable: true },
                        author: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            avatar: { type: 'string', nullable: true },
                          },
                        },
                        category: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                          },
                          nullable: true,
                        },
                        postTags: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tag: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  name: { type: 'string' },
                                  slug: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                        metaTitle: { type: 'string', nullable: true },
                        metaDescription: { type: 'string', nullable: true },
                        metaKeywords: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'] },
                        scheduledAt: { type: 'string', format: 'date-time', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Không tìm thấy bài viết',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Post'],
        summary: 'Cập nhật bài viết',
        description: 'Cập nhật bài viết (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của bài viết',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Tiêu đề bài viết' },
                  content: { type: 'string', description: 'Nội dung bài viết' },
                  excerpt: { type: 'string', description: 'Tóm tắt bài viết', nullable: true },
                  featuredImage: { type: 'string', format: 'binary', description: 'Ảnh nổi bật', nullable: true },
                  categoryId: { type: 'string', description: 'ID của danh mục', nullable: true },
                  tagIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Danh sách ID của các thẻ',
                  },
                  metaTitle: { type: 'string', description: 'Tiêu đề SEO', nullable: true },
                  metaDescription: { type: 'string', description: 'Mô tả SEO', nullable: true },
                  metaKeywords: { type: 'string', description: 'Từ khóa SEO', nullable: true },
                  status: {
                    type: 'string',
                    enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'],
                    description: 'Trạng thái bài viết',
                    nullable: true,
                  },
                  scheduledAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời gian lên lịch xuất bản',
                    nullable: true,
                  },
                  changeReason: { type: 'string', description: 'Lý do thay đổi', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật bài viết thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    post: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        slug: { type: 'string' },
                        content: { type: 'string' },
                        excerpt: { type: 'string', nullable: true },
                        featuredImage: { type: 'string', nullable: true },
                        authorId: { type: 'string' },
                        category: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                          },
                          nullable: true,
                        },
                        postTags: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tag: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  name: { type: 'string' },
                                  slug: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                        metaTitle: { type: 'string', nullable: true },
                        metaDescription: { type: 'string', nullable: true },
                        metaKeywords: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'] },
                        scheduledAt: { type: 'string', format: 'date-time', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy bài viết',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Post'],
        summary: 'Xóa mềm bài viết',
        description:
          'Xóa mềm bài viết bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của bài viết',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm bài viết thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    post: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        isDeleted: { type: 'boolean' },
                        deletedAt: { type: 'string', format: 'date-time', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy bài viết',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/posts/{id}/history': {
      get: {
        tags: ['Post'],
        summary: 'Lấy lịch sử chỉnh sửa bài viết',
        description: 'Lấy lịch sử chỉnh sửa của bài viết (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của bài viết',
          },
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, default: 10 },
            description: 'Số bản ghi trên mỗi trang',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Lịch sử chỉnh sửa bài viết',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    histories: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          postId: { type: 'string' },
                          changedFields: {
                            type: 'object',
                            additionalProperties: {
                              type: 'object',
                              properties: {
                                from: { type: 'string', nullable: true },
                                to: { type: 'string', nullable: true },
                              },
                            },
                          },
                          changedBy: { type: 'string' },
                          changeReason: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                          post: {
                            type: 'object',
                            properties: {
                              title: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        currentPage: { type: 'number' },
                        totalPages: { type: 'number' },
                        totalHistoryEntries: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy bài viết',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    // Category Management
    '/categories': {
      get: {
        tags: ['Category'],
        summary: 'Lấy danh sách danh mục',
        description: 'Lấy danh sách danh mục với phân trang, tìm kiếm và lọc',
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, default: 10 },
            description: 'Số danh mục trên mỗi trang',
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            description: 'Trạng thái danh mục',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm trong tên hoặc mô tả',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách danh mục',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    categories: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          slug: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], nullable: true },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        currentPage: { type: 'number' },
                        totalPages: { type: 'number' },
                        totalCategories: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Category'],
        summary: 'Tạo danh mục mới',
        description: 'Tạo một danh mục mới (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên danh mục' },
                  description: { type: 'string', description: 'Mô tả danh mục', nullable: true },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tạo danh mục thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        description: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tên danh mục không hợp lệ hoặc thiếu',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/categories/{slugOrId}': {
      get: {
        tags: ['Category'],
        summary: 'Lấy chi tiết danh mục',
        description: 'Lấy chi tiết danh mục theo slug hoặc ID',
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của danh mục',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết danh mục',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], nullable: true },
                        posts: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              title: { type: 'string' },
                              slug: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Không tìm thấy danh mục',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Category'],
        summary: 'Cập nhật danh mục',
        description: 'Cập nhật danh mục (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của danh mục',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên danh mục' },
                  description: { type: 'string', description: 'Mô tả danh mục', nullable: true },
                  status: {
                    type: 'string',
                    enum: ['ACTIVE', 'INACTIVE'],
                    description: 'Trạng thái danh mục',
                    nullable: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật danh mục thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy danh mục',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Category'],
        summary: 'Xóa mềm danh mục',
        description:
          'Xóa mềm danh mục nếu không có bài viết liên kết (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của danh mục',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm danh mục thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        isDeleted: { type: 'boolean' },
                        deletedAt: { type: 'string', format: 'date-time', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Danh mục có bài viết liên kết',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy danh mục',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    // Tag Management
    '/tags': {
      get: {
        tags: ['Tag'],
        summary: 'Lấy danh sách thẻ',
        description: 'Lấy danh sách thẻ với phân trang, tìm kiếm và lọc',
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, default: 10 },
            description: 'Số thẻ trên mỗi trang',
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            description: 'Trạng thái thẻ',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm trong tên thẻ',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách thẻ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tags: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          slug: { type: 'string' },
                          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], nullable: true },
                          postCount: { type: 'number' },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        currentPage: { type: 'number' },
                        totalPages: { type: 'number' },
                        totalTags: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Tag'],
        summary: 'Tạo thẻ mới',
        description: 'Tạo một thẻ mới (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên thẻ' },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tạo thẻ thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tag: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tên thẻ không hợp lệ hoặc thiếu',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/tags/{slugOrId}': {
      get: {
        tags: ['Tag'],
        summary: 'Lấy chi tiết thẻ',
        description: 'Lấy chi tiết thẻ theo slug hoặc ID',
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của thẻ',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết thẻ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tag: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], nullable: true },
                        posts: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              title: { type: 'string' },
                              slug: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Không tìm thấy thẻ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Tag'],
        summary: 'Cập nhật thẻ',
        description: 'Cập nhật thẻ (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Slug hoặc ID của thẻ',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên thẻ' },
                  status: {
                    type: 'string',
                    enum: ['ACTIVE', 'INACTIVE'],
                    description: 'Trạng thái thẻ',
                    nullable: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật thẻ thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tag: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '403': {
            description: 'Quyền không hợp lệ',
          },
          '404': {
            description: 'Không tìm thấy thẻ',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    // Route
    '/routes': {
      get: {
        tags: ['Route'],
        summary: 'Lấy danh sách tuyến đường',
        description: 'Lấy danh sách tuyến đường với phân trang, tìm kiếm và lọc (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm (code, name)',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"name","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"ACTIVE"})',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách tuyến đường',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Route' },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Route'],
        summary: 'Tạo tuyến đường mới',
        description: 'Tạo một tuyến đường mới (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Mã tuyến đường' },
                  name: { type: 'string', description: 'Tên tuyến đường' },
                  direction: { type: 'string', description: 'Hướng tuyến đường', nullable: true },
                  sourceProvinceId: { type: 'string', description: 'ID tỉnh/thành phố đầu' },
                  destinationProvinceId: { type: 'string', description: 'ID tỉnh/thành phố cuối' },
                  distance: { type: 'number', description: 'Khoảng cách' },
                  distanceUnit: { type: 'string', enum: ['KM', 'MILE'], description: 'Đơn vị khoảng cách' },
                  estimatedDuration: { type: 'integer', description: 'Thời gian dự kiến (phút)' },
                  image: { type: 'string', format: 'binary', description: 'Ảnh tuyến đường', nullable: true },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
                required: [
                  'code',
                  'name',
                  'sourceProvinceId',
                  'destinationProvinceId',
                  'distance',
                  'distanceUnit',
                  'estimatedDuration',
                  'status',
                ],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tạo tuyến đường thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Route' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/routes/{id}': {
      get: {
        tags: ['Route'],
        summary: 'Lấy chi tiết tuyến đường',
        description: 'Lấy thông tin chi tiết của một tuyến đường theo ID (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của tuyến đường',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết tuyến đường',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Route' },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy tuyến đường',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Route'],
        summary: 'Cập nhật tuyến đường',
        description: 'Cập nhật thông tin tuyến đường (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của tuyến đường',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Mã tuyến đường' },
                  name: { type: 'string', description: 'Tên tuyến đường' },
                  direction: { type: 'string', description: 'Hướng tuyến đường', nullable: true },
                  sourceProvinceId: { type: 'string', description: 'ID tỉnh/thành phố đầu' },
                  destinationProvinceId: { type: 'string', description: 'ID tỉnh/thành phố cuối' },
                  distance: { type: 'number', description: 'Khoảng cách' },
                  distanceUnit: { type: 'string', enum: ['KM', 'MILE'], description: 'Đơn vị khoảng cách' },
                  estimatedDuration: { type: 'integer', description: 'Thời gian dự kiến (phút)' },
                  image: { type: 'string', format: 'binary', description: 'Ảnh tuyến đường', nullable: true },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật tuyến đường thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Route' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy tuyến đường',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Route'],
        summary: 'Xóa mềm tuyến đường',
        description: 'Xóa mềm tuyến đường bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của tuyến đường',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm tuyến đường thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    isDeleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy tuyến đường',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/routes/{id}/image': {
      post: {
        tags: ['Route'],
        summary: 'Upload ảnh tuyến đường',
        description: 'Upload ảnh cho tuyến đường (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của tuyến đường',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  image: { type: 'string', format: 'binary', description: 'Ảnh tuyến đường' },
                },
                required: ['image'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Upload ảnh thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    imageUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Không có file được upload',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy tuyến đường',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },

    // New BusStop endpoints
    '/bus-stops': {
      get: {
        tags: ['Bus Stop'],
        summary: 'Lấy danh sách điểm dừng',
        description: 'Lấy danh sách điểm dừng với phân trang, tìm kiếm và lọc (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm (name)',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"name","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"ACTIVE"})',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách điểm dừng',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/BusStop' },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Bus Stop'],
        summary: 'Tạo điểm dừng mới',
        description: 'Tạo một điểm dừng mới (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên điểm dừng' },
                  wardId: { type: 'string', description: 'ID phường/xã' },
                  latitude: { type: 'number', description: 'Vĩ độ', nullable: true },
                  longitude: { type: 'number', description: 'Kinh độ', nullable: true },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
                required: ['name', 'wardId', 'status'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tạo điểm dừng thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BusStop' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/bus-stops/{id}': {
      get: {
        tags: ['Bus Stop'],
        summary: 'Lấy chi tiết điểm dừng',
        description: 'Lấy thông tin chi tiết của một điểm dừng theo ID (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của điểm dừng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết điểm dừng',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BusStop' },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy điểm dừng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Bus Stop'],
        summary: 'Cập nhật điểm dừng',
        description: 'Cập nhật thông tin điểm dừng (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của điểm dừng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên điểm dừng' },
                  wardId: { type: 'string', description: 'ID phường/xã' },
                  latitude: { type: 'number', description: 'Vĩ độ', nullable: true },
                  longitude: { type: 'number', description: 'Kinh độ', nullable: true },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật điểm dừng thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BusStop' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy điểm dừng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Bus Stop'],
        summary: 'Xóa mềm điểm dừng',
        description: 'Xóa mềm điểm dừng bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của điểm dừng',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm điểm dừng thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    isDeleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy điểm dừng',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },

    // New RouteStop endpoints
    '/route-stops': {
      get: {
        tags: ['Route Stop'],
        summary: 'Lấy danh sách điểm dừng trên tuyến',
        description: 'Lấy danh sách điểm dừng trên tuyến với phân trang, tìm kiếm và lọc (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"stopOrder","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"ACTIVE"})',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách điểm dừng trên tuyến',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/RouteStop' },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Route Stop'],
        summary: 'Tạo điểm dừng trên tuyến mới',
        description: 'Tạo một điểm dừng trên tuyến mới (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string', description: 'ID tuyến đường' },
                  busStopId: { type: 'string', description: 'ID điểm dừng' },
                  stopOrder: { type: 'integer', description: 'Thứ tự dừng' },
                  estimatedArrivalTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời gian đến dự kiến',
                    nullable: true,
                  },
                  estimatedDepartureTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời gian rời dự kiến',
                    nullable: true,
                  },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
                required: ['routeId', 'busStopId', 'stopOrder', 'status'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tạo điểm dừng trên tuyến thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RouteStop' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/route-stops/{id}': {
      get: {
        tags: ['Route Stop'],
        summary: 'Lấy chi tiết điểm dừng trên tuyến',
        description: 'Lấy thông tin chi tiết của một điểm dừng trên tuyến theo ID (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của điểm dừng trên tuyến',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết điểm dừng trên tuyến',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RouteStop' },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy điểm dừng trên tuyến',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Route Stop'],
        summary: 'Cập nhật điểm dừng trên tuyến',
        description: 'Cập nhật thông tin điểm dừng trên tuyến (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của điểm dừng trên tuyến',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string', description: 'ID tuyến đường' },
                  busStopId: { type: 'string', description: 'ID điểm dừng' },
                  stopOrder: { type: 'integer', description: 'Thứ tự dừng' },
                  estimatedArrivalTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời gian đến dự kiến',
                    nullable: true,
                  },
                  estimatedDepartureTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Thời gian rời dự kiến',
                    nullable: true,
                  },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật điểm dừng trên tuyến thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RouteStop' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy điểm dừng trên tuyến',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Route Stop'],
        summary: 'Xóa mềm điểm dừng trên tuyến',
        description: 'Xóa mềm điểm dừng trên tuyến bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của điểm dừng trên tuyến',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm điểm dừng trên tuyến thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    isDeleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy điểm dừng trên tuyến',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },

    // New VehicleType endpoints
    '/vehicle-types': {
      get: {
        tags: ['Vehicle Type'],
        summary: 'Lấy danh sách loại phương tiện',
        description: 'Lấy danh sách loại phương tiện với phân trang, tìm kiếm và lọc (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm (name)',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"name","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"ACTIVE"})',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách loại phương tiện',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VehicleType' },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Vehicle Type'],
        summary: 'Tạo loại phương tiện mới',
        description: 'Tạo một loại phương tiện mới (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên loại phương tiện' },
                  description: { type: 'string', description: 'Mô tả', nullable: true },
                  seatConfiguration: { type: 'object', description: 'Cấu hình ghế' },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
                required: ['name', 'seatConfiguration', 'status'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tạo loại phương tiện thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VehicleType' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/vehicle-types/{id}': {
      get: {
        tags: ['Vehicle Type'],
        summary: 'Lấy chi tiết loại phương tiện',
        description: 'Lấy thông tin chi tiết của một loại phương tiện theo ID (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của loại phương tiện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết loại phương tiện',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VehicleType' },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy loại phương tiện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Vehicle Type'],
        summary: 'Cập nhật loại phương tiện',
        description: 'Cập nhật thông tin loại phương tiện (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của loại phương tiện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Tên loại phương tiện' },
                  description: { type: 'string', description: 'Mô tả', nullable: true },
                  seatConfiguration: { type: 'object', description: 'Cấu hình ghế' },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Trạng thái' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật loại phương tiện thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VehicleType' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy loại phương tiện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Vehicle Type'],
        summary: 'Xóa mềm loại phương tiện',
        description: 'Xóa mềm loại phương tiện bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của loại phương tiện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm loại phương tiện thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    isDeleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy loại phương tiện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },

    // New Vehicle endpoints
    '/vehicles': {
      get: {
        tags: ['Vehicle'],
        summary: 'Lấy danh sách phương tiện',
        description: 'Lấy danh sách phương tiện với phân trang, tìm kiếm và lọc (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Số trang',
          },
          {
            in: 'query',
            name: 'pageSize',
            schema: { type: 'integer', minimum: 1 },
            description: 'Kích thước trang',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Từ khóa tìm kiếm (plateNumber, registrationCode)',
          },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string' },
            description: 'Sắp xếp (JSON string, ví dụ: {"field":"plateNumber","direction":"asc"})',
          },
          {
            in: 'query',
            name: 'filters',
            schema: { type: 'string' },
            description: 'Bộ lọc (JSON string, ví dụ: {"status":"ACTIVE"})',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Danh sách phương tiện',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Vehicle' },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    pageSize: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Tham số truy vấn không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      post: {
        tags: ['Vehicle'],
        summary: 'Tạo phương tiện mới',
        description: 'Tạo một phương tiện mới (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  plateNumber: { type: 'string', description: 'Biển số xe' },
                  registrationCode: { type: 'string', description: 'Mã đăng ký' },
                  vehicleTypeId: { type: 'string', description: 'ID loại phương tiện' },
                  driverId: { type: 'string', description: 'ID tài xế', nullable: true },
                  registrationExpiryDate: { type: 'string', format: 'date-time', description: 'Ngày hết hạn đăng ký' },
                  image: { type: 'string', format: 'binary', description: 'Ảnh phương tiện', nullable: true },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], description: 'Trạng thái' },
                },
                required: ['plateNumber', 'registrationCode', 'vehicleTypeId', 'registrationExpiryDate', 'status'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tạo phương tiện thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Vehicle' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/vehicles/{id}': {
      get: {
        tags: ['Vehicle'],
        summary: 'Lấy chi tiết phương tiện',
        description: 'Lấy thông tin chi tiết của một phương tiện theo ID (yêu cầu xác thực)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của phương tiện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Chi tiết phương tiện',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Vehicle' },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy phương tiện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      put: {
        tags: ['Vehicle'],
        summary: 'Cập nhật phương tiện',
        description: 'Cập nhật thông tin phương tiện (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của phương tiện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  plateNumber: { type: 'string', description: 'Biển số xe' },
                  registrationCode: { type: 'string', description: 'Mã đăng ký' },
                  vehicleTypeId: { type: 'string', description: 'ID loại phương tiện' },
                  driverId: { type: 'string', description: 'ID tài xế', nullable: true },
                  registrationExpiryDate: { type: 'string', format: 'date-time', description: 'Ngày hết hạn đăng ký' },
                  image: { type: 'string', format: 'binary', description: 'Ảnh phương tiện', nullable: true },
                  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], description: 'Trạng thái' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cập nhật phương tiện thành công',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Vehicle' },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy phương tiện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
      delete: {
        tags: ['Vehicle'],
        summary: 'Xóa mềm phương tiện',
        description: 'Xóa mềm phương tiện bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của phương tiện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        responses: {
          '200': {
            description: 'Xóa mềm phương tiện thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    isDeleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy phương tiện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
    '/vehicles/{id}/image': {
      post: {
        tags: ['Vehicle'],
        summary: 'Upload ảnh phương tiện',
        description: 'Upload ảnh cho phương tiện (yêu cầu xác thực và quyền phù hợp)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID của phương tiện',
          },
          {
            in: 'query',
            name: 'lang',
            schema: { type: 'string' },
            description: 'Ngôn ngữ phản hồi (mặc định: en)',
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  image: { type: 'string', format: 'binary', description: 'Ảnh phương tiện' },
                },
                required: ['image'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Upload ảnh thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    imageUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Không có file được upload',
          },
          '401': {
            description: 'Không có quyền truy cập',
          },
          '404': {
            description: 'Không tìm thấy phương tiện',
          },
          '500': {
            description: 'Lỗi server',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Route: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
          direction: { type: 'string', nullable: true },
          sourceProvinceId: { type: 'string' },
          destinationProvinceId: { type: 'string' },
          distance: { type: 'number' },
          distanceUnit: { type: 'string', enum: ['KM', 'MILE'] },
          estimatedDuration: { type: 'integer' },
          image: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          isDeleted: { type: 'boolean' },
          sourceProvince: { $ref: '#/components/schemas/Province' },
          destinationProvince: { $ref: '#/components/schemas/Province' },
          routeStops: { type: 'array', items: { $ref: '#/components/schemas/RouteStop' } },
        },
        required: [
          'id',
          'code',
          'name',
          'sourceProvinceId',
          'destinationProvinceId',
          'distance',
          'distanceUnit',
          'estimatedDuration',
          'status',
          'isDeleted',
        ],
      },
      BusStop: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          wardId: { type: 'string' },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          isDeleted: { type: 'boolean' },
          ward: { $ref: '#/components/schemas/Ward' },
          routeStops: { type: 'array', items: { $ref: '#/components/schemas/RouteStop' } },
        },
        required: ['id', 'name', 'wardId', 'status', 'isDeleted'],
      },
      RouteStop: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          routeId: { type: 'string' },
          busStopId: { type: 'string' },
          stopOrder: { type: 'integer' },
          estimatedArrivalTime: { type: 'string', format: 'date-time', nullable: true },
          estimatedDepartureTime: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          isDeleted: { type: 'boolean' },
          route: { $ref: '#/components/schemas/Route' },
          busStop: { $ref: '#/components/schemas/BusStop' },
        },
        required: ['id', 'routeId', 'busStopId', 'stopOrder', 'status', 'isDeleted'],
      },
      VehicleType: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          seatConfiguration: { type: 'object' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          isDeleted: { type: 'boolean' },
          vehicles: { type: 'array', items: { $ref: '#/components/schemas/Vehicle' } },
        },
        required: ['id', 'name', 'seatConfiguration', 'status', 'isDeleted'],
      },
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          plateNumber: { type: 'string' },
          registrationCode: { type: 'string' },
          vehicleTypeId: { type: 'string' },
          driverId: { type: 'string', nullable: true },
          registrationExpiryDate: { type: 'string', format: 'date-time' },
          image: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] },
          isDeleted: { type: 'boolean' },
          vehicleType: { $ref: '#/components/schemas/VehicleType' },
          driver: { type: 'object', nullable: true },
        },
        required: [
          'id',
          'plateNumber',
          'registrationCode',
          'vehicleTypeId',
          'registrationExpiryDate',
          'status',
          'isDeleted',
        ],
      },
      Province: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          code: { type: 'string' },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          status: { type: 'string' },
        },
        required: ['id', 'name', 'code', 'status'],
      },
      Ward: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          status: { type: 'string' },
        },
        required: ['id', 'name', 'status'],
      },
    },
  },
};
