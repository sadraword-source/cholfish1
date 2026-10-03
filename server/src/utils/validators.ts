import { z } from 'zod';

export const phoneSchema = z
  .string({ required_error: 'شماره موبایل الزامی است.' })
  .regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است. (مثال: 09123456789)');

export const requestOtpSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(['login', 'register']).optional(),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().min(4, 'کد تأیید نامعتبر است.').max(8, 'کد تأیید نامعتبر است.'),
  fullName: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  fullName: z.string().max(100).optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'نام کامل باید حداقل ۲ کاراکتر باشد.').max(100).optional(),
  email: z.string().email('ایمیل نامعتبر است.').optional().or(z.literal('')),
});

export const measurementsSchema = z.object({
  heightCm: z.number().min(50, 'قد نامعتبر است.').max(250, 'قد نامعتبر است.').nullable().optional(),
  weightKg: z.number().min(20, 'وزن نامعتبر است.').max(300, 'وزن نامعتبر است.').nullable().optional(),
  chestCm: z.number().min(40, 'دور سینه نامعتبر است.').max(200, 'دور سینه نامعتبر است.').nullable().optional(),
  waistCm: z.number().min(40, 'دور کمر نامعتبر است.').max(200, 'دور کمر نامعتبر است.').nullable().optional(),
  hipCm: z.number().min(40, 'دور باسن نامعتبر است.').max(250, 'دور باسن نامعتبر است.').nullable().optional(),
  shoulderCm: z.number().min(20, 'عرض شانه نامعتبر است.').max(100, 'عرض شانه نامعتبر است.').nullable().optional(),
  armLengthCm: z.number().min(30, 'قد آستین نامعتبر است.').max(100, 'قد آستین نامعتبر است.').nullable().optional(),
});

export const addressSchema = z.object({
  fullName: z.string().min(2, 'نام گیرنده الزامی است.').max(100),
  phone: phoneSchema,
  province: z.string().min(2, 'استان الزامی است.').max(50),
  city: z.string().min(2, 'شهر الزامی است.').max(50),
  addressLine: z.string().min(5, 'آدرس کامل را وارد کنید.').max(500),
  postalCode: z.string().min(5, 'کد پستی نامعتبر است.').max(20),
});

export const cartItemSchema = z.object({
  productId: z.number({ required_error: 'محصول الزامی است.' }).int().positive(),
  sizeId: z.number({ required_error: 'سایز الزامی است.' }).int().positive(),
  quantity: z.number().int().min(1, 'تعداد باید حداقل ۱ باشد.').max(99, 'تعداد بیش از حد مجاز است.'),
});

export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(1, 'تعداد باید حداقل ۱ باشد.').max(99, 'تعداد بیش از حد مجاز است.'),
});

export const orderSchema = z.object({
  addressId: z.number().int().positive().optional(),
  address: addressSchema.optional(),
  note: z.string().max(500).optional().default(''),
});

export const productQuerySchema = z.object({
  search: z.string().max(100).optional(),
  fabric: z.string().optional(),
  fit: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  featured: z.string().optional(),
});

// ===== پنل مدیریت =====

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const adminProductSchema = z.object({
  name: z.string().min(2, 'نام محصول الزامی است.').max(255),
  slug: z.string().max(150).optional(),
  description: z.string().max(5000).optional().default(''),
  price: z.number({ required_error: 'قیمت الزامی است.' }).int().nonnegative(),
  oldPrice: z.number().int().nonnegative().nullable().optional(),
  fabricId: z.number({ required_error: 'پارچه الزامی است.' }).int().positive(),
  fitId: z.number({ required_error: 'مدل الزامی است.' }).int().positive(),
  stitchingType: z.string().max(100).optional().default('فارسی'),
  color: z.string().max(80).optional().default('مشکی'),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(1000).nullable().optional(),
  images: z
    .array(
      z.object({
        url: z.string().min(1).max(500),
        alt: z.string().max(255).optional().default(''),
        imageType: z.enum(['main', 'gallery']).optional().default('gallery'),
      })
    )
    .optional()
    .default([]),
  sizes: z
    .array(
      z.object({
        sizeId: z.number().int().positive(),
        stock: z.number().int().min(0).max(100000),
      })
    )
    .optional()
    .default([]),
});

export const adminArticleSchema = z.object({
  title: z.string().min(2, 'عنوان الزامی است.').max(255),
  slug: z.string().max(150).optional(),
  excerpt: z.string().max(1000).optional().default(''),
  content: z.string().optional().default(''),
  coverImage: z.string().max(500).nullable().optional(),
  fabricId: z.number().int().positive().nullable().optional(),
  category: z.string().max(80).optional().default('راهنما'),
  isPublished: z.boolean().optional().default(true),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(1000).nullable().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['registered', 'preparing', 'shipped_to_post', 'in_transit', 'delivered']),
});

export const orderPaymentStatusSchema = z.object({
  paymentStatus: z.enum(['paid', 'rejected'], {
    errorMap: () => ({ message: 'وضعیت پرداخت نامعتبر است.' }),
  }),
});

export const adminLoginSchema = z.object({
  username: z.string({ required_error: 'نام کاربری الزامی است.' }).min(3, 'نام کاربری نامعتبر است.').max(60),
  password: z.string({ required_error: 'رمز عبور الزامی است.' }).min(6, 'رمز عبور نامعتبر است.').max(100),
});

export const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز عبور فعلی الزامی است.'),
  newPassword: z.string().min(6, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.').max(100),
});

export const reviewSchema = z.object({
  rating: z
    .number({ required_error: 'امتیاز الزامی است.' })
    .int()
    .min(1, 'امتیاز باید بین ۱ تا ۵ باشد.')
    .max(5, 'امتیاز باید بین ۱ تا ۵ باشد.'),
  comment: z.string().trim().min(3, 'متن نظر را کامل‌تر بنویسید.').max(1000, 'متن نظر طولانی است.'),
});

export const stylistRequestSchema = z.object({
  message: z
    .string({ required_error: 'درخواست خود را بنویسید.' })
    .trim()
    .min(3, 'درخواست خود را کامل‌تر بنویسید.')
    .max(600, 'متن درخواست طولانی است.'),
  budget: z.number().int().positive().max(1_000_000_000).nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  fit: z.string().max(40).nullable().optional(),
  occasion: z.string().max(40).nullable().optional(),
  formality: z.enum(['formal', 'semi', 'casual']).nullable().optional(),
});

export const adminSettingsSchema = z.object({
  cardNumber: z
    .string({ required_error: 'شماره کارت الزامی است.' })
    .transform((value) => value.replace(/[^0-9]/g, ''))
    .refine((value) => /^\d{16}$/.test(value), 'شماره کارت باید ۱۶ رقم باشد.'),
  cardHolder: z
    .string()
    .trim()
    .min(2, 'نام صاحب کارت الزامی است.')
    .max(100, 'نام صاحب کارت طولانی است.')
    .optional(),
});