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
    {
      name: 'Trip',
      description: 'Trip management endpoints',
    },
    {
      name: 'Booking',
      description: 'Booking management endpoints',
    },
    {
      name: 'Ticket',
      description: 'Ticket management endpoints',
    },
    {
      name: 'System Config',
      description: 'System Config endpoints',
    },
    {
      name: 'Realtime',
      description: 'Real-time booking, room management and other endpoints using Socket.IO',
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
                  firstName: {
                    type: 'string',
                    example: 'John',
                    description: 'Tên',
                  },
                  lastName: {
                    type: 'string',
                    example: 'Doe',
                    description: 'Họ',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'john@example.com',
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    example: 'Password123!',
                    minLength: 8,
                  },
                  gender: {
                    type: 'string',
                    enum: ['MALE', 'FEMALE'],
                    example: 'MALE',
                  },
                  phoneNumber: {
                    type: 'string',
                    example: '+84123456789',
                  },
                  birthday: {
                    type: 'string',
                    format: 'date',
                    example: '1998-05-15',
                    description: 'Ngày sinh (YYYY-MM-DD)',
                  },
                  address: {
                    type: 'string',
                    example: 'Ho Chi Minh City',
                  },
                },
                required: ['firstName', 'lastName', 'email', 'password', 'gender', 'birthday'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Đăng ký thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Verification email sent' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        email: { type: 'string', example: 'john@example.com' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Email already exists' },
                  },
                },
              },
            },
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
    '/auth/check-reset-token/{token}': {
      get: {
        tags: ['Authentication'],
        summary: 'Kiểm tra token đặt lại mật khẩu',
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
                          firstName: { type: 'string' },
                          lastName: { type: 'string' },
                          email: { type: 'string' },
                          phoneNumber: { type: 'string' },
                          birthday: {
                            type: 'string',
                            format: 'date',
                            example: '1998-05-15',
                            description: 'Ngày sinh (YYYY-MM-DD)',
                          },
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
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        birthday: {
                          type: 'string',
                          format: 'date',
                          nullable: true,
                        },
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
                  firstName: { type: 'string', description: 'Tên người dùng' },
                  lastName: { type: 'string', description: 'Họ người dùng' },
                  email: { type: 'string', format: 'email', description: 'Email (yêu cầu xác thực nếu thay đổi)' },
                  phoneNumber: { type: 'string', description: 'Số điện thoại' },
                  gender: { type: 'string', enum: ['MALE', 'FEMALE'], description: 'Giới tính' },
                  birthday: {
                    type: 'string',
                    format: 'date',
                    example: '1998-05-15',
                    description: 'Ngày sinh (YYYY-MM-DD)',
                  },
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
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        birthday: {
                          type: 'string',
                          format: 'date',
                          nullable: true,
                        },
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
        summary: 'Xoá mềm người dùng',
        description: 'Xoá mềm người dùng bằng cách đặt trạng thái thành DISABLED (yêu cầu quyền ADMIN_USER_MANAGE)',
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
            description: 'Xoá mềm thành công',
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
      delete: {
        tags: ['User'],
        summary: 'Xoá avatar người dùng',
        description: 'Xoá avatar người dùng (yêu cầu quyền ADMIN_USER_MANAGE, SELF_ACCESS)',
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
            description: 'Xoá avatar thành công',
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
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        birthday: {
                          type: 'string',
                          format: 'date',
                          nullable: true,
                        },
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
                  firstName: { type: 'string', description: 'Tên người dùng' },
                  lastName: { type: 'string', description: 'Họ người dùng' },
                  phoneNumber: { type: 'string', description: 'Số điện thoại' },
                  gender: { type: 'string', enum: ['MALE', 'FEMALE'], description: 'Giới tính' },
                  birthday: {
                    type: 'string',
                    format: 'date',
                    example: '1998-05-15',
                    description: 'Ngày sinh (YYYY-MM-DD)',
                  },
                  address: { type: 'string', description: 'Địa chỉ' },
                  avatar: { type: 'string', format: 'binary', description: 'File ảnh đại diện' },
                  deleteAvatar: { type: 'boolean', description: 'Xoá ảnh đại diện' },
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
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string', nullable: true },
                        birthday: {
                          type: 'string',
                          format: 'date',
                          nullable: true,
                        },
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
        tags: ['Geography'],
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
        tags: ['Geography'],
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
        tags: ['Geography'],
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
        tags: ['Geography'],
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
        tags: ['Geography'],
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
        tags: ['Geography'],
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
        summary: 'Xoá vai trò',
        description:
          'Xoá một vai trò (yêu cầu xác thực và quyền ADMIN_ROLE_MANAGE, không thể xóa nếu vai trò đang được sử dụng)',
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
            description: 'Xoá vai trò thành công',
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
        summary: 'Xoá quyền',
        description:
          'Xoá một quyền (yêu cầu xác thực và quyền ADMIN_PERMISSION_MANAGE, không thể xóa nếu quyền đang được sử dụng)',
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
            description: 'Xoá quyền thành công',
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
    // Post
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
        summary: 'Xoá mềm bài viết',
        description:
          'Xoá mềm bài viết bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
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
            description: 'Xoá mềm bài viết thành công',
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
    // Category
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
        summary: 'Xoá mềm danh mục',
        description:
          'Xoá mềm danh mục nếu không có bài viết liên kết (yêu cầu xác thực và quyền ADMIN hoặc CONTENT_MANAGER)',
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
            description: 'Xoá mềm danh mục thành công',
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
    // Tag
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
        summary: 'Xoá mềm tuyến đường',
        description: 'Xoá mềm tuyến đường bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
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
            description: 'Xoá mềm tuyến đường thành công',
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
    // Bus stop
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
        summary: 'Xoá mềm điểm dừng',
        description: 'Xoá mềm điểm dừng bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
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
            description: 'Xoá mềm điểm dừng thành công',
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
    '/bus-stops/by-routes': {
      get: {
        tags: ['Bus Stop'],
        summary: 'Get list of bus stops by routes',
        description:
          'Retrieve a list of bus stops associated with specified routes, filtered by route IDs or source and destination province IDs. Returns all bus stops, pickup points, and dropoff points with their associated route information. Either routeIds or both sourceProvinceId and destinationProvinceId must be provided.',
        parameters: [
          {
            name: 'routeIds',
            in: 'query',
            description:
              'Filter bus stops by route IDs (comma-separated string, JSON array, or query array, e.g., "route1,route2", "[\"route1\",\"route2\"]", or routeIds[]=route1&routeIds[]=route2)',
            schema: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
          },
          {
            name: 'sourceProvinceId',
            in: 'query',
            description: 'Filter bus stops by source province ID (required if routeIds is not provided)',
            schema: { type: 'string' },
          },
          {
            name: 'destinationProvinceId',
            in: 'query',
            description: 'Filter bus stops by destination province ID (required if routeIds is not provided)',
            schema: { type: 'string' },
          },
          {
            name: 'departureDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Ngày giờ khởi hành tối thiểu (lọc các chuyến đi có departureTime >= giá trị này)',
          },
          {
            name: 'arrivalDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description:
              'Ngày giờ khởi hành tối đa (lọc các chuyến đi có departureTime <= giá trị này, mặc định đến cuối ngày nếu không có giờ cụ thể)',
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi). Defaults to en.',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'List of bus stops retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        allBusStops: {
                          type: 'array',
                          description: 'List of all bus stops associated with the specified routes',
                          items: {
                            allOf: [
                              { $ref: '#/components/schemas/BusStop' },
                              {
                                type: 'object',
                                properties: {
                                  routes: {
                                    type: 'array',
                                    items: {
                                      type: 'object',
                                      properties: {
                                        routeId: { type: 'string', description: 'ID of the route' },
                                        routeName: { type: 'string', description: 'Name of the route' },
                                        stopOrder: { type: 'integer', description: 'Order of the stop in the route' },
                                        isPickUp: {
                                          type: 'boolean',
                                          description: 'Whether the stop is a pickup point',
                                        },
                                        isDropOff: {
                                          type: 'boolean',
                                          description: 'Whether the stop is a dropoff point',
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            ],
                          },
                        },
                        pickupPoints: {
                          type: 'array',
                          description: 'List of bus stops that are pickup points',
                          items: {
                            allOf: [
                              { $ref: '#/components/schemas/BusStop' },
                              {
                                type: 'object',
                                properties: {
                                  pickupRoutes: {
                                    type: 'array',
                                    items: {
                                      type: 'object',
                                      properties: {
                                        routeId: { type: 'string', description: 'ID of the route' },
                                        routeName: { type: 'string', description: 'Name of the route' },
                                        stopOrder: { type: 'integer', description: 'Order of the stop in the route' },
                                      },
                                    },
                                  },
                                },
                              },
                            ],
                          },
                        },
                        dropoffPoints: {
                          type: 'array',
                          description: 'List of bus stops that are dropoff points',
                          items: {
                            allOf: [
                              { $ref: '#/components/schemas/BusStop' },
                              {
                                type: 'object',
                                properties: {
                                  dropoffRoutes: {
                                    type: 'array',
                                    items: {
                                      type: 'object',
                                      properties: {
                                        routeId: { type: 'string', description: 'ID of the route' },
                                        routeName: { type: 'string', description: 'Name of the route' },
                                        stopOrder: { type: 'integer', description: 'Order of the stop in the route' },
                                      },
                                    },
                                  },
                                },
                              },
                            ],
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
            description: 'Invalid query parameters (e.g., missing routeIds or sourceProvinceId/destinationProvinceId)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Route stop
    '/route-stops': {
      get: {
        tags: ['Route Stop'],
        summary: 'Get list of route stops',
        description:
          'Retrieve a paginated list of route stops with optional filtering, sorting, and pagination. Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            description: 'Number of items per page',
            schema: { type: 'integer', minimum: 1, default: 10 },
          },
          {
            name: 'returnAll',
            in: 'query',
            description: 'Return all results without pagination (true/false)',
            schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
          },
          {
            name: 'sort',
            in: 'query',
            description: 'Sort criteria in JSON format (e.g., [{"field":"stopOrder","order":"asc"}])',
            schema: { type: 'string' },
            examples: {
              singleSort: { value: '[{"field":"stopOrder","order":"asc"}]' },
              multipleSort: { value: '[{"field":"stopOrder","order":"asc"},{"field":"createdAt","order":"desc"}]' },
            },
          },
          {
            name: 'filters',
            in: 'query',
            description: 'Filters in JSON format (e.g., {"status":"ACTIVE","routeId":"route1"})',
            schema: { type: 'string' },
            examples: {
              statusFilter: { value: '{"status":"ACTIVE"}' },
              routeFilter: { value: '{"routeId":"route1"}' },
            },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'List of route stops retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/RouteStop' },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', description: 'Current page number' },
                        pageSize: { type: 'integer', description: 'Number of items per page' },
                        totalCount: { type: 'integer', description: 'Total number of route stops' },
                        totalPages: { type: 'integer', description: 'Total number of pages' },
                        hasNextPage: { type: 'boolean', description: 'Whether there is a next page' },
                        hasPrevPage: { type: 'boolean', description: 'Whether there is a previous page' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Route Stop'],
        summary: 'Create a new route stop',
        description: 'Create a new route stop for a specific route and bus stop. Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string', description: 'ID of the route' },
                  busStopId: { type: 'string', description: 'ID of the bus stop' },
                  stopOrder: { type: 'integer', description: 'Order of the stop in the route' },
                  estimatedArrivalTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Estimated arrival time (ISO 8601 format, e.g., 2025-01-15T08:00:00+07:00)',
                    nullable: true,
                  },
                  estimatedDepartureTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Estimated departure time (ISO 8601 format, e.g., 2025-01-15T08:15:00+07:00)',
                    nullable: true,
                  },
                  status: {
                    type: 'string',
                    enum: ['ACTIVE', 'INACTIVE'],
                    description: 'Status of the route stop',
                    default: 'ACTIVE',
                  },
                },
                required: ['routeId', 'busStopId', 'stopOrder'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Route stop created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: { $ref: '#/components/schemas/RouteStop' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data or duplicate stop order/bus stop',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route or bus stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/route-stops/{id}': {
      get: {
        tags: ['Route Stop'],
        summary: 'Get route stop details',
        description: 'Retrieve detailed information about a specific route stop by ID. Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the route stop',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Route stop details retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: { $ref: '#/components/schemas/RouteStop' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Route Stop'],
        summary: 'Update a route stop',
        description: 'Update an existing route stop by ID. Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the route stop to update',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  stopOrder: { type: 'integer', description: 'Order of the stop in the route' },
                  estimatedArrivalTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Estimated arrival time (ISO 8601 format, e.g., 2025-01-15T08:00:00+07:00)',
                    nullable: true,
                  },
                  estimatedDepartureTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Estimated departure time (ISO 8601 format, e.g., 2025-01-15T08:15:00+07:00)',
                    nullable: true,
                  },
                  status: {
                    type: 'string',
                    enum: ['ACTIVE', 'INACTIVE'],
                    description: 'Status of the route stop',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Route stop updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: { $ref: '#/components/schemas/RouteStop' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data or duplicate stop order',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Route Stop'],
        summary: 'Soft delete a route stop',
        description:
          'Soft delete a route stop by marking it as deleted (isDeleted: true, status: INACTIVE). Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the route stop to delete',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Route stop soft deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'ID of the deleted route stop' },
                        isDeleted: { type: 'boolean', description: 'Deletion status' },
                        status: {
                          type: 'string',
                          enum: ['ACTIVE', 'INACTIVE'],
                          description: 'Status of the route stop',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/route-stops/{id}/restore': {
      put: {
        tags: ['Route Stop'],
        summary: 'Restore a deleted route stop',
        description:
          'Restore a soft-deleted route stop by setting isDeleted to false and status to ACTIVE. Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the route stop to restore',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Route stop restored successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: { $ref: '#/components/schemas/RouteStop' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/route-stops/route/{routeId}': {
      get: {
        tags: ['Route Stop'],
        summary: 'Get all stops for a specific route',
        description: 'Retrieve all route stops for a specific route, including bus stop details. Public access.',
        parameters: [
          {
            name: 'routeId',
            in: 'path',
            required: true,
            description: 'ID of the route',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Route stops retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        route: { $ref: '#/components/schemas/Route' },
                        stops: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/RouteStop' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Route not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/route-stops/route/trip-filter/{routeId}': {
      get: {
        tags: ['Route Stop'],
        summary: 'Get route stops with pickup and dropoff points separated',
        description:
          'Retrieve all route stops for a specific route, separated into pickup and dropoff points based on source and destination provinces. Public access.',
        parameters: [
          {
            name: 'routeId',
            in: 'path',
            required: true,
            description: 'ID of the route',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Route stops retrieved successfully with pickup and dropoff points separated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        pickupPoints: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/RouteStop' },
                          description: 'List of pickup points (stops in source province)',
                        },
                        dropoffPoints: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/RouteStop' },
                          description: 'List of dropoff points (stops in destination province)',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Missing route ID',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/route-stops/bus-stop/{busStopId}': {
      get: {
        tags: ['Route Stop'],
        summary: 'Get all routes that stop at a specific bus stop',
        description:
          'Retrieve all route stops associated with a specific bus stop, including route details. Public access.',
        parameters: [
          {
            name: 'busStopId',
            in: 'path',
            required: true,
            description: 'ID of the bus stop',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Route stops retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        busStop: { $ref: '#/components/schemas/BusStop' },
                        routeStops: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/RouteStop' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Bus stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/route-stops/bulk': {
      post: {
        tags: ['Route Stop'],
        summary: 'Bulk create route stops',
        description:
          'Create multiple route stops for a specific route in a single request. Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string', description: 'ID of the route' },
                  stops: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        busStopId: { type: 'string', description: 'ID of the bus stop' },
                        stopOrder: { type: 'integer', description: 'Order of the stop in the route' },
                        estimatedArrivalTime: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Estimated arrival time (ISO 8601 format, e.g., 2025-01-15T08:00:00+07:00)',
                          nullable: true,
                        },
                        estimatedDepartureTime: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Estimated departure time (ISO 8601 format, e.g., 2025-01-15T08:15:00+07:00)',
                          nullable: true,
                        },
                      },
                      required: ['busStopId', 'stopOrder'],
                    },
                  },
                },
                required: ['routeId', 'stops'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Route stops created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        route: { $ref: '#/components/schemas/Route' },
                        createdStops: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/RouteStop' },
                        },
                        count: { type: 'integer', description: 'Number of created stops' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data, duplicate stop order, or bus stop already in route',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route or bus stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/route-stops/reorder/{routeId}': {
      put: {
        tags: ['Route Stop'],
        summary: 'Reorder route stops',
        description: 'Reorder the stop order of route stops for a specific route. Requires admin authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'routeId',
            in: 'path',
            required: true,
            description: 'ID of the route',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  stopOrders: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'ID of the route stop' },
                        stopOrder: { type: 'integer', description: 'New order of the stop' },
                      },
                      required: ['id', 'stopOrder'],
                    },
                  },
                },
                required: ['stopOrders'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Route stops reordered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        route: { $ref: '#/components/schemas/Route' },
                        stops: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/RouteStop' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data, duplicate stop order, or mismatch in stop count',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid authentication token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden - User does not have admin privileges',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route or route stop not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Vehicle type
    '/vehicle-types': {
      get: {
        tags: ['Vehicle Type'],
        summary: 'Lấy danh sách loại phương tiện',
        description:
          'Lấy danh sách loại phương tiện với phân trang, tìm kiếm và lọc theo trạng thái, tỉnh đi, tỉnh đến, và khoảng thời gian khởi hành. Chỉ trả về id và tên loại phương tiện (yêu cầu xác thực).',
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
            description: 'Từ khóa tìm kiếm (name hoặc description)',
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
          {
            in: 'query',
            name: 'sourceProvinceId',
            schema: { type: 'string' },
            description: 'ID tỉnh đi để lọc các loại phương tiện có chuyến đi từ tỉnh này',
          },
          {
            in: 'query',
            name: 'destinationProvinceId',
            schema: { type: 'string' },
            description: 'ID tỉnh đến để lọc các loại phương tiện có chuyến đi đến tỉnh này',
          },
          {
            in: 'query',
            name: 'departureDate',
            schema: { type: 'string', format: 'date-time' },
            description: 'Ngày giờ khởi hành tối thiểu (lọc các chuyến đi có departureTime >= giá trị này)',
          },
          {
            in: 'query',
            name: 'arrivalDate',
            schema: { type: 'string', format: 'date-time' },
            description:
              'Ngày giờ khởi hành tối đa (lọc các chuyến đi có departureTime <= giá trị này, mặc định đến cuối ngày nếu không có giờ cụ thể)',
          },
          {
            in: 'query',
            name: 'returnAll',
            schema: { type: 'boolean' },
            description: 'Trả về tất cả kết quả (bỏ qua phân trang) nếu là true',
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
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    message: {
                      type: 'string',
                      example: 'vehicleType.listRetrieved',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        results: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                                description: 'ID của loại phương tiện',
                              },
                              name: {
                                type: 'string',
                                description: 'Tên của loại phương tiện',
                              },
                            },
                          },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            total: {
                              type: 'number',
                              description: 'Tổng số bản ghi',
                            },
                            page: {
                              type: 'number',
                              description: 'Trang hiện tại',
                            },
                            pageSize: {
                              type: 'number',
                              description: 'Kích thước trang',
                            },
                            totalPages: {
                              type: 'number',
                              description: 'Tổng số trang',
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
            description: 'Tham số truy vấn không hợp lệ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'error',
                    },
                    message: {
                      type: 'string',
                      example: 'common.invalidQueryParams',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Invalid sort or filters format',
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
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'error',
                    },
                    message: {
                      type: 'string',
                      example: 'common.unauthorized',
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Lỗi server',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'error',
                    },
                    message: {
                      type: 'string',
                      example: 'common.serverError',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal server error',
                        },
                        stack: {
                          type: 'string',
                          description: 'Stack trace (chỉ trong môi trường development)',
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
        summary: 'Xoá mềm loại phương tiện',
        description: 'Xoá mềm loại phương tiện bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
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
            description: 'Xoá mềm loại phương tiện thành công',
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
    // Vehicle
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
        summary: 'Xoá mềm phương tiện',
        description: 'Xoá mềm phương tiện bằng cách đánh dấu isDeleted (yêu cầu xác thực và quyền phù hợp)',
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
            description: 'Xoá mềm phương tiện thành công',
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
    // Trip
    '/trips': {
      get: {
        tags: ['Trip'],
        summary: 'Get list of trips with advanced filtering',
        description:
          'Retrieve a paginated or full list of trips with flexible filtering options including route, vehicle, price range, date/time, province, bus stops, and seat availability. Supports timezone-aware filtering and custom sorting.',
        parameters: [
          {
            name: 'routeId',
            in: 'query',
            description: 'Filter trips by route ID',
            schema: { type: 'string' },
          },
          {
            name: 'vehicleId',
            in: 'query',
            description: 'Filter trips by vehicle ID',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter trips by status',
            schema: {
              type: 'string',
              enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            },
          },
          {
            name: 'minPrice',
            in: 'query',
            description: 'Filter trips with base price greater than or equal to this value',
            schema: { type: 'number', format: 'float' },
          },
          {
            name: 'maxPrice',
            in: 'query',
            description: 'Filter trips with base price less than or equal to this value',
            schema: { type: 'number', format: 'float' },
          },
          {
            name: 'departureDate',
            in: 'query',
            description:
              'Filter trips with departure time on or after this date (ISO 8601 format, e.g., 2025-01-15T00:00:00+07:00)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'arrivalDate',
            in: 'query',
            description:
              'Filter trips with departure time on or before this date (ISO 8601 format, e.g., 2025-01-15T23:59:59+07:00). If no time is specified, defaults to end of day (23:59:59.999).',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'exactDate',
            in: 'query',
            description:
              'Filter trips with departure time on the exact date (from 00:00:00 to 23:59:59 in the specified timezone, e.g., 2025-01-15T00:00:00+07:00)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'sourceProvinceId',
            in: 'query',
            description: 'Filter trips by source province ID',
            schema: { type: 'string' },
          },
          {
            name: 'destinationProvinceId',
            in: 'query',
            description: 'Filter trips by destination province ID',
            schema: { type: 'string' },
          },
          {
            name: 'vehicleTypeIds',
            in: 'query',
            description:
              'Filter trips by vehicle type IDs (comma-separated string or array, e.g., "type1,type2" or vehicleTypeIds[]=type1&vehicleTypeIds[]=type2)',
            schema: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
          },
          {
            name: 'pickupStopIds',
            in: 'query',
            description:
              'Filter trips by pickup bus stop IDs (comma-separated string or array, e.g., "stop1,stop2" or pickupStopIds[]=stop1&pickupStopIds[]=stop2). Only matches stops where isPickUp is true.',
            schema: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
          },
          {
            name: 'dropoffStopIds',
            in: 'query',
            description:
              'Filter trips by dropoff bus stop IDs (comma-separated string or array, e.g., "stop1,stop2" or dropoffStopIds[]=stop1&dropoffStopIds[]=stop2). Only matches stops where isDropOff is true.',
            schema: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
          },
          {
            name: 'busStopIds',
            in: 'query',
            description:
              'Filter trips by bus stop IDs (pickup or dropoff, comma-separated string or array, e.g., "stop1,stop2" or busStopIds[]=stop1&busStopIds[]=stop2)',
            schema: {
              oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
          },
          {
            name: 'hasAvailableSeats',
            in: 'query',
            description: 'Filter trips that have at least one available seat (true/false)',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
          {
            name: 'timeRanges',
            in: 'query',
            description:
              'Filter trips by departure time ranges in the specified timezone. Accepts either a comma-separated string of ranges (e.g., "1-5,7-12,23-2") or a JSON array of objects (e.g., [{"start":1,"end":5},{"start":7,"end":12}]). Hours are 0-23.',
            schema: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      start: { type: 'integer', minimum: 0, maximum: 23 },
                      end: { type: 'integer', minimum: 0, maximum: 23 },
                    },
                    required: ['start', 'end'],
                  },
                },
              ],
            },
            examples: {
              simpleFormat: { value: '1-5,7-12,23-2' },
              jsonFormat: { value: '[{"start":1,"end":5},{"start":7,"end":12}]' },
            },
          },
          {
            name: 'timezone',
            in: 'query',
            description:
              'Timezone for departure time filtering (IANA format, e.g., Asia/Ho_Chi_Minh). Defaults to Asia/Ho_Chi_Minh if not provided.',
            schema: { type: 'string', default: 'Asia/Ho_Chi_Minh' },
          },
          {
            name: 'search',
            in: 'query',
            description:
              'Search term to filter trips by specific fields (e.g., route name, route code, vehicle license plate)',
            schema: { type: 'string' },
          },
          {
            name: 'searchFields',
            in: 'query',
            description:
              'Fields to search in (comma-separated, e.g., "route.name,route.code,vehicle.licensePlate"). Defaults to these fields if not specified.',
            schema: { type: 'string' },
          },
          {
            name: 'sort',
            in: 'query',
            description:
              'Sort criteria in JSON format (e.g., [{"field":"departureTime","order":"asc"}]). Defaults to sorting by departureTime in ascending order.',
            schema: { type: 'string' },
            examples: {
              singleSort: { value: '[{"field":"departureTime","order":"asc"}]' },
              multipleSort: { value: '[{"field":"basePrice","order":"desc"},{"field":"departureTime","order":"asc"}]' },
            },
          },
          {
            name: 'filters',
            in: 'query',
            description: 'Additional custom filters in JSON format (e.g., {"customField":{"equals":"value"}})',
            schema: { type: 'string' },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            description: 'Number of items per page',
            schema: { type: 'integer', default: 10, minimum: 1 },
          },
          {
            name: 'returnAll',
            in: 'query',
            description: 'Return all results without pagination (true/false)',
            schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages (e.g., en, vi)',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'List of trips retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', description: 'Response message' },
                    data: {
                      type: 'object',
                      properties: {
                        outboundTrips: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/TripWithDetails' },
                            },
                            pagination: {
                              type: 'object',
                              properties: {
                                page: { type: 'integer', description: 'Current page number' },
                                pageSize: { type: 'integer', description: 'Number of items per page' },
                                totalCount: { type: 'integer', description: 'Total number of trips' },
                                totalPages: { type: 'integer', description: 'Total number of pages' },
                                hasNextPage: { type: 'boolean', description: 'Whether there is a next page' },
                                hasPrevPage: { type: 'boolean', description: 'Whether there is a previous page' },
                              },
                            },
                          },
                        },
                        returnTrips: {
                          type: 'object',
                          description: 'Placeholder for return trips (currently empty)',
                          properties: {},
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Trip'],
        summary: 'Create a new trip',
        description: 'Create a new trip with associated seats and optional image. Requires admin authentication.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string', description: 'ID of the route' },
                  vehicleId: { type: 'string', description: 'ID of the vehicle' },
                  departureTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Departure time in ISO format',
                  },
                  arrivalTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Arrival time in ISO format',
                  },
                  basePrice: { type: 'number', description: 'Base price of the trip' },
                  specialPrice: {
                    type: 'number',
                    description: 'Special price (optional)',
                    nullable: true,
                  },
                  image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional trip image',
                  },
                },
                required: ['routeId', 'vehicleId', 'departureTime', 'arrivalTime', 'basePrice'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Trip created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/TripWithDetails' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Route or vehicle not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/search': {
      get: {
        tags: ['Trip'],
        summary: 'Search trips by source and destination',
        description:
          'Search for trips based on source province, destination province, departure date, and optional return date or price range.',
        parameters: [
          {
            name: 'sourceProvinceId',
            in: 'query',
            description: 'ID of the source province',
            schema: { type: 'string' },
          },
          {
            name: 'destinationProvinceId',
            in: 'query',
            description: 'ID of the destination province',
            schema: { type: 'string' },
          },
          {
            name: 'departureDate',
            in: 'query',
            description: 'Departure date (ISO format)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'returnDate',
            in: 'query',
            description: 'Return date for round-trip search (optional, ISO format)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'minPrice',
            in: 'query',
            description: 'Minimum price filter',
            schema: { type: 'number' },
          },
          {
            name: 'maxPrice',
            in: 'query',
            description: 'Maximum price filter',
            schema: { type: 'number' },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            description: 'Number of items per page',
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Search results retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    outboundTrips: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/TripWithDetails' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            pageSize: { type: 'integer' },
                            totalCount: { type: 'integer' },
                            totalPages: { type: 'integer' },
                          },
                        },
                      },
                    },
                    returnTrips: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/TripWithDetails' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            pageSize: { type: 'integer' },
                            totalCount: { type: 'integer' },
                            totalPages: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/details/{id}': {
      get: {
        tags: ['Trip'],
        summary: 'Get trip details',
        description:
          'Retrieve detailed information about a specific trip, including route, vehicle, seats, and driver info.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Trip details retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/TripWithDetails' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Trip'],
        summary: 'Update a trip',
        description:
          'Update trip details such as route, vehicle, times, prices, or status. Requires admin authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string', description: 'ID of the route' },
                  vehicleId: { type: 'string', description: 'ID of the vehicle' },
                  departureTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Departure time in ISO format',
                  },
                  arrivalTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Arrival time in ISO format',
                  },
                  basePrice: { type: 'number', description: 'Base price of the trip' },
                  specialPrice: {
                    type: 'number',
                    description: 'Special price (optional)',
                    nullable: true,
                  },
                  status: {
                    type: 'string',
                    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
                    description: 'Trip status',
                  },
                  changeReason: { type: 'string', description: 'Reason for the update' },
                  image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional trip image',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Trip updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/TripWithDetails' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data or status transition',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Trip, route, or vehicle not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Trip'],
        summary: 'Soft delete a trip',
        description: 'Soft delete a trip by marking it as deleted and cancelling it. Requires admin authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', description: 'Reason for deletion' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Trip deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Trip has active bookings',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/{id}/restore': {
      post: {
        tags: ['Trip'],
        summary: 'Restore a deleted trip',
        description: 'Restore a soft-deleted trip and set its status to SCHEDULED. Requires admin authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Trip restored successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Trip is not deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/{id}/seats': {
      get: {
        tags: ['Trip'],
        summary: 'Get available seats for a trip',
        description: 'Retrieve the seat configuration and availability for a specific trip. Requires authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Seats retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        trip: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            departureTime: { type: 'string', format: 'date-time' },
                            arrivalTime: { type: 'string', format: 'date-time' },
                            basePrice: { type: 'number' },
                            specialPrice: { type: 'number', nullable: true },
                            status: {
                              type: 'string',
                              enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
                            },
                          },
                        },
                        seatConfiguration: { type: 'object' },
                        seats: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Seat' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/{id}/seats/availability': {
      get: {
        tags: ['Trip'],
        summary: 'Check seat availability for a trip',
        description: 'Check the availability of seats for a specific trip, including seat configuration and status.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Seat availability retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        tripId: { type: 'string' },
                        departureTime: { type: 'string', format: 'date-time' },
                        arrivalTime: { type: 'string', format: 'date-time' },
                        seatConfiguration: { type: 'object' },
                        seats: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              seatNumber: { type: 'string' },
                              seatType: { type: 'string', enum: ['STANDARD', 'PREMIUM', 'VIP'] },
                              status: {
                                type: 'string',
                                enum: ['AVAILABLE', 'BOOKED', 'RESERVED'],
                              },
                              isAvailable: { type: 'boolean' },
                            },
                          },
                        },
                        totalSeats: { type: 'integer' },
                        availableSeats: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/{id}/seats/{seatId}': {
      put: {
        tags: ['Trip'],
        summary: 'Update seat status',
        description: 'Update the status of a specific seat for a trip. Requires admin authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'seatId',
            in: 'path',
            required: true,
            description: 'ID of the seat',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['AVAILABLE', 'BOOKED', 'RESERVED'],
                    description: 'New seat status',
                  },
                  reason: { type: 'string', description: 'Reason for status change' },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Seat status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Seat' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid status or seat is booked/reserved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Trip or seat not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/calendar-view': {
      get: {
        tags: ['Trip'],
        summary: 'Get trips by date range for calendar view',
        description:
          'Retrieve trips within a specified date range formatted as calendar events. Requires authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: true,
            description: 'Start date of the range (ISO format)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'endDate',
            in: 'query',
            required: true,
            description: 'End date of the range (ISO format)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Calendar events retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                          start: { type: 'string', format: 'date-time' },
                          end: { type: 'string', format: 'date-time' },
                          bookings: { type: 'integer' },
                          availableSeats: { type: 'integer' },
                          status: {
                            type: 'string',
                            enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
                          },
                          routeName: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Missing or invalid date range',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/export/data': {
      get: {
        tags: ['Trip'],
        summary: 'Export trip data',
        description: 'Export trip data in JSON or CSV format with optional filters. Requires admin authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            description: 'Start date for filtering trips (ISO format)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'endDate',
            in: 'query',
            description: 'End date for filtering trips (ISO format)',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'routeId',
            in: 'query',
            description: 'Filter by route ID',
            schema: { type: 'string' },
          },
          {
            name: 'format',
            in: 'query',
            description: 'Export format',
            schema: { type: 'string', enum: ['json', 'csv'], default: 'json' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Trip data exported successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          route: { type: 'string' },
                          departureTime: { type: 'string', format: 'date-time' },
                          arrivalTime: { type: 'string', format: 'date-time' },
                          status: {
                            type: 'string',
                            enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
                          },
                          vehicle: { type: 'string' },
                          driver: { type: 'string' },
                          basePrice: { type: 'number' },
                          specialPrice: { type: 'number', nullable: true },
                          totalBookings: { type: 'integer' },
                          availableSeats: { type: 'integer' },
                          confirmedBookings: { type: 'integer' },
                          pendingBookings: { type: 'integer' },
                          totalRevenue: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
              'text/csv': {
                schema: {
                  type: 'string',
                  description: 'CSV formatted data',
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/trips/{id}/history': {
      get: {
        tags: ['Trip'],
        summary: 'Get trip history',
        description: 'Retrieve the change history for a specific trip. Requires authentication.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the trip',
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Trip history retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          tripId: { type: 'string' },
                          changedFields: { type: 'object' },
                          changedBy: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              email: { type: 'string', nullable: true },
                              avatarUrl: { type: 'string', nullable: true },
                            },
                          },
                          changeReason: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Booking endpoints
    '/bookings/calculate': {
      post: {
        tags: ['Booking'],
        summary: 'Tính toán giá đặt vé với mã giảm giá',
        description: 'Tính toán chi phí đặt vé dựa trên chuyến đi, số lượng ghế và mã giảm giá (nếu có)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tripId: {
                    type: 'string',
                    description: 'ID của chuyến đi',
                    example: '507f1f77bcf86cd799439012',
                  },
                  seatCount: {
                    type: 'number',
                    description: 'Số lượng ghế muốn đặt',
                    example: 2,
                  },
                  voucherCode: {
                    type: 'string',
                    description: 'Mã giảm giá (tùy chọn)',
                    example: 'SUMMER2025',
                  },
                },
                required: ['tripId', 'seatCount'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tính toán giá thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.calculated' },
                    data: {
                      type: 'object',
                      properties: {
                        tripId: { type: 'string', example: '507f1f77bcf86cd799439012' },
                        seatCount: { type: 'number', example: 2 },
                        basePrice: { type: 'number', example: 100000 },
                        totalPrice: { type: 'number', example: 200000 },
                        voucher: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: 'SUMMER2025' },
                            name: { type: 'string', example: 'Summer Discount' },
                            discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED'], example: 'PERCENTAGE' },
                            discountValue: { type: 'number', example: 10 },
                          },
                        },
                        discountAmount: { type: 'number', example: 20000 },
                        finalPrice: { type: 'number', example: 180000 },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ hoặc mã giảm giá không hợp lệ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'voucher.invalid' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Chuyến đi không tìm thấy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'trip.notFound' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/bookings': {
      post: {
        tags: ['Booking'],
        summary: 'Tạo mới một đặt vé',
        description:
          'Tạo đặt vé mới với thông tin chuyến đi, ghế và mã giảm giá (nếu có). Hỗ trợ đặt vé cho khách không đăng nhập.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tripId: {
                    type: 'string',
                    description: 'ID của chuyến đi',
                    example: '507f1f77bcf86cd799439012',
                  },
                  seatIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Danh sách ID của các ghế được chọn',
                    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
                    minItems: 1,
                  },
                  voucherCode: {
                    type: 'string',
                    description: 'Mã giảm giá (yêu cầu xác thực)',
                    example: 'SUMMER2025',
                  },
                  passengerName: {
                    type: 'string',
                    description: 'Tên khách hàng (dùng cho đặt vé không đăng nhập)',
                    example: 'John Doe',
                  },
                  passengerPhone: {
                    type: 'string',
                    description: 'Số điện thoại khách hàng (dùng cho đặt vé không đăng nhập)',
                    example: '+84123456789',
                  },
                  passengerEmail: {
                    type: 'string',
                    format: 'email',
                    description: 'Email khách hàng (dùng cho đặt vé không đăng nhập)',
                    example: 'john.doe@example.com',
                  },
                  pickupId: {
                    type: 'string',
                    description: 'Id của bus stop điểm đón',
                    example: '507f1f77bcf86cd799439014',
                  },
                  dropoffId: {
                    type: 'string',
                    description: 'Id của bus stop điểm đến',
                    example: '507f1f77bcf86cd799439015',
                  },
                  passengerNote: {
                    type: 'string',
                    description: 'Ghi chú của khách hàng',
                    example: 'Gần cửa sổ',
                  },
                },
                required: ['tripId', 'seatIds'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Booking created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        operationId: 'updateBooking',
        tags: ['Booking'],
        summary: 'Cập nhật đặt vé',
        description: 'Cập nhật thông tin của một đặt vé hiện có',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '507f1f77bcf86cd799439014' },
                  // Add fields to update
                },
                required: ['id'],
              },
            },
          },
        },
        parameters: [
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Cập nhật đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.updated' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/my-bookings': {
      get: {
        operationId: 'getUserBookings',
        tags: ['Booking'],
        summary: 'Lấy danh sách đặt vé của người dùng',
        description:
          'Trả về danh sách đặt vé của người dùng hiện tại với hỗ trợ phân trang, tìm kiếm, lọc, và sắp xếp. Dữ liệu trả về được định dạng theo chế độ xem (view mode) được chỉ định.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Số trang (mặc định: 1)',
            schema: { type: 'integer', example: 1, minimum: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            description: 'Số lượng bản ghi mỗi trang (mặc định: 10)',
            schema: { type: 'integer', example: 10, minimum: 1 },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Từ khóa tìm kiếm',
            schema: { type: 'string', example: 'HCM' },
          },
          {
            name: 'searchFields',
            in: 'query',
            description: 'Các trường để tìm kiếm (phân tách bởi dấu phẩy). Tùy thuộc vào view mode nếu không chỉ định.',
            schema: { type: 'string', example: 'passengerName,passengerEmail' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Lọc theo trạng thái đặt vé',
            schema: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
              example: 'CONFIRMED',
            },
          },
          {
            name: 'startDate',
            in: 'query',
            description: 'Ngày bắt đầu tạo đặt vé (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-01T00:00:00Z' },
          },
          {
            name: 'endDate',
            in: 'query',
            description: 'Ngày kết thúc tạo đặt vé (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-30T23:59:59Z' },
          },
          {
            name: 'tripDepartureStart',
            in: 'query',
            description: 'Thời gian khởi hành chuyến đi từ (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-04T08:00:00Z' },
          },
          {
            name: 'tripDepartureEnd',
            in: 'query',
            description: 'Thời gian khởi hành chuyến đi đến (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-04T23:59:59Z' },
          },
          {
            name: 'tripArrivalStart',
            in: 'query',
            description: 'Thời gian đến chuyến đi từ (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-04T12:00:00Z' },
          },
          {
            name: 'tripArrivalEnd',
            in: 'query',
            description: 'Thời gian đến chuyến đi đến (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-04T23:59:59Z' },
          },
          {
            name: 'tripStartDate',
            in: 'query',
            description: 'Ngày khởi hành chuyến đi từ (hỗ trợ legacy, ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-04T00:00:00Z' },
          },
          {
            name: 'tripEndDate',
            in: 'query',
            description: 'Ngày khởi hành chuyến đi đến (hỗ trợ legacy, ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-09-04T23:59:59Z' },
          },
          {
            name: 'busType',
            in: 'query',
            description: 'Loại phương tiện (lọc theo tên loại xe)',
            schema: { type: 'string', example: 'Xe giường nằm' },
          },
          {
            name: 'sort',
            in: 'query',
            description: 'Sắp xếp theo trường và thứ tự (JSON string, ví dụ: [{"field":"createdAt","order":"desc"}])',
            schema: {
              type: 'string',
              example: '[{"field":"createdAt","order":"desc"}]',
            },
          },
          {
            name: 'sortFilter',
            in: 'query',
            description: 'Tùy chọn sắp xếp nhanh (latest: mới nhất, oldest: cũ nhất)',
            schema: { type: 'string', enum: ['latest', 'oldest'], example: 'latest' },
          },
          {
            name: 'filters',
            in: 'query',
            description: 'Bộ lọc bổ sung (JSON string)',
            schema: { type: 'string', example: '{"paymentStatus":"PAID"}' },
          },
          {
            name: 'view',
            in: 'query',
            description: 'Chế độ xem của dữ liệu trả về',
            schema: {
              type: 'string',
              enum: ['default', 'history', 'summary', 'export'],
              example: 'default',
            },
          },
          {
            name: 'returnAll',
            in: 'query',
            description: 'Trả về tất cả bản ghi, bỏ qua phân trang (true/false)',
            schema: { type: 'boolean', example: false },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo (mặc định: en)',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Lấy danh sách đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.listRetrieved' },
                    data: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          description: 'Danh sách đặt vé, định dạng phụ thuộc vào view mode',
                          items: {
                            anyOf: [
                              { $ref: '#/components/schemas/BookingDefaultList' },
                              { $ref: '#/components/schemas/BookingHistoryList' },
                              { $ref: '#/components/schemas/BookingSummaryList' },
                              { $ref: '#/components/schemas/BookingExportList' },
                            ],
                          },
                        },
                        meta: {
                          type: 'object',
                          description: 'Thông tin phân trang',
                          properties: {
                            page: { type: 'integer', example: 1 },
                            pageSize: { type: 'integer', example: 10 },
                            totalCount: { type: 'integer', example: 50 },
                            totalPages: { type: 'integer', example: 5 },
                            hasNextPage: { type: 'boolean', example: true },
                            hasPrevPage: { type: 'boolean', example: false },
                          },
                        },
                        view: {
                          type: 'string',
                          description: 'Chế độ xem được sử dụng',
                          enum: ['default', 'history', 'summary', 'export'],
                          example: 'default',
                        },
                      },
                    },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Yêu cầu không hợp lệ (ví dụ: view mode không hợp lệ)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Lỗi máy chủ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/admin/all': {
      get: {
        operationId: 'getAllBookings',
        tags: ['Booking', 'Admin'],
        summary: 'Lấy tất cả đặt vé (quản trị viên)',
        description: 'Trả về danh sách tất cả các đặt vé (yêu cầu quyền quản trị viên)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Lấy danh sách tất cả đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.allRetrieved' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Booking' },
                    },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Yêu cầu quyền quản trị viên',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/admin/stats': {
      get: {
        operationId: 'getBookingStats',
        tags: ['Booking', 'Admin'],
        summary: 'Lấy thống kê đặt vé (quản trị viên)',
        description: 'Trả về thống kê về các đặt vé (yêu cầu quyền quản trị viên)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Lấy thống kê đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.statsRetrieved' },
                    data: {
                      type: 'object',
                      properties: {
                        totalBookings: { type: 'number', example: 100 },
                        pendingBookings: { type: 'number', example: 20 },
                        confirmedBookings: { type: 'number', example: 70 },
                        cancelledBookings: { type: 'number', example: 10 },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Yêu cầu quyền quản trị viên',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/admin/export': {
      get: {
        operationId: 'exportBookingData',
        tags: ['Booking', 'Admin'],
        summary: 'Xuất dữ liệu đặt vé (quản trị viên)',
        description: 'Xuất dữ liệu tất cả các đặt vé dưới dạng file (yêu cầu quyền quản trị viên)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Xuất dữ liệu đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.dataExported' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/BookingExport' },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Yêu cầu quyền quản trị viên',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}/admin/confirm': {
      post: {
        operationId: 'confirmBookingManually',
        tags: ['Booking', 'Admin'],
        summary: 'Xác nhận đặt vé thủ công (quản trị viên)',
        description: 'Xác nhận một đặt vé thủ công (yêu cầu quyền quản trị viên)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID của đặt vé',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439014' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  // Define fields needed for manual confirmation
                  notes: { type: 'string', example: 'Confirmed by admin', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Xác nhận đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.confirmed' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ hoặc đặt vé không thể xác nhận',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Yêu cầu quyền quản trị viên',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}/payment/qr-code': {
      get: {
        tags: ['Booking'],
        summary: 'Lấy mã QR thanh toán cho đặt vé',
        description: 'Lấy mã QR thanh toán VietQR cho một đặt vé đang chờ xử lý.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID của đặt vé',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Tạo mã QR thanh toán thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.qrGenerated' },
                    data: {
                      type: 'object',
                      properties: {
                        bookingId: { type: 'string', example: '507f1f77bcf86cd799439014' },
                        qrCode: {
                          type: 'string',
                          example: 'https://img.vietqr.io/image/...',
                        },
                        qrCodeExpiresAt: { type: 'string', format: 'date-time', example: '2025-07-02T10:00:00Z' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Đặt vé không ở trạng thái chờ xử lý',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'booking.alreadyProcessed' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực hoặc không có quyền',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'booking.notFound' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'generatePaymentQR',
        tags: ['Booking'],
        summary: 'Tạo mã QR thanh toán',
        description: 'Tạo mã QR thanh toán cho một đặt vé',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  // Define fields needed for QR code generation
                  amount: { type: 'number', example: 180000 },
                },
                required: ['amount'],
              },
            },
          },
        },
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID của đặt vé',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439014' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Tạo mã QR thanh toán thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.qrCodeGenerated' },
                    data: {
                      type: 'object',
                      properties: {
                        bookingId: { type: 'string', example: '507f1f77bcf86cd799439014' },
                        qrCode: {
                          type: 'string',
                          example:
                            '{"type":"VietQR","bankId":"970436","accountNo":"0123456789","amount":180000,"addInfo":"BKG12345678901234","url":"https://img.vietqr.io/image/..."}',
                        },
                        qrCodeExpiresAt: { type: 'string', format: 'date-time', example: '2025-07-02T10:00:00Z' },
                      },
                      required: ['bookingId', 'qrCode', 'qrCodeExpiresAt'],
                    },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu không hợp lệ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}': {
      get: {
        operationId: 'getBookingDetails',
        tags: ['Booking'],
        summary: 'Lấy chi tiết đặt vé',
        description: 'Trả về chi tiết của một đặt vé cụ thể dựa trên ID.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID của đặt vé',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo (mặc định: en)',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Lấy chi tiết đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.detailsRetrieved' },
                    data: { $ref: '#/components/schemas/BookingDetails' },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Yêu cầu không hợp lệ (ví dụ: không tìm thấy chuyến đi trong đặt vé)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Không có quyền truy cập',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Lỗi máy chủ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}/cancel': {
      post: {
        operationId: 'cancelBooking',
        tags: ['Booking'],
        summary: 'Hủy đặt vé',
        description: 'Hủy một đặt vé của người dùng hoặc quản trị viên',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID của đặt vé',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439014' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: {
                    type: 'string',
                    description: 'Lý do hủy đặt vé',
                    example: 'Kế hoạch thay đổi',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Hủy đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.cancelled' },
                  },
                  required: ['success', 'message'],
                },
              },
            },
          },
          '400': {
            description: 'Đặt vé đã bị hủy hoặc chuyến đi đã khởi hành',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực hoặc không có quyền',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}/resend-payment': {
      post: {
        operationId: 'resendPaymentQR',
        tags: ['Booking'],
        summary: 'Gửi lại mã QR thanh toán',
        description: 'Gửi lại mã QR thanh toán cho một đặt vé đang chờ xử lý',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID của đặt vé',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439014' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {},
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Gửi lại mã QR thanh toán thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.paymentQrResent' },
                    data: {
                      type: 'object',
                      properties: {
                        bookingId: { type: 'string', example: '507f1f77bcf86cd799439014' },
                        qrCode: {
                          type: 'string',
                          example:
                            '{"type":"VietQR","bankId":"970436","accountNo":"0123456789","amount":180000,"addInfo":"BKG12345678901234","url":"https://img.vietqr.io/image/..."}',
                        },
                        qrCodeExpiresAt: { type: 'string', format: 'date-time', example: '2025-07-02T10:00:00Z' },
                      },
                      required: ['bookingId', 'qrCode', 'qrCodeExpiresAt'],
                    },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Đặt vé không ở trạng thái chờ xử lý',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực hoặc không có quyền',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/{id}/history': {
      get: {
        operationId: 'getBookingHistory',
        tags: ['Booking'],
        summary: 'Lấy lịch sử thay đổi của đặt vé',
        description: 'Trả về lịch sử các thay đổi của một đặt vé, bao gồm thông tin người thực hiện thay đổi',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: 'ID của đặt vé',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439014' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Ngôn ngữ trả về thông báo',
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Lấy lịch sử đặt vé thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'booking.historyRetrieved' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/BookingHistory' },
                    },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Yêu cầu không hợp lệ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực hoặc không có quyền',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Không có quyền truy cập lịch sử đặt vé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Đặt vé không tìm thấy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/bookings/webhook/payment': {
      post: {
        tags: ['Booking'],
        summary: 'Xử lý webhook thanh toán từ SePay',
        description: 'Xử lý thông báo thanh toán từ dịch vụ SePay để xác nhận đặt vé',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  gateway: { type: 'string', example: 'SePay' },
                  transactionDate: { type: 'string', format: 'date-time', example: '2025-07-02T09:47:00Z' },
                  accountNumber: { type: 'string', example: '0123456789' },
                  code: { type: 'string', example: 'PAYMENT_SUCCESS' },
                  content: { type: 'string', example: 'BKG12345678901234 John Doe' },
                  transferType: { type: 'string', example: 'TRANSFER' },
                  transferAmount: { type: 'string', example: '180000' },
                  accumulated: { type: 'string', example: '180000' },
                  referenceCode: { type: 'string', example: 'BKG12345678901234' },
                  description: { type: 'string', example: 'Payment for booking' },
                },
                required: ['content', 'transferAmount'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Webhook được xử lý thành công',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'payment.webhookReceived' },
                    data: {
                      type: 'object',
                      properties: {
                        bookingId: { type: 'string', example: '507f1f77bcf86cd799439014' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dữ liệu webhook không hợp lệ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'payment.invalidWebhookPayload' },
                  },
                },
              },
            },
          },
        },
      },
    },
    // Ticket
    '/tickets/generate/{bookingId}': {
      post: {
        tags: ['Ticket'],
        summary: 'Generate tickets for a booking',
        description: 'Generates tickets for a specific booking identified by bookingId',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'bookingId',
            in: 'path',
            description: 'ID of the booking',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '201': {
            description: 'Tickets generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'ticket.generated' },
                    data: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer', example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/tickets/unchecked-in/{bookingId}': {
      get: {
        tags: ['Ticket'],
        summary: 'Get unchecked-in tickets',
        description: 'Retrieves all unchecked-in tickets for a specific booking',
        parameters: [
          {
            name: 'bookingId',
            in: 'path',
            description: 'ID of the booking',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Unchecked-in tickets retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'ticket.fetchedUncheckedIn' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Ticket' },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'No unchecked-in tickets found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'ticket.noUncheckedIn' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/tickets/check-in/{ticketId}': {
      patch: {
        tags: ['Ticket'],
        summary: 'Check in a ticket',
        description: 'Checks in a specific ticket, restricted to staff or admin users',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'ticketId',
            in: 'path',
            description: 'ID of the ticket',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Ticket checked in successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'ticket.checkedIn' },
                    data: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required or insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'ticket.notFound' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/tickets/check-in/bulk/{bookingTripId}': {
      patch: {
        tags: ['Ticket'],
        summary: 'Bulk check-in tickets',
        description:
          'Checks in all unchecked-in tickets for a specific booking trip, restricted to staff or admin users',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'bookingTripId',
            in: 'path',
            description: 'ID of the booking trip',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Tickets checked in successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'ticket.bulkCheckedIn' },
                    data: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer', example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required or insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'No unchecked-in tickets found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'ticket.noUncheckedIn' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/tickets/pdf': {
      get: {
        tags: ['Ticket'],
        summary: 'Get ticket PDF',
        description: 'Retrieves the PDF version of a specific ticket',
        security: [{ BearerAuth: [] }],

        parameters: [
          {
            name: 'bookingId',
            in: 'query',
            description: 'ID of the booking',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'seatNumber',
            in: 'query',
            description: 'Seat number of the ticket',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Ticket PDF retrieved successfully',
            content: {
              'application/pdf': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/tickets/regenerate/{ticketId}': {
      post: {
        tags: ['Ticket'],
        summary: 'Regenerate ticket QR code',
        description: 'Regenerates the QR code for a specific ticket',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'ticketId',
            in: 'path',
            description: 'ID of the ticket',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'lang',
            in: 'query',
            description: 'Language for response messages',
            schema: { type: 'string', default: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Ticket QR code regenerated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'ticket.regenerated' },
                    data: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'ticket.notFound' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    // System Config
    '/system-config': {
      get: {
        tags: ['System Config'],
        summary: 'Get public system configuration',
        description: 'Retrieves minimal system configuration information for public display',
        responses: {
          '200': {
            description: 'System configuration retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'systemConfig.publicRetrieved' },
                    data: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: 'Bus Company', description: 'Company name' },
                        globalName: { type: 'string', example: 'Bus Company', description: 'Company name in English' },
                        logo: {
                          type: 'string',
                          nullable: true,
                          example: 'logo-1234567890abcdef.webp',
                          description: 'Logo file key',
                        },
                        logoDark: {
                          type: 'string',
                          nullable: true,
                          example: 'logoDark-1234567890abcdef.webp',
                          description: 'Logo dark file key',
                        },
                        textLogo: {
                          type: 'string',
                          nullable: true,
                          example: 'textLogo-1234567890abcdef.webp',
                          description: 'Text logo file key',
                        },
                        textLogoDark: {
                          type: 'string',
                          nullable: true,
                          example: 'textLogoDark-1234567890abcdef.webp',
                          description: 'Text logo dark file key',
                        },
                        isMaintaining: { type: 'boolean', example: false, description: 'Maintenance mode status' },
                        maintenanceStartTime: {
                          type: 'string',
                          format: 'date-time',
                          nullable: true,
                          example: '2025-07-18T14:00:00.000Z',
                          description: 'Maintenance start time',
                        },
                        maintenanceEndTime: {
                          type: 'string',
                          format: 'date-time',
                          nullable: true,
                          example: '2025-07-18T16:00:00.000Z',
                          description: 'Maintenance end time',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'System configuration not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.notFound' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.getError' },
                    error: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        message: { type: 'string', example: 'Internal server error' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['System Config'],
        summary: 'Create new system configuration',
        description: 'Creates a new system configuration and deactivates existing ones (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Bus Company', description: 'Company name' },
                  globalName: { type: 'string', example: 'Bus Company', description: 'Company name in English' },
                  rateLimit: { type: 'number', example: 100, description: 'General rate limit' },
                  rateLimitWindow: {
                    type: 'number',
                    example: 900000,
                    description: 'General rate limit window in milliseconds',
                  },
                  emailRateLimit: { type: 'number', example: 10, description: 'Email rate limit' },
                  emailRateLimitWindow: {
                    type: 'number',
                    example: 3600000,
                    description: 'Email rate limit window in milliseconds',
                  },
                  maxLoginAttempts: { type: 'number', example: 5, description: 'Maximum login attempts' },
                  loginLockDuration: {
                    type: 'number',
                    example: 1800000,
                    description: 'Login lock duration in milliseconds',
                  },
                  bookingRateLimit: { type: 'number', example: 20, description: 'Booking rate limit' },
                  bookingRateLimitWindow: {
                    type: 'number',
                    example: 3600000,
                    description: 'Booking rate limit window in milliseconds',
                  },
                  isMaintaining: { type: 'boolean', example: false, description: 'Maintenance mode status' },
                  maintenanceStartTime: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-07-18T14:00:00.000Z',
                    description: 'Maintenance start time',
                  },
                  maintenanceEndTime: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-07-18T16:00:00.000Z',
                    description: 'Maintenance end time',
                  },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'System configuration created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'systemConfig.created' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'Bus Company' },
                        globalName: { type: 'string', example: 'Bus Company' },
                        rateLimit: { type: 'number', example: 100 },
                        rateLimitWindow: { type: 'number', example: 900000 },
                        emailRateLimit: { type: 'number', example: 10 },
                        emailRateLimitWindow: { type: 'number', example: 3600000 },
                        maxLoginAttempts: { type: 'number', example: 5 },
                        loginLockDuration: { type: 'number', example: 1800000 },
                        bookingRateLimit: { type: 'number', example: 20 },
                        bookingRateLimitWindow: { type: 'number', example: 3600000 },
                        isMaintaining: { type: 'boolean', example: false },
                        maintenanceStartTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T14:00:00.000Z',
                        },
                        maintenanceEndTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T16:00:00.000Z',
                        },
                        lastUpdatedBy: { type: 'string', example: '507f1f77bcf86cd799439012' },
                      },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.createError' },
                    error: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        message: { type: 'string', example: 'Internal server error' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['System Config'],
        summary: 'Update system configuration',
        description: 'Updates the existing active system configuration (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '507f1f77bcf86cd799439011', description: 'System configuration ID' },
                  name: { type: 'string', example: 'Bus Company', description: 'Company name' },
                  globalName: { type: 'string', example: 'Bus Company', description: 'Company name in English' },
                  rateLimit: { type: 'number', example: 100, description: 'General rate limit' },
                  rateLimitWindow: {
                    type: 'number',
                    example: 900000,
                    description: 'General rate limit window in milliseconds',
                  },
                  emailRateLimit: { type: 'number', example: 10, description: 'Email rate limit' },
                  emailRateLimitWindow: {
                    type: 'number',
                    example: 3600000,
                    description: 'Email rate limit window in milliseconds',
                  },
                  maxLoginAttempts: { type: 'number', example: 5, description: 'Maximum login attempts' },
                  loginLockDuration: {
                    type: 'number',
                    example: 1800000,
                    description: 'Login lock duration in milliseconds',
                  },
                  bookingRateLimit: { type: 'number', example: 20, description: 'Booking rate limit' },
                  bookingRateLimitWindow: {
                    type: 'number',
                    example: 3600000,
                    description: 'Booking rate limit window in milliseconds',
                  },
                  isMaintaining: { type: 'boolean', example: false, description: 'Maintenance mode status' },
                  maintenanceStartTime: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-07-18T14:00:00.000Z',
                    description: 'Maintenance start time',
                  },
                  maintenanceEndTime: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-07-18T16:00:00.000Z',
                    description: 'Maintenance end time',
                  },
                },
                required: ['id'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'System configuration updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'systemConfig.updated' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'Bus Company' },
                        globalName: { type: 'string', example: 'Bus Company' },
                        rateLimit: { type: 'number', example: 100 },
                        rateLimitWindow: { type: 'number', example: 900000 },
                        emailRateLimit: { type: 'number', example: 10 },
                        emailRateLimitWindow: { type: 'number', example: 3600000 },
                        maxLoginAttempts: { type: 'number', example: 5 },
                        loginLockDuration: { type: 'number', example: 1800000 },
                        bookingRateLimit: { type: 'number', example: 20 },
                        bookingRateLimitWindow: { type: 'number', example: 3600000 },
                        isMaintaining: { type: 'boolean', example: false },
                        maintenanceStartTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T14:00:00.000Z',
                        },
                        maintenanceEndTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T16:00:00.000Z',
                        },
                        lastUpdatedBy: { type: 'string', example: '507f1f77bcf86cd799439012' },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'System configuration not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.notFound' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.updateError' },
                    error: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        message: { type: 'string', example: 'Internal server error' },
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
    '/system-config/admin': {
      get: {
        tags: ['System Config'],
        summary: 'Get full system configuration',
        description: 'Retrieves the complete system configuration (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'System configuration retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'systemConfig.retrieved' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'Bus Company' },
                        globalName: { type: 'string', example: 'Bus Company' },
                        logo: { type: 'string', nullable: true, example: 'logo-1234567890abcdef.webp' },
                        logoDark: { type: 'string', nullable: true, example: 'logoDark-1234567890abcdef.webp' },
                        textLogo: { type: 'string', nullable: true, example: 'textLogo-1234567890abcdef.webp' },
                        textLogoDark: { type: 'string', nullable: true, example: 'textLogoDark-1234567890abcdef.webp' },
                        rateLimit: { type: 'number', example: 100 },
                        rateLimitWindow: { type: 'number', example: 900000 },
                        emailRateLimit: { type: 'number', example: 10 },
                        emailRateLimitWindow: { type: 'number', example: 3600000 },
                        maxLoginAttempts: { type: 'number', example: 5 },
                        loginLockDuration: { type: 'number', example: 1800000 },
                        bookingRateLimit: { type: 'number', example: 20 },
                        bookingRateLimitWindow: { type: 'number', example: 3600000 },
                        isMaintaining: { type: 'boolean', example: false },
                        maintenanceStartTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T14:00:00.000Z',
                        },
                        maintenanceEndTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T16:00:00.000Z',
                        },
                        lastUpdatedBy: { type: 'string', example: '507f1f77bcf86cd799439012' },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'System configuration not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.notFound' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.getError' },
                    error: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        message: { type: 'string', example: 'Internal server error' },
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
    '/system-config/{id}/logo': {
      post: {
        tags: ['System Config'],
        summary: 'Upload system configuration logo',
        description: 'Uploads a logo or text logo for the system configuration (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  logoType: {
                    type: 'string',
                    enum: ['logo', 'logoDark', 'textLogo', 'textLogoDark'],
                    example: 'logo',
                    description: 'Type of logo to upload',
                  },
                  image: { type: 'string', format: 'binary', description: 'Logo image file (SVG or raster)' },
                },
                required: ['image'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logo uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'systemConfig.logoUploaded' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'Bus Company' },
                        globalName: { type: 'string', example: 'Bus Company' },
                        logo: { type: 'string', nullable: true, example: 'logo-1234567890abcdef.webp' },
                        logoDark: { type: 'string', nullable: true, example: 'logoDark-1234567890abcdef.webp' },
                        textLogoDark: { type: 'string', nullable: true, example: 'textLogoDark-1234567890abcdef.webp' },
                        rateLimit: { type: 'number', example: 100 },
                        rateLimitWindow: { type: 'number', example: 900000 },
                        emailRateLimit: { type: 'number', example: 10 },
                        emailRateLimitWindow: { type: 'number', example: 3600000 },
                        maxLoginAttempts: { type: 'number', example: 5 },
                        loginLockDuration: { type: 'number', example: 1800000 },
                        bookingRateLimit: { type: 'number', example: 20 },
                        bookingRateLimitWindow: { type: 'number', example: 3600000 },
                        isMaintaining: { type: 'boolean', example: false },
                        maintenanceStartTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T14:00:00.000Z',
                        },
                        maintenanceEndTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T16:00:00.000Z',
                        },
                        lastUpdatedBy: { type: 'string', example: '507f1f77bcf86cd799439012' },
                      },
                    },
                    metadata: {
                      type: 'object',
                      properties: {
                        logoType: { type: 'string', example: 'logo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.logoRequired' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'System configuration not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.notFound' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.logoUploadError' },
                    error: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        message: { type: 'string', example: 'Internal server error' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['System Config'],
        summary: 'Delete system configuration logo',
        description: 'Deletes the logo or text logo from the system configuration (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
          },
          {
            name: 'logoType',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['logo', 'logoDark', 'textLogo', 'textLogoDark'],
              example: 'logo',
              description: 'Type of logo to delete',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Logo deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'systemConfig.logoDeleted' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'Bus Company' },
                        globalName: { type: 'string', example: 'Bus Company' },
                        logo: { type: 'string', nullable: true, example: null },
                        logoDark: { type: 'string', nullable: true, example: null },
                        textLogo: { type: 'string', nullable: true, example: null },
                        textLogoDark: { type: 'string', nullable: true, example: null },
                        rateLimit: { type: 'number', example: 100 },
                        rateLimitWindow: { type: 'number', example: 900000 },
                        emailRateLimit: { type: 'number', example: 10 },
                        emailRateLimitWindow: { type: 'number', example: 3600000 },
                        maxLoginAttempts: { type: 'number', example: 5 },
                        loginLockDuration: { type: 'number', example: 1800000 },
                        bookingRateLimit: { type: 'number', example: 20 },
                        bookingRateLimitWindow: { type: 'number', example: 3600000 },
                        isMaintaining: { type: 'boolean', example: false },
                        maintenanceStartTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T14:00:00.000Z',
                        },
                        maintenanceEndTime: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-07-18T16:00:00.000Z',
                        },
                        lastUpdatedBy: { type: 'string', example: '507f1f77bcf86cd799439012' },
                      },
                    },
                    metadata: {
                      type: 'object',
                      properties: {
                        logoType: { type: 'string', example: 'logo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid logo type',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.invalidLogoType' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'System configuration not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.notFound' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'systemConfig.logoDeleteError' },
                    error: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        message: { type: 'string', example: 'Internal server error' },
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
    // Real-time
    '/socket.io': {
      get: {
        tags: ['Realtime'],
        summary: 'Kết nối Socket.IO',
        description: 'Khởi tạo kết nối thời gian thực với Socket.IO, hỗ trợ xác thực bằng JWT',
        parameters: [
          {
            name: 'token',
            in: 'query',
            description: 'JWT token để xác thực (tùy chọn cho các phòng công cộng)',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '101': {
            description: 'Kết nối WebSocket được thiết lập thành công',
          },
          '401': {
            description: 'Không được phép (token không hợp lệ hoặc thiếu cho phòng riêng tư)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Authentication required' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Realtime'],
        summary: 'Sự kiện Socket.IO',
        description: 'Xử lý các sự kiện thời gian thực cho đặt vé và quản lý phòng',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/JoinTripRoom' },
                  { $ref: '#/components/schemas/LeaveTripRoom' },
                  { $ref: '#/components/schemas/SelectSeat' },
                  { $ref: '#/components/schemas/ReleaseSeat' },
                  { $ref: '#/components/schemas/JoinBookingRoom' },
                  { $ref: '#/components/schemas/LeaveBookingRoom' },
                  { $ref: '#/components/schemas/SendPrivateMessage' },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sự kiện được xử lý thành công',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/SeatSelectionResponse' },
                    { $ref: '#/components/schemas/SeatReleaseResponse' },
                    { $ref: '#/components/schemas/RoomAccessResponse' },
                    { $ref: '#/components/schemas/SeatStatusChanged' },
                    { $ref: '#/components/schemas/BookingStatusChanged' },
                    { $ref: '#/components/schemas/PrivateMessage' },
                    { $ref: '#/components/schemas/SeatExpirationWarning' },
                  ],
                },
              },
            },
          },
          '401': {
            description: 'Yêu cầu xác thực cho các sự kiện riêng tư',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
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
      Trip: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          routeId: { type: 'string' },
          vehicleId: { type: 'string' },
          departureTime: { type: 'string', format: 'date-time' },
          arrivalTime: { type: 'string', format: 'date-time' },
          basePrice: { type: 'number' },
          specialPrice: { type: 'number', nullable: true },
          status: {
            type: 'string',
            enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
          },
          image: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      TripWithDetails: {
        allOf: [
          { $ref: '#/components/schemas/Trip' },
          {
            type: 'object',
            properties: {
              route: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  sourceProvince: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  destinationProvince: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
              vehicle: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  plateNumber: { type: 'string' },
                  vehicleType: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      seatConfiguration: { type: 'object' },
                    },
                  },
                  driver: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      phoneNumber: { type: 'string' },
                      avatarUrl: { type: 'string', nullable: true },
                    },
                  },
                },
              },
              seats: {
                type: 'array',
                items: { $ref: '#/components/schemas/Seat' },
              },
              availableSeats: { type: 'integer' },
            },
          },
        ],
      },
      Seat: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tripId: { type: 'string' },
          seatNumber: { type: 'string' },
          seatType: { type: 'string', enum: ['STANDARD', 'PREMIUM', 'VIP'] },
          status: { type: 'string', enum: ['AVAILABLE', 'BOOKED', 'RESERVED'] },
        },
      },
      SeatReservation: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID của người dùng đặt chỗ',
            example: '507f1f77bcf86cd799439011',
          },
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi',
            example: '507f1f77bcf86cd799439012',
          },
          seatId: {
            type: 'string',
            description: 'ID của ghế',
            example: '507f1f77bcf86cd799439013',
          },
          expireAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian hết hạn của đặt chỗ',
            example: '2025-07-02T10:00:00Z',
          },
          sessionId: {
            type: 'string',
            description: 'Mã định danh phiên (tùy chọn)',
            example: 'session-12345',
          },
        },
        required: ['userId', 'tripId', 'seatId', 'expireAt'],
      },
      SeatSelectionResponse: {
        type: 'object',
        properties: {
          seatId: {
            type: 'string',
            description: 'ID của ghế được chọn',
            example: '507f1f77bcf86cd799439013',
          },
          expireAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian hết hạn của đặt chỗ ghế',
            example: '2025-07-02T10:00:00Z',
          },
          error: {
            type: 'string',
            description: 'Thông báo lỗi nếu thao tác thất bại',
            example: 'Ghế đã được đặt',
          },
        },
        required: ['seatId'],
      },
      SeatReleaseResponse: {
        type: 'object',
        properties: {
          seatId: {
            type: 'string',
            description: 'ID của ghế được giải phóng',
            example: '507f1f77bcf86cd799439013',
          },
          error: {
            type: 'string',
            description: 'Thông báo lỗi nếu thao tác thất bại',
            example: 'Không tìm thấy đặt chỗ cho ghế này',
          },
        },
        required: ['seatId'],
      },
      SeatStatusChanged: {
        type: 'object',
        properties: {
          seatId: {
            type: 'string',
            description: 'ID của ghế',
            example: '507f1f77bcf86cd799439013',
          },
          status: {
            type: 'string',
            enum: ['AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED'],
            description: 'Trạng thái hiện tại của ghế',
            example: 'RESERVED',
          },
          seatNumber: {
            type: 'string',
            description: 'Số ghế',
            example: 'A1',
          },
          reservedBy: {
            type: 'string',
            description: 'ID của người dùng đã đặt ghế',
            example: '507f1f77bcf86cd799439011',
          },
          sessionId: {
            type: 'string',
            description: 'Mã định danh phiên',
            example: 'session-12345',
          },
          expireAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian hết hạn của đặt chỗ',
            example: '2025-07-02T10:00:00Z',
          },
          reason: {
            type: 'string',
            description: 'Lý do thay đổi trạng thái',
            example: 'expired',
          },
          updatedBy: {
            type: 'string',
            description: 'ID của người dùng đã cập nhật trạng thái',
            example: '507f1f77bcf86cd799439011',
          },
        },
        required: ['seatId', 'status'],
      },
      Booking: {
        type: 'object',
        properties: {
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi',
            example: '507f1f77bcf86cd799439012',
          },
          seatIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách ID của các ghế được chọn',
            example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
            minItems: 1,
          },
          voucherCode: {
            type: 'string',
            description: 'Mã giảm giá (yêu cầu xác thực)',
            example: 'SUMMER2025',
          },
          passengerName: {
            type: 'string',
            description: 'Tên khách hàng (dùng cho đặt vé không đăng nhập)',
            example: 'John Doe',
          },
          passengerPhone: {
            type: 'string',
            description: 'Số điện thoại khách hàng (dùng cho đặt vé không đăng nhập)',
            example: '+84123456789',
          },
          passengerEmail: {
            type: 'string',
            format: 'email',
            description: 'Email khách hàng (dùng cho đặt vé không đăng nhập)',
            example: 'john.doe@example.com',
          },
          pickupId: {
            type: 'string',
            description: 'Id của bus stop điểm đón',
            example: '507f1f77bcf86cd799439014',
          },
          dropoffId: {
            type: 'string',
            description: 'Id của bus stop điểm đến',
            example: '507f1f77bcf86cd799439015',
          },
          passengerNote: {
            type: 'string',
            description: 'Ghi chú của khách hàng',
            example: 'Gần cửa sổ',
          },
        },
        required: ['tripId', 'seatIds'],
        anyOf: [
          {
            required: ['passengerName', 'passengerPhone', 'passengerEmail'],
          },
          {
            not: {
              required: ['passengerName', 'passengerPhone', 'passengerEmail'],
            },
          },
        ],
      },
      BookingDefaultList: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID của đặt vé',
            example: '507f1f77bcf86cd799439011',
          },
          bookingCode: {
            type: 'string',
            description: 'Mã đặt vé',
            example: 'BOOK123456',
          },
          status: {
            type: 'string',
            description: 'Trạng thái đặt vé',
            example: 'CONFIRMED',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
          },
          totalPrice: {
            type: 'number',
            description: 'Tổng giá vé',
            example: 200000,
          },
          discountAmount: {
            type: 'number',
            description: 'Số tiền giảm giá',
            example: 20000,
          },
          finalPrice: {
            type: 'number',
            description: 'Giá cuối cùng sau giảm giá',
            example: 180000,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo đặt vé',
            example: '2025-09-04T10:53:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian cập nhật đặt vé',
            example: '2025-09-04T10:53:00Z',
          },
          totalSeats: {
            type: 'number',
            description: 'Tổng số ghế đã đặt',
            example: 2,
          },
          pickup: {
            type: 'object',
            description: 'Thông tin điểm đón',
            properties: {
              id: {
                type: 'string',
                description: 'ID của điểm đón',
                example: '507f1f77bcf86cd799439012',
              },
              name: {
                type: 'string',
                description: 'Tên điểm đón',
                example: 'Bến xe Miền Đông',
              },
              code: {
                type: 'string',
                description: 'Mã điểm đón',
                example: 'BXMD',
              },
              address: {
                type: 'string',
                description: 'Địa chỉ điểm đón',
                example: '292 Đinh Bộ Lĩnh',
              },
            },
            nullable: true,
          },
          dropoff: {
            type: 'object',
            description: 'Thông tin điểm trả',
            properties: {
              id: {
                type: 'string',
                description: 'ID của điểm trả',
                example: '507f1f77bcf86cd799439013',
              },
              name: {
                type: 'string',
                description: 'Tên điểm trả',
                example: 'Bến xe Đà Lạt',
              },
              code: {
                type: 'string',
                description: 'Mã điểm trả',
                example: 'BXDL',
              },
              address: {
                type: 'string',
                description: 'Địa chỉ điểm trả',
                example: '1 Tô Hiến Thành',
              },
            },
            nullable: true,
          },
          bookingTrips: {
            type: 'array',
            description: 'Danh sách các chuyến đi trong đặt vé',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID của chuyến đi trong đặt vé',
                  example: '507f1f77bcf86cd799439014',
                },
                tripId: {
                  type: 'string',
                  description: 'ID của chuyến đi',
                  example: '507f1f77bcf86cd799439015',
                },
                seatCount: {
                  type: 'number',
                  description: 'Số lượng ghế đã đặt',
                  example: 2,
                },
                trip: {
                  type: 'object',
                  description: 'Thông tin chuyến đi',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID của chuyến đi',
                      example: '507f1f77bcf86cd799439015',
                    },
                    departureTime: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Thời gian khởi hành',
                      example: '2025-09-04T08:00:00Z',
                    },
                    arrivalTime: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Thời gian đến',
                      example: '2025-09-04T14:00:00Z',
                    },
                    duration: {
                      type: 'number',
                      description: 'Thời gian dự kiến của chuyến đi (phút)',
                      example: 360,
                    },
                    imageUrl: {
                      type: 'string',
                      description: 'URL hình ảnh của chuyến đi',
                      example: 'https://storage.example.com/trip-image.jpg',
                      nullable: true,
                    },
                    route: {
                      type: 'object',
                      description: 'Thông tin tuyến đường',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'ID của tuyến đường',
                          example: '507f1f77bcf86cd799439016',
                        },
                        name: {
                          type: 'string',
                          description: 'Tên tuyến đường',
                          example: 'Hồ Chí Minh - Đà Lạt',
                        },
                        code: {
                          type: 'string',
                          description: 'Mã tuyến đường',
                          example: 'HCM-DL',
                        },
                        sourceProvince: {
                          type: 'string',
                          description: 'Tỉnh/thành phố khởi hành',
                          example: 'TP. Hồ Chí Minh',
                        },
                        destinationProvince: {
                          type: 'string',
                          description: 'Tỉnh/thành phố đích đến',
                          example: 'Lâm Đồng',
                        },
                      },
                    },
                    vehicle: {
                      type: 'object',
                      description: 'Thông tin phương tiện',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'ID của phương tiện',
                          example: '507f1f77bcf86cd799439017',
                        },
                        licensePlate: {
                          type: 'string',
                          description: 'Biển số xe',
                          example: '51B-12345',
                        },
                        vehicleType: {
                          type: 'object',
                          description: 'Thông tin loại phương tiện',
                          properties: {
                            id: {
                              type: 'string',
                              description: 'ID của loại phương tiện',
                              example: '507f1f77bcf86cd799439018',
                            },
                            name: {
                              type: 'string',
                              description: 'Tên loại phương tiện',
                              example: 'Xe giường nằm',
                            },
                            description: {
                              type: 'string',
                              description: 'Mô tả loại phương tiện',
                              example: 'Xe giường nằm 40 chỗ',
                            },
                            status: {
                              type: 'string',
                              description: 'Trạng thái loại phương tiện',
                              example: 'active',
                            },
                          },
                        },
                      },
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      BookingHistoryList: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID của đặt vé',
            example: '507f1f77bcf86cd799439011',
          },
          bookingCode: {
            type: 'string',
            description: 'Mã đặt vé',
            example: 'BOOK123456',
          },
          status: {
            type: 'string',
            description: 'Trạng thái đặt vé',
            example: 'CONFIRMED',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
          },
          totalPrice: {
            type: 'number',
            description: 'Tổng giá vé',
            example: 200000,
          },
          discountAmount: {
            type: 'number',
            description: 'Số tiền giảm giá',
            example: 20000,
          },
          finalPrice: {
            type: 'number',
            description: 'Giá cuối cùng sau giảm giá',
            example: 180000,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo đặt vé',
            example: '2025-09-04T10:53:00Z',
          },
          route: {
            type: 'object',
            description: 'Thông tin tuyến đường của chuyến đi chính',
            properties: {
              from: {
                type: 'string',
                description: 'Tỉnh/thành phố khởi hành',
                example: 'TP. Hồ Chí Minh',
              },
              to: {
                type: 'string',
                description: 'Tỉnh/thành phố đích đến',
                example: 'Lâm Đồng',
              },
              departureTime: {
                type: 'string',
                format: 'date-time',
                description: 'Thời gian khởi hành',
                example: '2025-09-04T08:00:00Z',
              },
            },
            nullable: true,
          },
          totalSeats: {
            type: 'number',
            description: 'Tổng số ghế đã đặt',
            example: 2,
          },
          seatNumbers: {
            type: 'array',
            description: 'Danh sách số ghế',
            items: {
              type: 'string',
              example: 'A01',
            },
          },
          paymentMethod: {
            type: 'string',
            description: 'Phương thức thanh toán',
            example: 'CREDIT_CARD',
            nullable: true,
          },
        },
      },
      BookingSummaryList: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID của đặt vé',
            example: '507f1f77bcf86cd799439011',
          },
          bookingCode: {
            type: 'string',
            description: 'Mã đặt vé',
            example: 'BOOK123456',
          },
          status: {
            type: 'string',
            description: 'Trạng thái đặt vé',
            example: 'CONFIRMED',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
          },
          totalPrice: {
            type: 'number',
            description: 'Tổng giá vé',
            example: 200000,
          },
          discountAmount: {
            type: 'number',
            description: 'Số tiền giảm giá',
            example: 20000,
          },
          finalPrice: {
            type: 'number',
            description: 'Giá cuối cùng sau giảm giá',
            example: 180000,
          },
          route: {
            type: 'string',
            description: 'Tuyến đường (định dạng: from → to)',
            example: 'TP. Hồ Chí Minh → Lâm Đồng',
            nullable: true,
          },
          departureTime: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian khởi hành của chuyến đi chính',
            example: '2025-09-04T08:00:00Z',
            nullable: true,
          },
        },
      },
      BookingExportList: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID của đặt vé',
            example: '507f1f77bcf86cd799439011',
          },
          bookingCode: {
            type: 'string',
            description: 'Mã đặt vé',
            example: 'BOOK123456',
          },
          status: {
            type: 'string',
            description: 'Trạng thái đặt vé',
            example: 'CONFIRMED',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
          },
          totalPrice: {
            type: 'number',
            description: 'Tổng giá vé',
            example: 200000,
          },
          discountAmount: {
            type: 'number',
            description: 'Số tiền giảm giá',
            example: 20000,
          },
          finalPrice: {
            type: 'number',
            description: 'Giá cuối cùng sau giảm giá',
            example: 180000,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo đặt vé',
            example: '2025-09-04T10:53:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian cập nhật đặt vé',
            example: '2025-09-04T10:53:00Z',
          },
          totalSeats: {
            type: 'number',
            description: 'Tổng số ghế đã đặt',
            example: 2,
          },
          pickup: {
            type: 'object',
            description: 'Thông tin điểm đón',
            properties: {
              id: {
                type: 'string',
                description: 'ID của điểm đón',
                example: '507f1f77bcf86cd799439012',
              },
              name: {
                type: 'string',
                description: 'Tên điểm đón',
                example: 'Bến xe Miền Đông',
              },
              code: {
                type: 'string',
                description: 'Mã điểm đón',
                example: 'BXMD',
              },
              address: {
                type: 'string',
                description: 'Địa chỉ điểm đón',
                example: '292 Đinh Bộ Lĩnh',
              },
            },
            nullable: true,
          },
          dropoff: {
            type: 'object',
            description: 'Thông tin điểm trả',
            properties: {
              id: {
                type: 'string',
                description: 'ID của điểm trả',
                example: '507f1f77bcf86cd799439013',
              },
              name: {
                type: 'string',
                description: 'Tên điểm trả',
                example: 'Bến xe Đà Lạt',
              },
              code: {
                type: 'string',
                description: 'Mã điểm trả',
                example: 'BXDL',
              },
              address: {
                type: 'string',
                description: 'Địa chỉ điểm trả',
                example: '1 Tô Hiến Thành',
              },
            },
            nullable: true,
          },
          bookingTrips: {
            type: 'array',
            description: 'Danh sách các chuyến đi trong đặt vé',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID của chuyến đi trong đặt vé',
                  example: '507f1f77bcf86cd799439014',
                },
                tripId: {
                  type: 'string',
                  description: 'ID của chuyến đi',
                  example: '507f1f77bcf86cd799439015',
                },
                seatCount: {
                  type: 'number',
                  description: 'Số lượng ghế đã đặt',
                  example: 2,
                },
                trip: {
                  type: 'object',
                  description: 'Thông tin chuyến đi',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID của chuyến đi',
                      example: '507f1f77bcf86cd799439015',
                    },
                    departureTime: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Thời gian khởi hành',
                      example: '2025-09-04T08:00:00Z',
                    },
                    arrivalTime: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Thời gian đến',
                      example: '2025-09-04T14:00:00Z',
                    },
                    duration: {
                      type: 'number',
                      description: 'Thời gian dự kiến của chuyến đi (phút)',
                      example: 360,
                    },
                    imageUrl: {
                      type: 'string',
                      description: 'URL hình ảnh của chuyến đi',
                      example: 'https://storage.example.com/trip-image.jpg',
                      nullable: true,
                    },
                    route: {
                      type: 'object',
                      description: 'Thông tin tuyến đường',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'ID của tuyến đường',
                          example: '507f1f77bcf86cd799439016',
                        },
                        name: {
                          type: 'string',
                          description: 'Tên tuyến đường',
                          example: 'Hồ Chí Minh - Đà Lạt',
                        },
                        code: {
                          type: 'string',
                          description: 'Mã tuyến đường',
                          example: 'HCM-DL',
                        },
                        sourceProvince: {
                          type: 'string',
                          description: 'Tỉnh/thành phố khởi hành',
                          example: 'TP. Hồ Chí Minh',
                        },
                        destinationProvince: {
                          type: 'string',
                          description: 'Tỉnh/thành phố đích đến',
                          example: 'Lâm Đồng',
                        },
                      },
                    },
                    vehicle: {
                      type: 'object',
                      description: 'Thông tin phương tiện',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'ID của phương tiện',
                          example: '507f1f77bcf86cd799439017',
                        },
                        licensePlate: {
                          type: 'string',
                          description: 'Biển số xe',
                          example: '51B-12345',
                        },
                        vehicleType: {
                          type: 'object',
                          description: 'Thông tin loại phương tiện',
                          properties: {
                            id: {
                              type: 'string',
                              description: 'ID của loại phương tiện',
                              example: '507f1f77bcf86cd799439018',
                            },
                            name: {
                              type: 'string',
                              description: 'Tên loại phương tiện',
                              example: 'Xe giường nằm',
                            },
                            description: {
                              type: 'string',
                              description: 'Mô tả loại phương tiện',
                              example: 'Xe giường nằm 40 chỗ',
                            },
                            status: {
                              type: 'string',
                              description: 'Trạng thái loại phương tiện',
                              example: 'active',
                            },
                          },
                        },
                      },
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
          exportTimestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian xuất dữ liệu',
            example: '2025-09-04T11:16:00Z',
          },
          bookingDuration: {
            type: 'number',
            description: 'Thời gian từ lúc tạo đến cập nhật cuối cùng (miligiây)',
            example: 3600000,
            nullable: true,
          },
        },
      },
      BookingDetails: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID của đặt vé',
            example: '507f1f77bcf86cd799439011',
          },
          totalPrice: {
            type: 'number',
            description: 'Tổng giá vé',
            example: 200000,
          },
          discountAmount: {
            type: 'number',
            description: 'Số tiền giảm giá',
            example: 20000,
          },
          finalPrice: {
            type: 'number',
            description: 'Giá cuối cùng sau giảm giá',
            example: 180000,
          },
          status: {
            type: 'string',
            description: 'Trạng thái đặt vé',
            example: 'confirmed',
          },
          paymentStatus: {
            type: 'string',
            description: 'Trạng thái thanh toán',
            example: 'paid',
          },
          passengerName: {
            type: 'string',
            description: 'Tên hành khách',
            example: 'John Doe',
            nullable: true,
          },
          passengerEmail: {
            type: 'string',
            format: 'email',
            description: 'Email hành khách',
            example: 'john.doe@example.com',
            nullable: true,
          },
          passengerPhone: {
            type: 'string',
            description: 'Số điện thoại hành khách',
            example: '+84123456789',
            nullable: true,
          },
          isGuestBooking: {
            type: 'boolean',
            description: 'Có phải là đặt vé không đăng nhập',
            example: true,
          },
          passengerNote: {
            type: 'string',
            description: 'Ghi chú của hành khách',
            example: 'Gần cửa sổ',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo đặt vé',
            example: '2025-09-04T10:53:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian cập nhật đặt vé',
            example: '2025-09-04T10:53:00Z',
          },
          user: {
            type: 'object',
            description: 'Thông tin người dùng (nếu không phải đặt vé khách)',
            properties: {
              id: {
                type: 'string',
                description: 'ID của người dùng',
                example: '507f1f77bcf86cd799439012',
              },
              firstName: {
                type: 'string',
                description: 'Tên của người dùng',
                example: 'John',
              },
              lastName: {
                type: 'string',
                description: 'Họ của người dùng',
                example: 'Doe',
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'Email của người dùng',
                example: 'john.doe@example.com',
              },
              phoneNumber: {
                type: 'string',
                description: 'Số điện thoại của người dùng',
                example: '+84123456789',
              },
            },
            nullable: true,
          },
          pickup: {
            type: 'object',
            description: 'Thông tin điểm đón',
            properties: {
              name: {
                type: 'string',
                description: 'Tên điểm đón',
                example: 'Bến xe Miền Đông',
                nullable: true,
              },
              address: {
                type: 'string',
                description: 'Địa chỉ điểm đón',
                example: '292 Đinh Bộ Lĩnh',
                nullable: true,
              },
              ward: {
                type: 'string',
                description: 'Tên phường/xã',
                example: 'Phường 26',
                nullable: true,
              },
              district: {
                type: 'string',
                description: 'Tên quận/huyện',
                example: 'Quận Bình Thạnh',
                nullable: true,
              },
              province: {
                type: 'string',
                description: 'Tên tỉnh/thành phố',
                example: 'TP. Hồ Chí Minh',
                nullable: true,
              },
            },
          },
          dropoff: {
            type: 'object',
            description: 'Thông tin điểm trả',
            properties: {
              name: {
                type: 'string',
                description: 'Tên điểm trả',
                example: 'Bến xe Đà Lạt',
                nullable: true,
              },
              address: {
                type: 'string',
                description: 'Địa chỉ điểm trả',
                example: '1 Tô Hiến Thành',
                nullable: true,
              },
              ward: {
                type: 'string',
                description: 'Tên phường/xã',
                example: 'Phường 3',
                nullable: true,
              },
              district: {
                type: 'string',
                description: 'Tên quận/huyện',
                example: 'TP. Đà Lạt',
                nullable: true,
              },
              province: {
                type: 'string',
                description: 'Tên tỉnh/thành phố',
                example: 'Lâm Đồng',
                nullable: true,
              },
            },
          },
          seats: {
            type: 'array',
            description: 'Danh sách các ghế được đặt',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID của ghế',
                  example: '507f1f77bcf86cd799439013',
                },
                seatNumber: {
                  type: 'string',
                  description: 'Số ghế',
                  example: 'A01',
                },
                seatType: {
                  type: 'string',
                  description: 'Loại ghế',
                  example: 'VIP',
                },
                status: {
                  type: 'string',
                  description: 'Trạng thái ghế',
                  example: 'booked',
                },
              },
            },
          },
          bookingTrips: {
            type: 'array',
            description: 'Danh sách các chuyến đi trong đặt vé',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID của chuyến đi trong đặt vé',
                  example: '507f1f77bcf86cd799439014',
                },
                route: {
                  type: 'object',
                  description: 'Thông tin tuyến đường',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID của tuyến đường',
                      example: '507f1f77bcf86cd799439015',
                    },
                    code: {
                      type: 'string',
                      description: 'Mã tuyến đường',
                      example: 'HCM-DL',
                    },
                    name: {
                      type: 'string',
                      description: 'Tên tuyến đường',
                      example: 'Hồ Chí Minh - Đà Lạt',
                    },
                    direction: {
                      type: 'string',
                      description: 'Hướng tuyến đường',
                      example: 'outbound',
                    },
                    distance: {
                      type: 'number',
                      description: 'Khoảng cách tuyến đường',
                      example: 300,
                    },
                    distanceUnit: {
                      type: 'string',
                      description: 'Đơn vị khoảng cách',
                      example: 'km',
                    },
                    estimatedDuration: {
                      type: 'number',
                      description: 'Thời gian dự kiến (phút)',
                      example: 360,
                    },
                    sourceProvince: {
                      type: 'string',
                      description: 'Tỉnh/thành phố khởi hành',
                      example: 'TP. Hồ Chí Minh',
                    },
                    destinationProvince: {
                      type: 'string',
                      description: 'Tỉnh/thành phố đích đến',
                      example: 'Lâm Đồng',
                    },
                    routeStops: {
                      type: 'object',
                      description: 'Danh sách điểm dừng trên tuyến đường',
                      properties: {
                        pickupPoints: {
                          type: 'array',
                          description: 'Các điểm đón',
                          items: {
                            type: 'object',
                            properties: {
                              busStopId: {
                                type: 'string',
                                description: 'ID của điểm dừng',
                                example: '507f1f77bcf86cd799439016',
                              },
                              name: {
                                type: 'string',
                                description: 'Tên điểm dừng',
                                example: 'Bến xe Miền Đông',
                              },
                              latitude: {
                                type: 'number',
                                description: 'Vĩ độ',
                                example: 10.987654,
                              },
                              longitude: {
                                type: 'number',
                                description: 'Kinh độ',
                                example: 106.678901,
                              },
                              estimatedTime: {
                                type: 'string',
                                format: 'date-time',
                                description: 'Thời gian dự kiến đến',
                                example: '2025-09-04T12:00:00Z',
                              },
                              address: {
                                type: 'string',
                                description: 'Địa chỉ điểm dừng',
                                example: '292 Đinh Bộ Lĩnh',
                              },
                              wardName: {
                                type: 'string',
                                description: 'Tên phường/xã',
                                example: 'Phường 26',
                              },
                              districtName: {
                                type: 'string',
                                description: 'Tên quận/huyện',
                                example: 'Quận Bình Thạnh',
                              },
                              provinceName: {
                                type: 'string',
                                description: 'Tên tỉnh/thành phố',
                                example: 'TP. Hồ Chí Minh',
                              },
                              provinceId: {
                                type: 'string',
                                description: 'ID của tỉnh/thành phố',
                                example: '507f1f77bcf86cd799439017',
                              },
                              stopOrder: {
                                type: 'number',
                                description: 'Thứ tự điểm dừng',
                                example: 1,
                              },
                              isPickUp: {
                                type: 'boolean',
                                description: 'Là điểm đón',
                                example: true,
                              },
                              isDropOff: {
                                type: 'boolean',
                                description: 'Là điểm trả',
                                example: false,
                              },
                            },
                          },
                        },
                        dropoffPoints: {
                          type: 'array',
                          description: 'Các điểm trả',
                          items: {
                            type: 'object',
                            properties: {
                              busStopId: {
                                type: 'string',
                                description: 'ID của điểm dừng',
                                example: '507f1f77bcf86cd799439018',
                              },
                              name: {
                                type: 'string',
                                description: 'Tên điểm dừng',
                                example: 'Bến xe Đà Lạt',
                              },
                              latitude: {
                                type: 'number',
                                description: 'Vĩ độ',
                                example: 11.940419,
                              },
                              longitude: {
                                type: 'number',
                                description: 'Kinh độ',
                                example: 108.458313,
                              },
                              estimatedTime: {
                                type: 'string',
                                format: 'date-time',
                                description: 'Thời gian dự kiến đến',
                                example: '2025-09-04T18:00:00Z',
                              },
                              address: {
                                type: 'string',
                                description: 'Địa chỉ điểm dừng',
                                example: '1 Tô Hiến Thành',
                              },
                              wardName: {
                                type: 'string',
                                description: 'Tên phường/xã',
                                example: 'Phường 3',
                              },
                              districtName: {
                                type: 'string',
                                description: 'Tên quận/huyện',
                                example: 'TP. Đà Lạt',
                              },
                              provinceName: {
                                type: 'string',
                                description: 'Tên tỉnh/thành phố',
                                example: 'Lâm Đồng',
                              },
                              provinceId: {
                                type: 'string',
                                description: 'ID của tỉnh/thành phố',
                                example: '507f1f77bcf86cd799439019',
                              },
                              stopOrder: {
                                type: 'number',
                                description: 'Thứ tự điểm dừng',
                                example: 2,
                              },
                              isPickUp: {
                                type: 'boolean',
                                description: 'Là điểm đón',
                                example: false,
                              },
                              isDropOff: {
                                type: 'boolean',
                                description: 'Là điểm trả',
                                example: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                seats: {
                  type: 'array',
                  description: 'Danh sách ghế của chuyến đi',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'ID của ghế',
                        example: '507f1f77bcf86cd799439013',
                      },
                      seatNumber: {
                        type: 'string',
                        description: 'Số ghế',
                        example: 'A01',
                      },
                      seatType: {
                        type: 'string',
                        description: 'Loại ghế',
                        example: 'VIP',
                      },
                      status: {
                        type: 'string',
                        description: 'Trạng thái ghế',
                        example: 'booked',
                      },
                    },
                  },
                },
                trip: {
                  type: 'object',
                  description: 'Thông tin chi tiết chuyến đi',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID của chuyến đi',
                      example: '507f1f77bcf86cd799439014',
                    },
                    arrivalTime: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Thời gian đến',
                      example: '2025-09-04T18:00:00Z',
                    },
                    departureTime: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Thời gian khởi hành',
                      example: '2025-09-04T12:00:00Z',
                    },
                    basePrice: {
                      type: 'number',
                      description: 'Giá cơ bản',
                      example: 200000,
                    },
                    specialPrice: {
                      type: 'number',
                      description: 'Giá đặc biệt (nếu có)',
                      example: 180000,
                      nullable: true,
                    },
                    route: {
                      $ref: '#/components/schemas/BookingDetails/properties/bookingTrips/items/properties/route',
                    },
                    capacity: {
                      type: 'number',
                      description: 'Số lượng ghế tối đa',
                      example: 45,
                    },
                    imageUrl: {
                      type: 'string',
                      description: 'URL hình ảnh của chuyến đi',
                      example: 'https://storage.example.com/trip-image.jpg',
                      nullable: true,
                    },
                    vehicle: {
                      type: 'object',
                      description: 'Thông tin phương tiện',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'ID của phương tiện',
                          example: '507f1f77bcf86cd799439020',
                        },
                        type: {
                          type: 'string',
                          description: 'Loại phương tiện',
                          example: 'Xe giường nằm',
                        },
                        vehicleType: {
                          type: 'object',
                          description: 'Chi tiết loại phương tiện',
                          properties: {
                            id: {
                              type: 'string',
                              description: 'ID của loại phương tiện',
                              example: '507f1f77bcf86cd799439021',
                            },
                            name: {
                              type: 'string',
                              description: 'Tên loại phương tiện',
                              example: 'Xe giường nằm',
                            },
                            description: {
                              type: 'string',
                              description: 'Mô tả loại phương tiện',
                              example: 'Xe giường nằm 40 chỗ',
                            },
                            status: {
                              type: 'string',
                              description: 'Trạng thái loại phương tiện',
                              example: 'active',
                            },
                          },
                        },
                        driver: {
                          type: 'object',
                          description: 'Thông tin tài xế',
                          properties: {
                            id: {
                              type: 'string',
                              description: 'ID của tài xế',
                              example: '507f1f77bcf86cd799439022',
                            },
                            firstName: {
                              type: 'string',
                              description: 'Tên tài xế',
                              example: 'Nguyen',
                            },
                            lastName: {
                              type: 'string',
                              description: 'Họ tài xế',
                              example: 'Van A',
                            },
                            phoneNumber: {
                              type: 'string',
                              description: 'Số điện thoại tài xế',
                              example: '+84123456788',
                            },
                            avatarUrl: {
                              type: 'string',
                              description: 'URL ảnh đại diện tài xế',
                              example: 'https://storage.example.com/driver-avatar.jpg',
                              nullable: true,
                            },
                          },
                          nullable: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          voucherUsage: {
            type: 'array',
            description: 'Thông tin sử dụng voucher',
            items: {
              type: 'object',
              properties: {
                voucher: {
                  type: 'object',
                  description: 'Thông tin voucher',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID của voucher',
                      example: '507f1f77bcf86cd799439023',
                    },
                    code: {
                      type: 'string',
                      description: 'Mã voucher',
                      example: 'SUMMER2025',
                    },
                  },
                },
              },
            },
          },
        },
      },
      BookingStatusChanged: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'ID của đặt chỗ',
            example: '507f1f77bcf86cd799439014',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
            description: 'Trạng thái hiện tại của đặt chỗ',
            example: 'CONFIRMED',
          },
          finalPrice: {
            type: 'number',
            description: 'Giá cuối cùng của đặt chỗ',
            example: 150000,
          },
          seatNumbers: {
            type: 'string',
            description: 'Danh sách số ghế cách nhau bằng dấu phẩy',
            example: 'A1,A2',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian cập nhật trạng thái',
            example: '2025-07-02T09:47:00Z',
          },
        },
        required: ['bookingId', 'status', 'updatedAt'],
      },
      BookingExport: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'ID của đặt vé',
            example: '507f1f77bcf86cd799439014',
          },
          userId: {
            type: 'string',
            description: 'ID của người dùng',
            example: '507f1f77bcf86cd799439016',
          },
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi',
            example: '507f1f77bcf86cd799439013',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
            description: 'Trạng thái của đặt vé',
            example: 'PENDING',
          },
          totalAmount: {
            type: 'number',
            description: 'Tổng số tiền của đặt vé',
            example: 180000,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo đặt vé',
            example: '2025-07-02T09:47:00Z',
          },
        },
      },
      BookingHistory: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID của lịch sử thay đổi đặt vé',
            example: '507f1f77bcf86cd799439015',
          },
          bookingId: {
            type: 'string',
            description: 'ID của đặt vé liên quan',
            example: '507f1f77bcf86cd799439014',
          },
          changedFields: {
            type: 'object',
            description: 'Các trường đã thay đổi trong đặt vé',
            additionalProperties: true,
            example: { status: 'CANCELLED' },
          },
          changeReason: {
            type: 'string',
            description: 'Lý do thay đổi',
            example: 'Booking cancelled by user',
          },
          changedBy: {
            type: 'string',
            description: 'ID của người dùng',
            example: '507f1f77bcf86cd799439016',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian thay đổi',
            example: '2025-07-02T09:47:00Z',
          },
        },
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          bookingId: { type: 'string' },
          bookingTripId: { type: 'string' },
          seatId: { type: 'string' },
          qrCode: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'CHECKED_IN', 'CANCELLED'] },
          checkInBy: { type: 'string', nullable: true },
          checkInAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RoomAccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Thành công khi tham gia hoặc rời phòng',
            example: true,
          },
          error: {
            type: 'string',
            description: 'Thông báo lỗi nếu thao tác thất bại',
            example: 'Yêu cầu xác thực',
          },
        },
        required: ['success'],
      },
      PrivateMessage: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID của người dùng gửi tin nhắn',
            example: '507f1f77bcf86cd799439011',
          },
          message: {
            type: 'string',
            description: 'Nội dung tin nhắn',
            example: 'Xin chào, tôi cần hỗ trợ về đặt vé',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian gửi tin nhắn',
            example: '2025-07-02T09:47:00Z',
          },
        },
        required: ['userId', 'message', 'timestamp'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            description: 'Tên sự kiện gây ra lỗi',
            example: 'sendPrivateMessage',
          },
          message: {
            type: 'string',
            description: 'Thông báo lỗi',
            example: 'Yêu cầu xác thực cho hành động này',
          },
        },
        required: ['message'],
      },
      SeatExpirationWarning: {
        type: 'object',
        properties: {
          seatId: {
            type: 'string',
            description: 'ID của ghế',
            example: '507f1f77bcf86cd799439013',
          },
          userId: {
            type: 'string',
            description: 'ID của người dùng đã đặt ghế',
            example: '507f1f77bcf86cd799439011',
          },
          expireAt: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian hết hạn của đặt chỗ',
            example: '2025-07-02T10:00:00Z',
          },
          remainingTime: {
            type: 'number',
            description: 'Thời gian còn lại trước khi đặt chỗ hết hạn (giây)',
            example: 120,
          },
        },
        required: ['seatId', 'userId', 'expireAt', 'remainingTime'],
      },
      JoinTripRoom: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['joinTripRoom'],
            example: 'joinTripRoom',
          },
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi để tham gia',
            example: '507f1f77bcf86cd799439012',
          },
        },
        required: ['event', 'tripId'],
      },
      LeaveTripRoom: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['leaveTripRoom'],
            example: 'leaveTripRoom',
          },
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi để rời',
            example: '507f1f77bcf86cd799439012',
          },
        },
        required: ['event', 'tripId'],
      },
      SelectSeat: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['selectSeat'],
            example: 'selectSeat',
          },
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi',
            example: '507f1f77bcf86cd799439012',
          },
          seatId: {
            type: 'string',
            description: 'ID của ghế để chọn',
            example: '507f1f77bcf86cd799439013',
          },
          userId: {
            type: 'string',
            description: 'ID của người dùng',
            example: '507f1f77bcf86cd799439011',
          },
          sessionId: {
            type: 'string',
            description: 'Mã định danh phiên (tùy chọn)',
            example: 'session-12345',
          },
        },
        required: ['event', 'tripId', 'seatId', 'userId'],
      },
      ReleaseSeat: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['releaseSeat'],
            example: 'releaseSeat',
          },
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi',
            example: '507f1f77bcf86cd799439012',
          },
          seatId: {
            type: 'string',
            description: 'ID của ghế để giải phóng',
            example: '507f1f77bcf86cd799439013',
          },
          userId: {
            type: 'string',
            description: 'ID của người dùng',
            example: '507f1f77bcf86cd799439011',
          },
        },
        required: ['event', 'tripId', 'seatId', 'userId'],
      },
      JoinBookingRoom: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['joinBookingRoom'],
            example: 'joinBookingRoom',
          },
          bookingId: {
            type: 'string',
            description: 'ID của đặt chỗ để tham gia',
            example: '507f1f77bcf86cd799439014',
          },
        },
        required: ['event', 'bookingId'],
      },
      LeaveBookingRoom: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['leaveBookingRoom'],
            example: 'leaveBookingRoom',
          },
          bookingId: {
            type: 'string',
            description: 'ID của đặt chỗ để rời',
            example: '507f1f77bcf86cd799439014',
          },
        },
        required: ['event', 'bookingId'],
      },
      SendPrivateMessage: {
        type: 'object',
        properties: {
          event: {
            type: 'string',
            enum: ['sendPrivateMessage'],
            example: 'sendPrivateMessage',
          },
          tripId: {
            type: 'string',
            description: 'ID của chuyến đi',
            example: '507f1f77bcf86cd799439012',
          },
          message: {
            type: 'string',
            description: 'Nội dung tin nhắn',
            example: 'Xin chào, tôi cần hỗ trợ về đặt vé',
          },
        },
        required: ['event', 'tripId', 'message'],
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          error: {
            type: 'object',
            nullable: true,
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
