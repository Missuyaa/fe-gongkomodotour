# FE Gongkomodotour

Frontend application for Gongkomodotour built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+
-   npm or yarn

### Installation

```bash
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

## 🔧 Recent Fixes

### API Assets Route Issue (Fixed ✅)

**Problem:**

```
"message": "The route api/assets/https%3A%2F%2Fapi.gongkomodotour.com%2Fstorage%2Fcabin%2F1755269934_Bena%20Village%203.png could not be found."
```

**Root Cause:**

-   Dashboard pages were using `encodeURIComponent(fileUrl)` in DELETE requests
-   This caused the full URL (including domain) to be encoded and sent as route parameter
-   Result: Invalid API route format

**Solution:**

1. **Created `src/lib/assetHelpers.ts`** with proper asset management functions
2. **Fixed `handleFileDelete`** functions in all dashboard pages
3. **Now using `asset.id`** instead of `encodeURIComponent(fileUrl)`

**Files Fixed:**

-   `src/app/dashboard/boats/[id]/edit/page.tsx`
-   `src/app/dashboard/carousel/page.tsx` (already fixed)
-   Other dashboard pages need similar fixes

**How It Works Now:**

```typescript
// ❌ Before (WRONG):
await apiRequest('DELETE', `/api/assets/${encodeURIComponent(fileUrl)}`);

// ✅ After (CORRECT):
const deletedAsset = await deleteAssetByFileUrl(fileUrl, assetList);
// Helper function finds asset by file_url and uses asset.id for deletion
```

### Boat Cabin Update Issue (Fixed ✅)

**Problem:**

```
SQLSTATE[HY000]: General error: 1364 Field 'boat_id' doesn't have a default value
```

**Root Cause:**

-   Frontend was sending cabin data **without ID** during boat update
-   Backend treated cabins as **new records** instead of **existing ones**
-   Database constraint: `boat_id` field cannot be NULL

**Solution:**

1. **Updated Zod schema** to include optional `id` field for cabins
2. **Modified form data loading** to preserve cabin IDs from database
3. **Updated API payload** to include cabin IDs when updating

**Files Fixed:**

-   `src/app/dashboard/boats/[id]/edit/page.tsx`

**How It Works Now:**

```typescript
// ❌ Before (WRONG):
cabins: [
    {
        cabin_name: 'Cabin Name',
        bed_type: 'King',
        // ... other fields
        // ❌ MISSING: id, boat_id
    },
];

// ✅ After (CORRECT):
cabins: [
    {
        id: 123, // 🔑 Cabin ID from database
        cabin_name: 'Cabin Name',
        bed_type: 'King',
        // ... other fields
    },
];
```

**Backend Still Needs Fix:**

Even with frontend fix, backend should also:

1. **Check if cabin exists** before updating
2. **Use UPDATE** for existing cabins, **INSERT** only for new ones
3. **Always set `boat_id`** when creating new cabins

### Additional Fees Day Type Standardization (Fixed ✅)

**Problem:**

-   Inconsistent day type labels between create and edit trips pages
-   Create page used English labels ("Weekday", "Weekend")
-   Edit page used Indonesian labels ("Hari Kerja", "Akhir Pekan")

**Solution:**

1. **Standardized day type options** to only 2 types: Weekday and Weekend
2. **Unified language labels** to Indonesian for consistency
3. **Removed unnecessary options** to simplify user experience

**Files Fixed:**

-   `src/app/dashboard/trips/create/page.tsx`
-   `src/app/dashboard/trips/[id]/edit/page.tsx` (already had correct labels)

**How It Works Now:**

```typescript
// ✅ Consistent across all trip pages:
day_type: z.enum(["Weekday", "Weekend"])

// UI Labels (Indonesian):
<SelectItem value="Weekday">Hari Kerja</SelectItem>
<SelectItem value="Weekend">Akhir Pekan</SelectItem>
```

**Benefits:**

-   ✅ **Simplified choices** - Only 2 day types instead of multiple options
-   ✅ **Consistent language** - All pages use Indonesian labels
-   ✅ **Better UX** - Users don't get confused with too many options
-   ✅ **Easier maintenance** - Consistent data structure across the system

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── dashboard/         # Admin dashboard
│   ├── (landing)/        # Public landing pages
│   └── api/              # API routes
├── components/            # Reusable UI components
├── lib/                   # Utility functions and helpers
├── types/                 # TypeScript type definitions
└── contexts/              # React contexts
```

## 🎨 UI Components

Built with shadcn/ui components and custom styling using Tailwind CSS.

## 🔐 Authentication

Uses custom authentication system with role-based access control.

## 📱 Responsive Design

Mobile-first approach with responsive breakpoints for all screen sizes.

## 🚀 Deployment

Ready for deployment on Vercel, Netlify, or any static hosting platform.
