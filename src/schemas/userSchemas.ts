import { z } from 'zod';
import { CommonValidations } from '#middlewares/validationMiddleware';

/**
 * Schema validation cho đăng ký người dùng
 */
export const userRegisterSchema = z.object({
  firstName: CommonValidations.firstName,
  lastName: CommonValidations.lastName,
  email: CommonValidations.email,
  password: CommonValidations.password,
  gender: CommonValidations.gender,
  phoneNumber: CommonValidations.phoneNumber.optional(),
  birthday: CommonValidations.birthday,
  address: z.string().max(255).optional().nullable(),
});

// Định nghĩa type từ schema
export type UserRegisterInput = z.infer<typeof userRegisterSchema>;

/**
 * Schema validation cho đăng nhập
 */
export const userLoginSchema = z.object({
  email: CommonValidations.email,
  password: z.string().min(1, { message: 'validation.required' }),
});

export type UserLoginInput = z.infer<typeof userLoginSchema>;

/**
 * Schema validation cho gửi lại email xác thực
 */
export const resendVerificationSchema = z.object({
  email: CommonValidations.email,
});

export type ResendVerificationInput = z.infer<typeof userLoginSchema>;

/**
 * Schema validation cho quên mật khẩu
 */
export const forgotPasswordSchema = z.object({
  email: CommonValidations.email,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema validation cho reset mật khẩu
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: 'validation.required' }),
    password: CommonValidations.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Schema validation cho cập nhật thông tin người dùng
 */
export const updateUserSchema = z.object({
  name: CommonValidations.name.optional(),
  gender: CommonValidations.gender.optional(),
  phoneNumber: CommonValidations.phoneNumber,
  age: CommonValidations.age.optional(),
  address: z.string().max(255).optional(),
  avatar: z.string().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Schema validation cho thay đổi mật khẩu
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'validation.required' }),
    newPassword: CommonValidations.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
