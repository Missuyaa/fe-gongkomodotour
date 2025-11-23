"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { Booking } from "@/types/bookings";
import { Transaction, TransactionAsset } from "@/types/transactions";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Icons dari lucide-react (shadcn UI standard icon library)
import { 
  Calendar, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Hotel,
  Ship,
  DollarSign,
  Receipt,
  CreditCard,
  Upload,
  RefreshCw
} from "lucide-react";
import { FaUpload } from "react-icons/fa";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ImageModal } from "@/components/ui/image-modal";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BookingResponse {
  data: Booking;
}

// Helper untuk mendapatkan image URL (mengikuti pattern dari data-table.tsx)
function getImageUrl(fileUrl: string | undefined) {
  if (!fileUrl || fileUrl.trim() === '') {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
  }
  
  // Jika sudah URL lengkap, return langsung
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  
  // Jika Next.js static path, return langsung
  if (fileUrl.startsWith('/img/') || fileUrl.startsWith('/_next/') || fileUrl.startsWith('/api/')) {
    return fileUrl;
  }
  
  // Pastikan fileUrl dimulai dengan slash
  const cleanUrl = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  const fullUrl = `${API_URL}${cleanUrl}`;
  
  return fullUrl;
}

// Helper untuk parse HTML content (include/exclude)
function parseHtmlContent(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return decoded.trim();
}

// Helper untuk format status badge
function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
    case "completed":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface TransactionResponse {
  data: Transaction[];
}

// Tambahkan interface ekstensi untuk jsPDF
interface JsPdfWithAutoTable {
  lastAutoTable?: { finalY: number }
}

