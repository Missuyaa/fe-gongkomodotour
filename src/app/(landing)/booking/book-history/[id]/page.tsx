"use client";

import { useState, useEffect } from "react";
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
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ImageModal } from "@/components/ui/image-modal";

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

export default function BookingDetailPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<TransactionAsset | null>(null);
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;

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

  const fetchTransaction = async () => {
    try {
      // Coba berbagai endpoint untuk mendapatkan transaksi
      // Prioritas: endpoint yang lebih spesifik dulu, lalu fallback ke endpoint umum
      let response;
      let transactionData: Transaction | null = null;

      // Coba 1: Query parameter dengan booking_id (lebih efisien)
      // Endpoint ini sama seperti yang digunakan di dashboard, tapi dengan filter
        try {
          response = await apiRequest<TransactionResponse>(
            'GET',
            `/api/transactions?booking_id=${bookingId}`
          );
          console.log('Transaction response from query param:', response);
          
          if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
            transactionData = response.data[0] as Transaction;
          console.log('✅ Transaction found via query param endpoint');
          }
      } catch (err1: any) {
        const errorMessage1 = err1?.response?.data?.message || err1?.message || '';
        if (errorMessage1.includes('Transaction not found') || errorMessage1.includes('not found')) {
          console.log('⚠️ Transaction not found via query param - Trying alternatives...');
        } else {
          console.log('Query param endpoint error:', err1?.response?.status || err1?.message, '- Trying alternatives...');
        }
          
        // Coba 2: Fetch semua transactions dan filter (sama seperti dashboard admin)
        // Endpoint ini terbukti bekerja di dashboard, jadi kita gunakan juga di sini
          try {
            response = await apiRequest<TransactionResponse>(
              'GET',
              '/api/transactions'
            );
            console.log('All transactions response:', response);
            
            if (response?.data && Array.isArray(response.data)) {
              // Cari transaction yang sesuai dengan booking_id
              transactionData = response.data.find(
                (t: Transaction) => {
                  const tBookingId = typeof t.booking_id === 'string' ? t.booking_id : String(t.booking_id);
                  const tBookingIdFromBooking = t.booking?.id ? (typeof t.booking.id === 'string' ? t.booking.id : String(t.booking.id)) : null;
                  const bookingIdStr = String(bookingId);
                  return tBookingId === bookingIdStr || tBookingIdFromBooking === bookingIdStr;
                }
              ) || null;
            
            if (transactionData) {
              console.log('✅ Transaction found via all transactions endpoint (same as dashboard)');
            }
          }
        } catch (err2: any) {
          const errorMessage2 = err2?.response?.data?.message || err2?.message || '';
          if (errorMessage2.includes('Transaction not found') || errorMessage2.includes('not found')) {
            console.log('⚠️ Transaction not found via all transactions - This is normal if payment has not been made yet');
          } else {
            console.error('All transaction endpoints failed:', err2?.response?.status || err2?.message);
          }
        }
        
        // Coba 3: Endpoint landing-page dengan booking_id (fallback terakhir)
        // Endpoint ini mungkin tidak selalu tersedia atau tidak bekerja dengan baik
        try {
          response = await apiRequest<any>(
            'GET',
            `/api/landing-page/transactions/${bookingId}`
          );
          console.log('Transaction response from landing-page:', response);
          
          // Cek jika response mengandung error message
          if (response?.message && response.message === 'Transaction not found') {
            console.log('⚠️ Transaction not found message from landing-page endpoint');
          } else {
            // Handle response
            if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
              transactionData = response.data as Transaction;
              console.log('✅ Transaction found via landing-page endpoint');
            } else if (response && typeof response === 'object' && (response as any).id) {
              transactionData = response as Transaction;
              console.log('✅ Transaction found via landing-page endpoint (direct object)');
            }
            }
          } catch (err3: any) {
          const errorMessage3 = err3?.response?.data?.message || err3?.message || '';
          if (errorMessage3.includes('Transaction not found') || errorMessage3.includes('not found')) {
            console.log('⚠️ Transaction not found via landing-page endpoint - This is normal if payment has not been made yet');
          } else {
            console.log('Landing-page transaction endpoint error:', err3?.response?.status || err3?.message);
          }
        }
      }

      if (transactionData) {
        console.log('✅ Transaction found:', transactionData);
        console.log('Transaction details:', {
          id: transactionData.id,
          booking_id: transactionData.booking_id,
          bank_type: transactionData.bank_type,
          total_amount: transactionData.total_amount,
          payment_status: transactionData.payment_status,
          has_payment_proof: !!transactionData.payment_proof,
          assets_count: transactionData.assets?.length || 0
        });
        setTransaction(transactionData);
      } else {
        console.log('ℹ️ No transaction found for booking_id:', bookingId, '- This is normal if payment has not been made yet');
        setTransaction(null);
      }
    } catch (err: any) {
      // Tangani error dengan lebih baik
      const errorMessage = err?.response?.data?.message || err?.message || 'Unknown error';
      
      if (errorMessage.includes('Transaction not found') || errorMessage.includes('not found')) {
        console.log('ℹ️ Transaction not found - This is normal if payment has not been made yet');
      } else {
        console.error('Error fetching transaction:', err?.response?.status || err?.message);
        console.error('Full error:', err);
      }
      
      // Tidak set error karena transaction mungkin belum ada (normal untuk booking baru)
      setTransaction(null);
    }
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
              <div className="flex items-center gap-2 mb-6 border-b pb-3">
                <Receipt className="w-5 h-5 text-gold" />
                <h2 className="text-xl font-bold text-gray-900">Informasi Pembayaran</h2>
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

                  {/* Payment Proof Images - Mengikuti pattern dari data-table.tsx */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-4">Bukti Pembayaran</p>
                    {(transaction.assets && transaction.assets.length > 0) || transaction.payment_proof ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* Display assets jika ada */}
                        {transaction.assets && transaction.assets.length > 0 && transaction.assets.map((asset: TransactionAsset, index: number) => {
                          if (!asset || !asset.file_url) return null;
                          
                          const imageUrl = getImageUrl(asset.file_url || asset.original_file_url);
                          
                          return (
                            <div 
                              key={asset.id || `asset-${index}`} 
                              className="space-y-2 cursor-pointer group w-full"
                              onClick={() => setSelectedImage(asset)}
                            >
                              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 w-full">
                                <Image
                                  src={imageUrl}
                                  alt={asset.title || `Bukti Pembayaran ${index + 1}`}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                                  unoptimized={true}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
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
                        {(!transaction.assets || transaction.assets.length === 0) && transaction.payment_proof && (
                          <div 
                            className="space-y-2 cursor-pointer group w-full"
                            onClick={() => {
                              const tempAsset: TransactionAsset = {
                                id: 0,
                                title: "Bukti Pembayaran",
                                description: "Bukti pembayaran transaksi",
                                file_url: transaction.payment_proof,
                                original_file_url: transaction.payment_proof,
                                is_external: false,
                                file_path: "",
                                created_at: transaction.created_at,
                                updated_at: transaction.updated_at
                              };
                              setSelectedImage(tempAsset);
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
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                            </div>
                            <p className="text-sm text-gray-600 text-center truncate" title="Bukti Pembayaran">
                              Bukti Pembayaran
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Belum ada bukti pembayaran yang diunggah</p>
                      </div>
                    )}
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

