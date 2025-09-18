# Perbaikan Error Hapus Gambar Trip

## Masalah yang Diperbaiki

### Error: "getaddrinfo EAI_AGAIN via.placeholder.com"

**Masalah**: Error DNS terjadi ketika sistem mencoba mengakses `via.placeholder.com` yang tidak dapat diakses
**Penyebab**:

1. Konfigurasi `next.config.ts` masih mengizinkan akses ke `via.placeholder.com`
2. Masih ada referensi ke URL placeholder yang tidak valid
3. Error handling yang tidak memadai saat hapus file

**Solusi**:

1. Menghapus konfigurasi `via.placeholder.com` dari `next.config.ts`
2. Memastikan semua placeholder menggunakan data URL SVG
3. Memperbaiki error handling dan logging untuk debugging

## Perubahan yang Dibuat

### 1. `next.config.ts`

#### Menghapus Konfigurasi via.placeholder.com:

```typescript
// SEBELUM: Masih ada konfigurasi untuk via.placeholder.com
{
  protocol: 'https',
  hostname: 'via.placeholder.com',
  pathname: '/**',
}

// SESUDAH: Dihapus sepenuhnya
// Tidak ada konfigurasi untuk via.placeholder.com
```

#### Membersihkan Domains:

```typescript
// SEBELUM: Masih ada via.placeholder.com di domains
domains: [
  "localhost",
  "lh3.googleusercontent.com",
  "api.gongkomodotour.com",
  "picsum.photos",
  "images.unsplash.com",
  "via.placeholder.com",
  "source.unsplash.com",
];

// SESUDAH: Dihapus via.placeholder.com
domains: [
  "localhost",
  "lh3.googleusercontent.com",
  "api.gongkomodotour.com",
  "picsum.photos",
  "images.unsplash.com",
  "source.unsplash.com",
];
```

### 2. `src/components/ui/file-upload.tsx`

#### Perbaikan onDrop Callback:

```javascript
// SEBELUM: onUpload dipanggil dengan files state yang mungkin tidak update
setFiles((prev) => {
  const updated = [...prev, ...newFiles];
  return updated;
});

await onUpload(
  allFiles.map((f) => f.file),
  allFiles.map((f) => f.title),
  allFiles.map((f) => f.description)
);

// SESUDAH: onUpload dipanggil setelah state diupdate
setFiles((prev) => {
  const updated = [...prev, ...newFiles];

  // Call onUpload with updated files after state is set
  setTimeout(() => {
    onUpload(
      updated.map((f) => f.file),
      updated.map((f) => f.title),
      updated.map((f) => f.description)
    ).catch((error) => {
      console.error("Error uploading files:", error);
      toast.error("Gagal mengupload file");
    });
  }, 0);

  return updated;
});
```

### 3. `src/app/dashboard/trips/[id]/edit/page.tsx`

#### Perbaikan handleFileDelete dengan Logging Detail:

```javascript
const handleFileDelete = async (fileUrl: string) => {
  try {
    console.log("handleFileDelete called with fileUrl:", fileUrl);
    console.log(
      "Current existingFiles:",
      existingFiles.map((f) => ({
        id: f.id,
        title: f.title,
        file_url: f.file_url,
      }))
    );

    // Cari asset berdasarkan file_url
    const asset = existingFiles.find((file) => file.file_url === fileUrl);
    if (!asset) {
      console.error("Asset not found for fileUrl:", fileUrl);
      throw new Error("Asset tidak ditemukan");
    }

    // Logging detail untuk debugging
    console.log("Found asset to delete:", {
      fileUrl,
      assetId: asset.id,
      assetTitle: asset.title,
      currentExistingFiles: existingFiles.length,
    });

    // Hapus dari tampilan existing files dengan logging detail
    setExistingFiles((prev) => {
      console.log(
        "Filtering existing files, removing asset with ID:",
        asset.id
      );
      const filtered = prev.filter((file) => {
        const shouldKeep = file.id !== asset.id;
        console.log(
          `File ${file.id} (${file.title}): ${shouldKeep ? "KEEP" : "REMOVE"}`
        );
        return shouldKeep;
      });
      console.log("Existing files after deletion:", {
        before: prev.length,
        after: filtered.length,
        removed: prev.length - filtered.length,
        remainingFiles: filtered.map((f) => ({ id: f.id, title: f.title })),
      });
      return filtered;
    });

    toast.success(
      `File "${
        asset.title || "Untitled"
      }" akan dihapus setelah menyimpan perubahan`
    );
  } catch (error) {
    console.error("Error deleting file:", error);
    toast.error("Gagal menghapus file");
  }
};
```

#### Perbaikan FileUpload onUpload Callback:

```javascript
<FileUpload
  onUpload={async (files, titles, descriptions) => {
    console.log("FileUpload onUpload called:", {
      filesCount: files.length,
      titlesCount: titles.length,
      descriptionsCount: descriptions.length,
    });
    setFiles(files);
    setFileTitles(titles);
    setFileDescriptions(descriptions);
  }}
  onDelete={handleFileDelete}
  existingFiles={existingFiles}
  maxFiles={5}
  maxSize={10 * 1024 * 1024} // 10MB