export default function BookingDetailPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<TransactionAsset | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

  useEffect(() => {
    // Cek apakah user sudah login
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    if (bookingId) {
      fetchBookingDetail();
      fetchTransaction();
    }
  }, [bookingId, router]);

  const fetchBookingDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Coba endpoint landing-page terlebih dahulu (seperti di payment page)
      let response;
      try {
        response = await apiRequest<Record<string, unknown>>(
          'GET',
          `/api/landing-page/bookings/${bookingId}`
        );
      } catch (err: any) {
        // Jika endpoint tidak ada, coba endpoint biasa
        if (err?.response?.status === 404) {
          response = await apiRequest<BookingResponse>(
            'GET',
            `/api/bookings/${bookingId}`
          );
        } else {
          throw err;
        }
      }

      console.log('Booking detail response:', response);

      // Handle berbagai format response (seperti di payment page)
      let bookingData: Booking | null = null;
      
      // Normalize berbagai format response
      const extractBooking = (raw: any): Booking | null => {
        if (!raw) return null;
        // { data: {...} }
        if (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
          return raw.data as Booking;
        }
        // { booking: {...} }
        if (raw?.booking && typeof raw.booking === 'object') {
          return raw.booking as Booking;
        }
        // Direct object
        if (raw?.id && raw?.trip_id) {
          return raw as Booking;
        }
        return null;
      };

      bookingData = extractBooking(response);

      if (bookingData) {
        console.log('Booking data extracted:', bookingData);
        const bookingAny = bookingData as any;
        console.log('Date fields check:', {
          start_date: bookingAny.start_date,
          trip_start_date: bookingAny.trip_start_date,
          departure_date: bookingAny.departure_date,
          end_date: bookingAny.end_date,
          trip_end_date: bookingAny.trip_end_date,
          return_date: bookingAny.return_date,
          created_at: bookingData.created_at,
          updated_at: bookingData.updated_at,
          allDateKeys: Object.keys(bookingAny).filter(k => 
            k.toLowerCase().includes('date') || 
            k.toLowerCase().includes('start') || 
            k.toLowerCase().includes('departure') ||
            k.toLowerCase().includes('end') ||
            k.toLowerCase().includes('return')
          )
        });
        
        // Log warning jika start_date tidak ada
        if (!bookingAny.start_date && !bookingAny.trip_start_date && !bookingAny.departure_date) {
          console.warn('⚠️ WARNING: No start_date found in booking data!', {
            bookingId: bookingData.id,
            availableKeys: Object.keys(bookingAny)
          });
        }
        
        setBooking(bookingData);
      } else {
        setError('Data booking tidak ditemukan.');
      }
    } catch (err: any) {
      console.error('Error fetching booking detail:', err);
      
      // Handle error 401 (Unauthorized - not logged in)
      if (err?.response?.status === 401) {
        setError('Anda belum login. Silakan login terlebih dahulu.');
        router.push('/auth/login');
        return;
      }
      // Handle error 403 (Forbidden - no permission)
      else if (err?.response?.status === 403) {
        setError('Anda tidak memiliki izin untuk mengakses data booking ini.');
      } 
      // Handle error 404 (Not Found)
      else if (err?.response?.status === 404) {
        setError('Booking tidak ditemukan.');
      }
      // Handle error lainnya
      else {
        const errorMessage = err?.response?.data?.message || err?.message || 'Gagal memuat data booking. Silakan coba lagi.';
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function untuk normalisasi dan sorting assets
  const normalizeAndSortAssets = (assets: TransactionAsset[] | undefined): TransactionAsset[] => {
    if (!assets || assets.length === 0) return [];
    
    // Filter duplikasi berdasarkan id atau file_url
    const uniqueAssets = new Map<string | number, TransactionAsset>();
    assets.forEach(asset => {
      if (!asset || !asset.file_url) return;
      const key = asset.id || asset.file_url;
      if (!uniqueAssets.has(key)) {
        uniqueAssets.set(key, asset);
      } else {
        // Jika sudah ada, ambil yang updated_at lebih baru
        const existing = uniqueAssets.get(key)!;
        const existingDate = new Date(existing.updated_at || existing.created_at).getTime();
        const currentDate = new Date(asset.updated_at || asset.created_at).getTime();
        if (currentDate > existingDate) {
          uniqueAssets.set(key, asset);
        }
      }
    });
    
    // Sort berdasarkan updated_at atau created_at (terbaru di atas)
    return Array.from(uniqueAssets.values()).sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA; // DESC: terbaru di atas
    });
  };

  // Helper function untuk mendapatkan transaction terbaru dari array
  const getLatestTransaction = (transactions: Transaction[]): Transaction | null => {
    if (!transactions || transactions.length === 0) return null;
    
    // Sort berdasarkan updated_at atau created_at (terbaru di atas)
    const sorted = transactions.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA; // DESC: terbaru di atas
    });
    
    return sorted[0];
  };

  // Helper function untuk mencari transaction berdasarkan booking_id
  const findTransactionByBookingId = (transactions: Transaction[], bookingId: string): Transaction[] => {
    const bookingIdStr = String(bookingId);
    return transactions.filter((t: Transaction) => {
      const tBookingId = typeof t.booking_id === 'string' ? t.booking_id : String(t.booking_id);
      const tBookingIdFromBooking = t.booking?.id ? (typeof t.booking.id === 'string' ? t.booking.id : String(t.booking.id)) : null;
      return tBookingId === bookingIdStr || tBookingIdFromBooking === bookingIdStr;
    });
  };

  // Helper function untuk normalisasi transaction data
  const normalizeTransaction = (transaction: Transaction): Transaction => {
    if (!transaction) return transaction;
    
    // Normalisasi assets
    const normalizedAssets = normalizeAndSortAssets(transaction.assets);
    
    return {
      ...transaction,
      assets: normalizedAssets
    };
  };

  const fetchTransaction = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsRefreshing(true);
      }

      let transactionData: Transaction | null = null;
      const bookingIdStr = String(bookingId);

      // Coba endpoint secara berurutan
      const endpoints = [
        { url: `/api/transactions?booking_id=${bookingId}`, name: 'query param' },
        { url: '/api/transactions', name: 'all transactions' },
        { url: `/api/landing-page/transactions/${bookingId}`, name: 'landing-page' }
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await apiRequest<any>('GET', endpoint.url);
          
          if (endpoint.name === 'query param' || endpoint.name === 'all transactions') {
            // Handle array response
            if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
              let matchingTransactions: Transaction[] = [];
              
              if (endpoint.name === 'query param') {
                // Langsung ambil semua yang match booking_id
                matchingTransactions = findTransactionByBookingId(response.data, bookingIdStr);
              } else {
                // Filter dari semua transactions
                matchingTransactions = findTransactionByBookingId(response.data, bookingIdStr);
              }
              
              if (matchingTransactions.length > 0) {
                transactionData = getLatestTransaction(matchingTransactions);
                console.log(`✅ Transaction found via ${endpoint.name} (${matchingTransactions.length} found, using latest)`);
                break;
              }
            }
          } else {
            // Handle single object response
            if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
              transactionData = response.data as Transaction;
              console.log(`✅ Transaction found via ${endpoint.name}`);
              break;
            } else if (response && typeof response === 'object' && (response as any).id) {
              transactionData = response as Transaction;
              console.log(`✅ Transaction found via ${endpoint.name} (direct object)`);
              break;
            }
          }
        } catch (err: any) {
          const errorMsg = err?.response?.data?.message || err?.message || '';
          if (!errorMsg.includes('not found')) {
            console.log(`⚠️ ${endpoint.name} endpoint error:`, err?.response?.status || err?.message);
          }
          // Continue ke endpoint berikutnya
        }
      }

      if (transactionData) {
        // Normalisasi transaction (sort assets, dll)
        const normalized = normalizeTransaction(transactionData);
        
        console.log('✅ Transaction found (LATEST):', {
          id: normalized.id,
          booking_id: normalized.booking_id,
          payment_status: normalized.payment_status,
          assets_count: normalized.assets?.length || 0,
          updated_at: normalized.updated_at
        });
        
        setTransaction(normalized);
        return normalized;
      } else {
        console.log('ℹ️ No transaction found for booking_id:', bookingId);
        setTransaction(null);
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching transaction:', err?.response?.status || err?.message);
      setTransaction(null);
      return null;
    } finally {
      if (showLoading) {
        setIsRefreshing(false);
      }
    }
  };

  // Fungsi untuk refresh data dengan retry mechanism
  const refreshTransactionData = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      console.log(`🔄 Refreshing transaction data (attempt ${i + 1}/${retries})...`);
      const updatedTransaction = await fetchTransaction(i === 0); // Show loading only on first attempt
      
      if (updatedTransaction) {
        console.log('✅ Transaction data refreshed successfully');
        return updatedTransaction;
      }
      
      // Jika belum berhasil dan masih ada retry, tunggu sebentar
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
    
    console.log('⚠️ Failed to refresh transaction data after all retries');
    return null;
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    
    try {
      // Handle format yyyy-MM-dd dari Booking.tsx
      // Format: "2025-11-24" -> perlu di-parse dengan benar
      let date: Date;
      
      // Jika format yyyy-MM-dd, parse dengan benar
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        // Handle format lainnya (ISO, dll)
        date = new Date(dateString);
      }
      
      // Validasi apakah date valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return dateString;
      }
      
      return format(date, "dd MMMM yyyy", { locale: id });
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return dateString;
    }
  };

  // Helper functions untuk menghitung harga invoice
  const getRegionFromCountry = (country: string | undefined) => {
    if (!country || country === 'ID') return 'domestic';
    return 'overseas';
  };

  const normalizeDate = (date: string | Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getTripDates = () => {
    if (!booking) return [];
    const bookingAny = booking as any;
    const startDateStr = bookingAny.start_date || bookingAny.trip_start_date || bookingAny.departure_date || booking.created_at;
    const days = booking.trip_duration?.duration_days || 0;
    if (!startDateStr || !days) return [];
    const startDate = normalizeDate(startDateStr);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  };

  const calculateSurcharge = () => {
    if (!booking) return 0;
    const trip = booking.trip as any;
    const surcharges = trip?.surcharges;
    if (!surcharges || !Array.isArray(surcharges)) return 0;
    
    const tripDates = getTripDates();
    let surchargeAmount = 0;
    surcharges.forEach((surcharge: any) => {
      const start = normalizeDate(surcharge.start_date);
      const end = normalizeDate(surcharge.end_date);
      const isInSurchargePeriod = tripDates.some(date => date >= start && date <= end);
      if (isInSurchargePeriod) {
        surchargeAmount = Number(surcharge.surcharge_price || 0);
      }
    });
    return surchargeAmount * (booking.total_pax || 1);
  };

  const calculateBasePrice = () => {
    if (!booking) return 0;
    const pax = booking.total_pax;
    const trip = booking.trip as any;
    const tripHasBoat = trip?.has_boat ?? false;
    const hasBoatSelections = (booking.boat && booking.boat.length > 0) || (booking.cabin && booking.cabin.length > 0);
    
    if (tripHasBoat || hasBoatSelections) {
      const cabinTotals = (booking.cabin || []).map(c => Number((c as any).booking_total_price || 0));
      const sumCabinTotals = cabinTotals.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
      if (sumCabinTotals > 0) return 0;
      
      const cabinBasePrices = (booking.cabin || []).map(c => Number((c as any).base_price || 0));
      const minCabinPrice = cabinBasePrices.length > 0 ? Math.min(...cabinBasePrices.filter(n => Number.isFinite(n))) : 0;
      return Number.isFinite(minCabinPrice) ? minCabinPrice : 0;
    }
    
    const prices = booking.trip_duration?.trip_prices as any[];
    if (!prices || prices.length === 0) return 0;

    const region = getRegionFromCountry(booking.customer_country);
    const price = prices.find((p: any) =>
      pax >= p.pax_min &&
      pax <= p.pax_max &&
      (p.region === 'Domestic & Overseas' ||
       (region === 'domestic' && p.region === 'Domestic') ||
       (region === 'overseas' && p.region === 'Overseas'))
    );
    return price ? Number(price.price_per_pax || 0) : 0;
  };

  const calculateBasePriceTotal = () => {
    if (!booking) return 0;
    const basePrice = calculateBasePrice();
    return basePrice * booking.total_pax;
  };

  const calculateAdditionalFeesTotal = () => {
    if (!booking) return 0;
    const fees = booking.additional_fees || [];
    const pax = booking.total_pax;
    const days = booking.trip_duration?.duration_days || 0;

    return fees.reduce((sum, fee) => {
      const price = Number((fee as any).price || 0);
      const unit = (fee as any).unit || '';
      switch (unit) {
        case 'per_pax':
          return sum + price * pax;
        case 'per_5pax':
          return sum + price * Math.ceil(pax / 5);
        case 'per_day':
        case 'per_day_guide':
          return sum + price * Math.max(days, 0);
        default:
          return sum + price;
      }
    }, 0);
  };

  const calculateHotelTotal = () => {
    if (!booking?.hotel_occupancy) return 0;
    const pricePerNight = Number((booking.hotel_occupancy as any).price || 0);
    const nights = booking.trip_duration?.duration_nights ?? Math.max((booking.trip_duration?.duration_days || 0) - 1, 0);
    return pricePerNight * Math.max(nights, 0);
  };

  const getCabinTotal = () => {
    if (!booking) return 0;
    return (booking.cabin || []).reduce((sum, c) => {
      const totalFromCabin = Number((c as any).booking_total_price || 0);
      if (totalFromCabin > 0) return sum + totalFromCabin;
      const unit = Number((c as any).base_price || 0);
      const qty = Number((c as any).booking_total_pax || 0);
      return sum + (Number.isFinite(unit) && Number.isFinite(qty) ? unit * qty : 0);
    }, 0);
  };

  // Fungsi untuk mencetak invoice PDF
  const handlePrintInvoice = () => {
    if (!booking) return;
    try {
      const doc = new jsPDF();
      const gold: [number, number, number] = [218, 165, 32];
      const left = 15;
      const right = 195;
      let y = 20;

      // Header
      doc.setFontSize(10);
      doc.text('Gong Komodo Tour', left, y);
      doc.setFontSize(22);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text('INVOICE', right, y, { align: 'right' });
      y += 8;
      doc.setDrawColor(gold[0], gold[1], gold[2]);
      doc.setLineWidth(1);
      doc.line(left, y, right, y);
      y += 6;

      // Info Booking Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(left, y, right - left, 24, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      let infoY = y + 7;
      doc.text(`Booking Code: #${booking.id.toString().padStart(6, '0')}`, left + 4, infoY);
      if (booking.customer_name) {
        doc.text(`Customer: ${booking.customer_name}`, left + 70, infoY);
      }
      infoY += 7;
      doc.text(`Trip: ${booking.trip?.name || '-'}`, left + 4, infoY);
      doc.text(`Tanggal Booking: ${new Date(booking.created_at).toLocaleString('id-ID')}`, left + 70, infoY);
      y += 28;

      // Rincian Biaya Table
      doc.setFontSize(13);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text('Rincian Biaya', left, y);
      y += 4;
      doc.setTextColor(0, 0, 0);

      // Siapkan data tabel
      const rows: [string, string][] = [];
      const tripType = (booking.trip as any)?.type || 'Private Trip';
      const basePrice = calculateBasePrice();
      const basePriceTotal = calculateBasePriceTotal();
      
      if (basePrice > 0) {
        rows.push([
          tripType === 'Open Trip' ? 'Open Trip' : 'Private Trip',
          `IDR ${basePrice.toLocaleString('id-ID')}/pax x ${booking.total_pax} pax = IDR ${basePriceTotal.toLocaleString('id-ID')}`
        ]);
      }

      (booking.additional_fees || []).forEach((fee: any) => {
        rows.push([
          fee.fee_category || '-',
          `IDR ${Number(fee.price || 0).toLocaleString('id-ID')}` +
            (fee.unit === 'per_pax' ? '/pax' : '') +
            (fee.unit === 'per_5pax' ? '/5 pax' : '') +
            (fee.unit === 'per_day' ? '/hari' : '') +
            (fee.unit === 'per_day_guide' ? '/hari' : '')
        ]);
      });

      (booking.cabin || []).forEach((cabin: any) => {
        rows.push([
          `${cabin.cabin_name || '-'} (${cabin.bed_type || '-'})`,
          `${cabin.max_pax || cabin.booking_total_pax || 0} pax`
        ]);
      });

      if (booking.hotel_occupancy) {
        const hotel = booking.hotel_occupancy as any;
        rows.push([
          `${hotel.hotel_name || '-'} (${hotel.occupancy || '-'})`,
          `IDR ${Number(hotel.price || 0).toLocaleString('id-ID')}/malam x ${booking.trip_duration?.duration_nights || 0} malam`
        ]);
      }

      const surcharge = calculateSurcharge();
      if (surcharge > 0) {
        rows.push([
          'Surcharge (High Peak Season)',
          `IDR ${(surcharge / (booking.total_pax || 1)).toLocaleString('id-ID')}/pax x ${booking.total_pax} pax = IDR ${surcharge.toLocaleString('id-ID')}`
        ]);
      }

      // Pastikan rows tidak ada undefined/null
      const safeRows = rows.map(row => [row[0] || '-', row[1] || '-']);

      autoTable(doc, {
        startY: y + 4,
        head: [['Keterangan', 'Nominal']],
        body: safeRows,
        theme: 'grid',
        headStyles: { fillColor: gold, textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: 20 },
        styles: { fontSize: 11, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: left, right: 15 },
      });
      
      // Type guard untuk akses lastAutoTable
      let lastY = y + 8;
      const docWithTable = doc as JsPdfWithAutoTable;
      if (docWithTable.lastAutoTable && typeof docWithTable.lastAutoTable.finalY === 'number') {
        lastY = docWithTable.lastAutoTable.finalY + 8;
      }
      y = lastY;

      // Sub Total & Jumlah Total
      doc.setFontSize(13);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text('Sub Total:', left, y);
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(`IDR ${Number(booking.total_price || 0).toLocaleString('id-ID')}`, right, y, { align: 'right' });
      y += 9;
      doc.setFontSize(15);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text('Jumlah Total:', left, y);
      doc.text(`IDR ${Number(booking.total_price || 0).toLocaleString('id-ID')}`, right, y, { align: 'right' });
      y += 15;

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, left, y);
      doc.save(`Invoice_Booking_${booking.id.toString().padStart(6, '0')}.pdf`);
    } catch (err) {
      alert('Gagal membuat PDF. Silakan coba lagi.');
      console.error('PDF Error:', err);
    }
  };

  // Fungsi untuk handle upload bukti transfer
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi mime & ekstensi
      const lowerName = file.name.toLowerCase();
      const hasAllowedExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
      const hasAllowedMime = ALLOWED_MIME_TYPES.includes(file.type);
      
      if (!hasAllowedExt || !hasAllowedMime) {
        setUploadError("Format file tidak didukung. Gunakan JPG/ JPEG/ PNG.");
        setPaymentProof(null);
        setImagePreview(null);
        if (e.target) e.target.value = "";
        return;
      }

      setPaymentProof(file);
      setUploadError(null);
      setUploadSuccess(false);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImagePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    }
  };

  const handleUploadPaymentProof = async () => {
    if (!paymentProof || !booking) {
      setUploadError("Silakan pilih file terlebih dahulu.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(false);

      const formData = new FormData();
      
      // Tambahkan data transaksi yang diperlukan
      formData.append('booking_id', String(booking.id));
      
      // Jika transaction sudah ada, gunakan data yang ada. Jika belum, gunakan data dari booking
      if (transaction) {
        formData.append('bank_type', transaction.bank_type || '');
        formData.append('total_amount', String(transaction.total_amount || booking.total_price));
      } else {
        // Jika belum ada transaction, gunakan data dari booking
        formData.append('bank_type', '');
        formData.append('total_amount', String(booking.total_price));
      }
      
      formData.append('payment_status', 'Menunggu Pembayaran'); // Reset ke Menunggu Pembayaran setelah upload ulang
      
      // Tambahkan file bukti transfer
      formData.append('assets[0][title]', 'Bukti Transfer');
      formData.append('assets[0][description]', 'Bukti transfer pembayaran');
      formData.append('assets[0][is_external]', '0');
      formData.append('assets[0][file]', paymentProof);

      // Selalu gunakan POST untuk create/update transaction dengan file
      // Backend akan handle apakah create baru atau update existing
      await apiRequest(
        'POST',
        '/api/landing-page/transactions',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setUploadSuccess(true);
      setPaymentProof(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh transaction data dengan retry mechanism untuk memastikan data terbaru
      // Tunggu sebentar untuk memberi waktu backend memproses file upload
      setTimeout(async () => {
        await refreshTransactionData(3, 1500);
      }, 2000);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 5000);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const apiMsg = (anyErr?.response?.data?.message || anyErr?.message || '').toString();
      
      if (apiMsg.includes('validation.mimes')) {
        setUploadError('Format file tidak didukung server. Gunakan JPG/ JPEG/ PNG.');
      } else {
        setUploadError(apiMsg || 'Gagal mengunggah bukti transfer. Coba lagi.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error || 'Data booking tidak ditemukan.'}</p>
            <Button onClick={() => router.push('/booking/book-history')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Riwayat
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Ambil tanggal keberangkatan - mengikuti format dari Booking.tsx
  // Di Booking.tsx: start_date: format(selectedDate, "yyyy-MM-dd")
  // Jadi langsung ambil start_date dari booking
  const startDate = (booking as any).start_date || null;
  const endDate = (booking as any).end_date || null;
  
  // Log untuk debugging
  if (!startDate) {
    console.log('Booking date fields:', {
      start_date: (booking as any).start_date,
      end_date: (booking as any).end_date,
      booking_id: booking.id
    });
  }

  // Get trip image
  const trip = booking.trip as any;
  const imageUrl = trip?.assets?.[0]?.file_url ||
                   trip?.assets?.[0]?.original_file_url ||
                   trip?.main_image ||
                   trip?.image ||
                   trip?.thumbnail;

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-11/12 mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Button
            onClick={() => router.push('/booking/book-history')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Riwayat
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Detail Pemesanan
              </h1>
              <p className="text-gray-600">
                Booking ID: #{booking.id}
              </p>
            </div>
            {getStatusBadge(booking.status)}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-8 space-y-6">
            {/* Trip Information */}
            <Card className="p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-3">Informasi Trip</h2>
              <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden shadow-md">
                <Image
                  src={getImageUrl(imageUrl)}
                  alt={booking.trip?.name || "Trip Image"}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/img/default-image.png";
                  }}
                />
                <div className="absolute top-3 left-3">
                  <Badge 
                    variant="secondary" 
                    className={booking.trip?.type === "Open Trip" 
                      ? "bg-green-500 text-white border-0" 
                      : "bg-red-500 text-white border-0"
                    }
                  >
                    {booking.trip?.type || "Trip"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{booking.trip?.name || "Trip"}</h3>
                  {booking.trip?.meeting_point && (
                    <div className="flex items-start gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{booking.trip.meeting_point}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Package className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Durasi</p>
                      <p className="text-gray-900 font-medium">{booking.trip_duration?.duration_label || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Jumlah Pax</p>
                      <p className="text-gray-900 font-medium">{booking.total_pax} orang</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tanggal Keberangkatan</p>
                      {startDate ? (
                        <>
                          <p className="text-gray-900 font-medium">
                            {formatDate(startDate)}
                          </p>
                          {endDate && (
                            <p className="text-sm text-gray-500">Sampai {formatDate(endDate)}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 italic">Belum ditentukan</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tanggal Pemesanan</p>
                      <p className="text-gray-900 font-medium">{formatDate(booking.created_at)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Trip Include/Exclude jika ada */}
                {(booking.trip?.include || booking.trip?.exclude) && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {booking.trip?.include && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-semibold text-green-900">Include</p>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            {parseHtmlContent(booking.trip.include).split('\n').filter(line => line.trim()).map((line, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">•</span>
                                <span>{line.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {booking.trip?.exclude && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2 mb-3">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <p className="text-sm font-semibold text-red-900">Exclude</p>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            {parseHtmlContent(booking.trip.exclude).split('\n').filter(line => line.trim()).map((line, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-red-600 mt-1">•</span>
                                <span>{line.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Customer Information */}
            <Card className="p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-3">Informasi Customer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-600">Nama</p>
                    <p className="text-gray-900 font-medium break-words">{booking.customer_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-gray-900 font-medium break-words">{booking.customer_email || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-600">Telepon</p>
                    <p className="text-gray-900 font-medium">{booking.customer_phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-600">Negara</p>
                    <p className="text-gray-900 font-medium">{booking.customer_country || "-"}</p>
                  </div>
                </div>
                {booking.customer_address && (
                  <div className="flex items-start gap-2 md:col-span-2">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-600">Alamat</p>
                      <p className="text-gray-900 font-medium break-words">{booking.customer_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar - Summary Cards */}
          <div className="xl:col-span-4 space-y-6">
            {/* Transaction & Payment Proof Section */}
            <Card className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-gold" />
                  <h2 className="text-xl font-bold text-gray-900">Informasi Pembayaran</h2>
                </div>
                <Button
                  onClick={() => refreshTransactionData(3, 1000)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Memperbarui...' : 'Refresh'}
                </Button>
              </div>
              
              {transaction ? (
                <div className="space-y-6">
                  {/* Transaction Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transaction.payment_status && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Status Pembayaran</p>
                        <Badge 
                          className={
                            transaction.payment_status === "Lunas" || 
                            transaction.payment_status === "Pembayaran Berhasil" ||
                            transaction.payment_status?.toLowerCase() === "paid" ||
                            transaction.payment_status?.toLowerCase() === "confirmed"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : transaction.payment_status === "Menunggu Pembayaran" ||
                                transaction.payment_status?.toLowerCase() === "pending" ||
                                transaction.payment_status?.toLowerCase() === "waiting"
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                              : transaction.payment_status === "Ditolak" ||
                                transaction.payment_status?.toLowerCase() === "rejected" ||
                                transaction.payment_status?.toLowerCase() === "cancelled"
                              ? "bg-red-100 text-red-700 hover:bg-red-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                          }
                        >
                          {transaction.payment_status}
                        </Badge>
                      </div>
                    )}
                    
                    {transaction.bank_type && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Metode Pembayaran</p>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-900 font-medium">{transaction.bank_type}</p>
                        </div>
                      </div>
                    )}
                    
                    {transaction.total_amount && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Total Pembayaran</p>
                        <p className="text-gray-900 font-semibold text-lg">{formatCurrency(transaction.total_amount)}</p>
                      </div>
                    )}
                    
                    {transaction.created_at && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Tanggal Transaksi</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-900">{formatDate(transaction.created_at)}</p>
                        </div>
                      </div>
                    )}
                    
                    {transaction.id && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Transaction ID</p>
                        <p className="text-gray-900 font-mono text-sm">#{transaction.id}</p>
                      </div>
                    )}
                  </div>

                  {/* Transaction Details */}
                  {transaction.details && transaction.details.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-600 mb-3">Detail Transaksi</p>
                      <div className="space-y-2">
                        {transaction.details.map((detail, index) => (
                          <div key={detail.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{detail.description || `Detail ${index + 1}`}</p>
                              {detail.created_at && (
                                <p className="text-xs text-gray-500">{formatDate(detail.created_at)}</p>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(detail.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Proof Images - Assets sudah ter-sort dan ter-filter dari normalizeTransaction */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-4">
                      Bukti Pembayaran
                      {transaction.assets && transaction.assets.length > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({transaction.assets.length} file{transaction.assets.length > 1 ? 's' : ''})
                        </span>
                      )}
                    </p>
                    {(() => {
                      // Assets sudah dinormalisasi (sorted & filtered) dari normalizeTransaction
                      const assets = transaction.assets || [];
                      const hasAssets = assets.length > 0;
                      const hasPaymentProof = !!transaction.payment_proof;
                      
                      if (!hasAssets && !hasPaymentProof) {
                        return (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Belum ada bukti pembayaran yang diunggah</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {/* Display assets (sudah ter-sort: terbaru di atas) */}
                          {assets.map((asset: TransactionAsset) => {
                            const imageUrl = getImageUrl(asset.file_url || asset.original_file_url);
                            
                            return (
                              <div 
                                key={asset.id || asset.file_url} 
                                className="space-y-2 cursor-pointer group w-full"
                                onClick={() => setSelectedImage(asset)}
                              >
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 w-full">
                                  <Image
                                    src={imageUrl}
                                    alt={asset.title || "Bukti Pembayaran"}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                                    unoptimized={true}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                                </div>
                                {asset.title && (
                                  <p className="text-sm text-gray-600 text-center truncate" title={asset.title}>
                                    {asset.title}
                                  </p>
                                )}
                                {asset.description && (
                                  <p className="text-xs text-gray-500 text-center truncate" title={asset.description}>
                                    {asset.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Fallback ke payment_proof jika assets tidak ada */}
                          {!hasAssets && hasPaymentProof && (
                            <div 
                              className="space-y-2 cursor-pointer group w-full"
                              onClick={() => {
                                setSelectedImage({
                                  id: 0,
                                  title: "Bukti Pembayaran",
                                  description: "Bukti pembayaran transaksi",
                                  file_url: transaction.payment_proof,
                                  original_file_url: transaction.payment_proof,
                                  is_external: false,
                                  file_path: "",
                                  created_at: transaction.created_at,
                                  updated_at: transaction.updated_at
                                });
                              }}
                            >
                              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 w-full">
                                <Image
                                  src={getImageUrl(transaction.payment_proof)}
                                  alt="Bukti Pembayaran"
                                  fill
                                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                                  unoptimized={true}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                              </div>
                              <p className="text-sm text-gray-600 text-center truncate">Bukti Pembayaran</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Image Modal */}
                  {selectedImage && (
                    <ImageModal
                      isOpen={!!selectedImage}
                      onClose={() => setSelectedImage(null)}
                      imageUrl={getImageUrl(selectedImage.file_url)}
                      title={selectedImage.title}
                      description={selectedImage.description || "Bukti pembayaran transaksi"}
                    />
                  )}

                  {/* Button Cetak Invoice - Hanya muncul jika status Lunas */}
                  {transaction.payment_status === "Lunas" && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        onClick={handlePrintInvoice}
                        className="w-full bg-gold text-white hover:bg-gold-dark-20 transition-colors"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Cetak Invoice (PDF)
                      </Button>
                    </div>
                  )}

                  {/* Upload Bukti Transfer - Hanya muncul jika status Ditolak atau Menunggu Pembayaran */}
                  {(transaction.payment_status === "Ditolak" || 
                    transaction.payment_status === "Menunggu Pembayaran" ||
                    transaction.payment_status?.toLowerCase() === "rejected" ||
                    transaction.payment_status?.toLowerCase() === "pending" ||
                    transaction.payment_status?.toLowerCase() === "waiting") && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            {transaction.payment_status === "Ditolak" 
                              ? "Upload Ulang Bukti Transfer" 
                              : "Upload Bukti Transfer"}
                          </p>
                          {transaction.payment_status === "Ditolak" && (
                            <p className="text-xs text-red-600 mb-3">
                              Bukti transfer sebelumnya tidak valid. Silakan upload bukti transfer yang baru.
                            </p>
                          )}
                        </div>

                        {/* Upload Section */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <button
                            onClick={handleUploadClick}
                            className="w-full bg-gold text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center mb-3 hover:bg-gold-dark-20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                            disabled={isUploading}
                          >
                            <FaUpload className="mr-2" />
                            {isUploading ? "Mengunggah..." : "Pilih File Bukti Transfer"}
                          </button>
                          
                          <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleFileChange}
                            disabled={isUploading}
                          />

                          {/* Preview Image */}
                          {imagePreview && (
                            <div className="w-full flex justify-center mb-3">
                              <Image
                                src={imagePreview}
                                alt="Preview"
                                width={300}
                                height={180}
                                className="rounded-lg shadow object-contain border max-h-60"
                                style={{ maxHeight: '240px', width: 'auto', height: 'auto' }}
                              />
                            </div>
                          )}

                          {/* File Name */}
                          {paymentProof && !imagePreview && (
                            <p className="text-sm text-gray-700 text-center mb-3">
                              {paymentProof.name}
                            </p>
                          )}

                          {/* Error Message */}
                          {uploadError && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-600">{uploadError}</p>
                            </div>
                          )}

                          {/* Success Message */}
                          {uploadSuccess && (
                            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm text-green-600">
                                Bukti transfer berhasil diunggah! Status pembayaran akan diperbarui setelah verifikasi.
                              </p>
                            </div>
                          )}

                          {/* Submit Button */}
                          {paymentProof && (
                            <Button
                              onClick={handleUploadPaymentProof}
                              className="w-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                              disabled={isUploading || !paymentProof}
                            >
                              {isUploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Mengunggah...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Bukti Transfer
                                </>
                              )}
                            </Button>
                          )}

                          {/* Info Text */}
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            Format yang didukung: JPG, JPEG, PNG (Maks. 5MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Belum ada transaksi untuk booking ini</p>
                  <p className="text-xs text-gray-400">Silakan lakukan pembayaran terlebih dahulu</p>
                </div>
              )}
            </Card>

            {/* Additional Details */}
            {(booking.cabin?.length > 0 || booking.hotel_occupancy || booking.additional_fees?.length > 0 || booking.boat?.length > 0) && (
              <Card className="p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-3">Detail Tambahan</h2>
                <div className="space-y-4">
                  {booking.hotel_occupancy && (
                    <div className="flex items-start gap-2">
                      <Hotel className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Hotel</p>
                        <p className="text-gray-900">
                          {booking.hotel_occupancy.hotel_name} ({booking.hotel_occupancy.occupancy})
                        </p>
                      </div>
                    </div>
                  )}
                  {booking.boat && booking.boat.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Ship className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Boat</p>
                        <p className="text-gray-900">
                          {booking.boat.map(b => b.boat_name).join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                  {booking.cabin && booking.cabin.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Ship className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Cabin</p>
                        <p className="text-gray-900">
                          {booking.cabin.map(c => `${c.cabin_name} (${c.booking_total_pax || c.min_pax}-${c.max_pax} pax)`).join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                  {booking.additional_fees && booking.additional_fees.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Additional Fees</p>
                        <div className="space-y-1">
                          {booking.additional_fees.map((fee, index) => (
                            <p key={index} className="text-gray-900">
                              • {fee.fee_category} - {formatCurrency(fee.price)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quick Info Card */}
            <Card className="p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-3">Ringkasan</h3>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Durasi</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{booking.trip_duration?.duration_label || "-"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Pax</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{booking.total_pax} orang</span>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Keberangkatan</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 text-right">
                    {startDate ? formatDate(startDate) : <span className="text-gray-400 italic">-</span>}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Pemesanan</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 text-right">{formatDate(booking.created_at)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

