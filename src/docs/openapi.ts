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
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'User',
      description: 'User management endpoints',
    },
    {
      name: 'Geo',
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
  ],
  paths: {
    // Authentication
    '/auth/register': {
      post: {
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
        tags: ['Auth'],
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
    // Geographic-related paths (new additions)
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
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