/>
```

## Cara Testing

### Test 1: Hapus Satu Gambar

1. Buka halaman edit trip yang memiliki 2+ gambar
2. Buka Developer Tools Console
3. Hover pada salah satu gambar
4. Klik tombol hapus (X) pada gambar tersebut
5. **Expected**:
   - Hanya gambar yang dipilih yang hilang
   - Console menampilkan log detail tentang proses hapus
   - Tidak ada error DNS atau network error

### Test 2: Cek Console Logs

1. Buka Console di Developer Tools
2. Cari log "handleFileDelete called with fileUrl:" - pastikan fileUrl valid
3. Cari log "Found asset to delete:" - pastikan asset ditemukan
4. Cari log "File X (title): KEEP/REMOVE" - pastikan hanya file yang dipilih yang dihapus
5. Cari log "Existing files after deletion:" - pastikan count berkurang 1

### Test 3: Test Upload dan Hapus

1. Upload gambar baru
2. Hapus salah satu gambar existing
3. **Expected**:
   - Gambar baru tetap ada
   - Gambar yang dihapus hilang
   - Tidak ada error

## Logging yang Ditambahkan

### 1. File Deletion Process

```javascript
console.log("handleFileDelete called with fileUrl:", fileUrl);
console.log(
  "Current existingFiles:",
  existingFiles.map((f) => ({ id: f.id, title: f.title, file_url: f.file_url }))
);
console.log("Found asset to delete:", {
  fileUrl,
  assetId: asset.id,
  assetTitle: asset.title,
});
```

### 2. File Filtering Process

```javascript
console.log("Filtering existing files, removing asset with ID:", asset.id);
console.log(
  `File ${file.id} (${file.title}): ${shouldKeep ? "KEEP" : "REMOVE"}`
);
console.log("Existing files after deletion:", {
  before: prev.length,
  after: filtered.length,
  removed: prev.length - filtered.length,
  remainingFiles: filtered.map((f) => ({ id: f.id, title: f.title })),
});
```

### 3. File Upload Process

```javascript
console.log("FileUpload onUpload called:", {
  filesCount: files.length,
  titlesCount: titles.length,
  descriptionsCount: descriptions.length,
});
```

## Debugging Steps

Jika masih ada masalah, ikuti langkah-langkah debugging ini:

1. **Cek Console Logs**:

   - Pastikan "handleFileDelete called with fileUrl:" menampilkan fileUrl yang valid
   - Pastikan "Found asset to delete:" menampilkan asset yang benar
   - Pastikan "File X (title): REMOVE" hanya untuk file yang dipilih

2. **Cek Network Errors**:

   - Pastikan tidak ada error "getaddrinfo EAI_AGAIN via.placeholder.com"
   - Pastikan tidak ada error DNS atau network error

3. **Cek State Management**:
   - Pastikan existingFiles state diupdate dengan benar
   - Pastikan filesToDelete state berisi ID yang benar

## Catatan Penting

1. **DNS Error**: Menghapus konfigurasi `via.placeholder.com` mencegah error DNS
2. **State Management**: Logging detail membantu debug masalah state
3. **Error Handling**: Error handling yang lebih baik untuk mencegah crash
4. **Data URL**: Semua placeholder menggunakan data URL SVG yang valid

## Expected Behavior

Setelah perbaikan ini:

- Tidak ada error "getaddrinfo EAI_AGAIN via.placeholder.com"
- Hapus satu gambar hanya menghilangkan gambar tersebut
- Console menampilkan log yang jelas untuk debugging
- State management bekerja dengan konsisten
- Tidak ada network error saat hapus file
