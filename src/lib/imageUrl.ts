/**
 * Helper function to get full image URL from API
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getImageUrl(url: string): string {
  if (!url) return '';

  // Jika url sudah absolute dan mengandung domain API, gunakan langsung
  if (url.startsWith('https://api.gongkomodotour.com')) {
    return url;
  }

  // Jika url hanya nama file (misal: 1753969394_cover-login.jpg), buat url trip
  if (/^[\w-]+\.jpg$/.test(url) || /^[\w-]+\.(png|jpeg|gif|webp)$/.test(url)) {
    return `https://api.gongkomodotour.com/storage/trip/${url}`;
  }

  // Jika url sudah mengandung /storage/trip/ di awal, tambahkan domain
  if (url.startsWith('/storage/trip/')) {
    return `https://api.gongkomodotour.com${url}`;
  }

  // Jika url sudah mengandung storage/trip/ tanpa slash di awal
  if (url.startsWith('storage/trip/')) {
    return `https://api.gongkomodotour.com/${url}`;
  }

  // Fallback: gunakan API_URL dan hapus leading slash
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${API_URL}/${cleanUrl}`;
}

export default getImageUrl;
