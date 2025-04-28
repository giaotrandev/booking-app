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
  ],
  paths: {
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
