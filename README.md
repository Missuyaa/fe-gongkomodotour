# Gong Komodo Tour - Frontend

Frontend aplikasi untuk Gong Komodo Tour menggunakan Next.js 14, TypeScript, dan Tailwind CSS.

## Fitur Utama

-   Landing page responsif
-   Sistem autentikasi
-   Dashboard admin
-   Manajemen konten (blog, galeri, testimonial, dll.)
-   Booking system
-   Multi-language support (Indonesia/English)

## Komponen Image yang Diperbaiki

### Masalah yang Diatasi

-   Error 403 saat loading gambar dari API
-   Token expired yang menyebabkan gambar tidak dapat dimuat
-   Fallback yang tidak memadai saat gambar gagal dimuat

### Solusi yang Diterapkan

#### 1. AuthenticatedImage Component

Komponen yang menangani gambar dengan autentikasi:

-   Otomatis menambahkan token Bearer untuk gambar dari API
-   Retry mechanism saat token expired
-   Fallback ke URL asli jika autentikasi gagal
-   Loading state dengan spinner

#### 2. SafeImage Component

Komponen alternatif yang lebih sederhana:

-   Error handling yang robust
-   Fallback image otomatis
-   Loading state yang smooth
-   Tidak memerlukan autentikasi

#### 3. useAuth Hook

Hook untuk menangani autentikasi:

-   Refresh token otomatis
-   State management untuk token
-   Logout functionality

### Penggunaan

```tsx
// Untuk gambar yang memerlukan autentikasi
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

<AuthenticatedImage
    src="https://api.gongkomodotour.com/storage/image.jpg"
    alt="Description"
    fill
    className="object-cover"
/>;

// Untuk gambar dengan fallback sederhana
import { SafeImage } from '@/components/ui/safe-image';

<SafeImage
    src="https://example.com/image.jpg"
    alt="Description"
    fill
    className="object-cover"
    fallbackSrc="/img/logo.png"
/>;
```

## Setup Development

1. Install dependencies:

```bash
yarn install
```

2. Setup environment variables:

```bash
cp .env.example .env.local
```

3. Run development server:

```bash
yarn dev
```

## Build untuk Production

```bash
yarn build
yarn start
```

## Teknologi yang Digunakan

-   Next.js 14
-   TypeScript
-   Tailwind CSS
-   Shadcn/ui
-   Prisma
-   NextAuth.js
-   React Hook Form
-   Zod validation
