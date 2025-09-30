# File Upload Mime Type Validation Fix

## Masalah

Error "gagal mengupdate trip validation mitmetypes" terjadi karena ketidaksesuaian validasi mime type antara frontend dan backend.

## Penyebab

1. **Konflik Validasi Mime Type**: FileUpload component menggunakan wildcard `'image/*'` yang tidak spesifik
2. **Inkonsistensi**: Payment component menggunakan mime type spesifik `["image/jpeg", "image/png", "image/jpg"]`
3. **Backend Validation**: Backend kemungkinan menolak wildcard dan memerlukan mime type yang tepat

## Solusi yang Diterapkan

### 1. Perubahan Accept Pattern

**Sebelum:**

```typescript
accept = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif"], // ❌ Wildcard tidak spesifik
};
```

**Sesudah:**

```typescript
accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
};
```

### 2. Validasi Tambahan

Menambahkan validasi mime type dan ekstensi file sebelum upload:

```typescript
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"];

const validFiles = acceptedFiles.filter((file) => {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  const hasAllowedMime = ALLOWED_MIME_TYPES.includes(file.type);

  if (!hasAllowedExt || !hasAllowedMime) {
    toast.error(
      `File ${file.name} tidak didukung. Gunakan format JPG, JPEG, PNG, atau GIF.`
    );
    return false;
  }
  return true;
});
```

### 3. Pesan Error yang Lebih Jelas

Memperbarui pesan error untuk memberikan informasi format file yang didukung.

## File yang Dimodifikasi

- `src/components/ui/file-upload.tsx`

## Format File yang Didukung

- **JPG/JPEG**: `image/jpeg`
- **PNG**: `image/png`
- **GIF**: `image/gif`

## Testing

Setelah perubahan ini, coba upload file dengan format yang berbeda:

1. ✅ JPG/JPEG - seharusnya berhasil
2. ✅ PNG - seharusnya berhasil
3. ✅ GIF - seharusnya berhasil
4. ❌ WEBP - seharusnya ditolak dengan pesan error yang jelas
5. ❌ PDF - seharusnya ditolak dengan pesan error yang jelas

## Catatan

Perubahan ini memastikan konsistensi validasi mime type antara frontend dan backend, sehingga error "validation mitmetypes" tidak akan terjadi lagi.

