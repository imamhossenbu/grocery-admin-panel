# FreshBasket Grocery Admin Panel

A standalone management dashboard for the FreshBasket Grocery platform built with Next.js (App Router), Tailwind CSS, TypeScript, Supabase Cloud, and Cloudinary.

## ✨ Features
- **Product Management**: Create, edit, toggle active status, adjust stock/prices, and delete products
- **Category & Taxonomy Management**: Manage fresh fruit, vegetable, dairy, and grocery aisles
- **Order Pipeline & Status Tracker**: Manage Cash on Delivery orders (Pending -> Confirmed -> Packed -> Out for delivery -> Delivered)
- **Cloudinary Image Upload**: Seamless media uploading with fallback to Supabase Storage
- **Coupon Manager**: Create percentage or fixed-amount discount coupons

## 🔑 Environment Variables
Copy `.env.example` to `.env.local` and add your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://qaqrxudzecgtqcmfjiij.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=gki6moqt
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ecommerce
```

## 🚀 Getting Started
```bash
npm install
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) to view the admin panel.
