export interface User {
  id: number;
  phone: string;
  fullName: string;
  email: string | null;
  role: string;
  username?: string | null;
  createdAt?: string;
  suggestedSize?: string | null;
}

export interface Fabric {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string | null;
}

export interface Fit {
  id: number;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string;
  imageType: string;
  sortOrder: number;
}

export interface ProductSize {
  id: number;
  code: string;
  label: string;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  oldPrice: number | null;
  fabric: Fabric;
  fit: Fit;
  stitchingType: string;
  color: string;
  isFeatured: boolean;
  mainImage: string | null;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  availableSizes: ProductSize[];
  outOfStockSizes: ProductSize[];
  fabricArticles: { id: number; title: string; slug: string }[];
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  coverImage: string | null;
  fabric: Fabric | null;
  category: string;
  publishedAt: string;
  relatedProducts?: Product[];
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CartItem {
  id: number;
  productId: number;
  sizeId: number;
  quantity: number;
  productName: string;
  productSlug: string;
  price: number;
  color: string;
  sizeCode: string;
  sizeLabel: string;
  imageUrl: string | null;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  count: number;
}

export interface Address {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  province: string;
  city: string;
  address_line: string;
  postal_code: string;
  is_default: number;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  itemCount: number;
}

export interface OrderDetail {
  orderNumber: string;
  status: string;
  statusLabel: string;
  currentStep: number;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  note: string;
  createdAt: string;
  items: OrderItem[];
  address: Address;
  timeline: { key: string; label: string; step: number }[];
  cardNumber: string;
  cardHolder: string;
  receiptImageUrl: string | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  size_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  size_label: string;
  image_url: string;
  product_slug: string | null;
}

export interface Measurements {
  height_cm: number | null;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  shoulder_cm: number | null;
  arm_length_cm: number | null;
  suggested_size: string | null;
}

export interface MeasurementInput {
  heightCm?: number | null;
  weightKg?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  shoulderCm?: number | null;
  armLengthCm?: number | null;
}

export interface SizeGuideRow {
  code: string;
  label: string;
  minChest: number;
  maxChest: number;
  minWaist: number;
  maxWaist: number;
}

// ===== پنل مدیریت =====

export interface AdminRecentOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  full_name: string;
  phone: string;
}

export interface AdminStats {
  counts: {
    products: number;
    activeProducts: number;
    articles: number;
    orders: number;
    users: number;
  };
  revenue: number;
  byStatus: { status: string; count: number | string }[];
  recentOrders: AdminRecentOrder[];
}

export interface AdminProductListItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  is_active: number;
  is_featured: number;
  color: string;
  stitching_type: string;
  created_at: string;
  fabric_name: string;
  fit_name: string;
  main_image: string | null;
  total_stock: number | string;
}

export interface AdminProductRecord {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  old_price: number | null;
  fabric_id: number;
  fit_id: number;
  stitching_type: string;
  color: string;
  is_featured: number;
  is_active: number;
  meta_title: string | null;
  meta_description: string | null;
}

export interface AdminProductDetail {
  product: AdminProductRecord;
  images: { id: number; url: string; alt: string; image_type: string; sort_order: number }[];
  sizes: { sizeId: number; code: string; label: string; stock: number }[];
}

export interface AdminArticleListItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  is_published: number;
  published_at: string;
  cover_image: string | null;
  fabric_name: string | null;
}

export interface AdminArticleRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  fabric_id: number | null;
  category: string;
  is_published: number;
  meta_title: string | null;
  meta_description: string | null;
}

export interface AdminOrderListItem {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  full_name: string;
  phone: string;
  item_count: number | string;
  receipt_image_url: string | null;
}

export interface AdminSettings {
  cardNumber: string;
  cardHolder: string;
}

// ===== نظرات محصول =====

export interface Review {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verified: boolean;
}

export interface ReviewSummary {
  avg: number;
  count: number;
  distribution: Record<string, number>;
  text: string;
  verifiedCount: number;
}

export interface ProductReviewsData {
  summary: ReviewSummary;
  reviews: Review[];
  myReview: Review | null;
}

// ===== استایلیست هوشمند =====

export interface StylistSize {
  id: number;
  code: string;
  label: string;
  stock: number;
}

export interface StylistRecommendation {
  productId: number;
  product: Product;
  sizes: StylistSize[];
  reason: string;
  category: string;
}

export interface StylistResult {
  message: string;
  budget: number | null;
  filters: { colors: string[]; fit: string | null; formality: string | null };
  missingCategories: string[];
  recommendations: StylistRecommendation[];
}

export interface AdminOrderDetailData {
  order: {
    id: number;
    order_number: string;
    status: string;
    payment_status: string;
    subtotal: number;
    shipping_cost: number;
    total: number;
    note: string;
    created_at: string;
    address_id: number;
    full_name: string;
    phone: string;
    email: string | null;
    receipt_image_url: string | null;
  };
  items: {
    id: number;
    product_name: string;
    size_label: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    image_url: string;
    product_slug: string | null;
  }[];
  address: {

    full_name: string;
    phone: string;
    province: string;
    city: string;
    address_line: string;
    postal_code: string;
  } | null;
}

export interface AdminUserRow {
  id: number;
  phone: string;
  full_name: string;
  email: string | null;
  role: string;
  created_at: string;
  order_count: number | string;
  total_spent: number | string;
}

export interface AdminMeta {
  fabrics: { id: number; name: string; slug: string }[];
  fits: { id: number; name: string; slug: string }[];
  sizes: { id: number; code: string; label: string }[];
}