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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BookingResponse {
  data: Booking;
}

// Helper untuk mendapatkan image URL
function getImageUrl(file_url: string | undefined) {
  if (!file_url) return "/img/default-image.png";
  if (/^https?:\/\//.test(file_url)) return file_url;
  return `${API_URL}${file_url}`;
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
      
      // Fetch booking detail menggunakan endpoint yang sudah ada
      const response = await apiRequest<BookingResponse>(
        'GET',
        `/api/bookings/${bookingId}`
      );

      console.log('Booking detail response:', response);

      // Handle berbagai format response
      let bookingData: Booking | null = null;
      
      if (response?.data) {
        bookingData = response.data as unknown as Booking;
      } else if (response && typeof response === 'object' && (response as any).id) {
        bookingData = response as unknown as Booking;
      }

      if (bookingData) {
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
      // Coba fetch transaction berdasarkan booking_id menggunakan endpoint yang mungkin ada
      // Jika endpoint /api/transactions?booking_id tidak ada, fallback ke /api/transactions
      let response;
      try {
        response = await apiRequest<TransactionResponse>(
          'GET',
          `/api/landing-page/transactions/${bookingId}`
        );
      } catch (err: any) {
        // Jika endpoint tidak ada, coba fetch semua transactions
        if (err?.response?.status === 404) {
          response = await apiRequest<TransactionResponse>(
            'GET',
            '/api/transactions'
          );
        } else {
          throw err;
        }
      }

      console.log('Transaction response:', response);

      // Handle berbagai format response
      let transactionData: Transaction | null = null;
      
      // Jika response adalah single transaction
      if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        transactionData = response.data as unknown as Transaction;
      }
      // Jika response adalah array, cari yang sesuai dengan booking_id
      else if (response?.data && Array.isArray(response.data)) {
        transactionData = response.data.find(
          (t: Transaction) => {
            const tBookingId = typeof t.booking_id === 'string' ? t.booking_id : String(t.booking_id);
            const tBookingIdFromBooking = t.booking?.id ? (typeof t.booking.id === 'string' ? t.booking.id : String(t.booking.id)) : null;
            return tBookingId === bookingId || tBookingIdFromBooking === bookingId;
          }
        ) || null;
      }
      // Jika response langsung adalah transaction
      else if (response && typeof response === 'object' && (response as any).id) {
        transactionData = response as unknown as Transaction;
      }

      if (transactionData) {
        console.log('Transaction found:', transactionData);
        setTransaction(transactionData);
      } else {
        console.log('No transaction found for booking_id:', bookingId);
      }
    } catch (err: any) {
      console.error('Error fetching transaction:', err);
      // Tidak set error karena transaction mungkin belum ada
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: id });
    } catch {
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

  // Get start and end date
  const startDate = (booking as any).start_date || 
                   (booking as any).trip_start_date ||
                   (booking as any).departure_date ||
                   booking.trip?.start_time;
  const endDate = (booking as any).end_date || 
                 (booking as any).trip_end_date ||
                 (booking as any).return_date ||
                 booking.trip?.end_time;

  // Get trip image
  const trip = booking.trip as any;
  const imageUrl = trip?.assets?.[0]?.file_url ||
                   trip?.assets?.[0]?.original_file_url ||
                   trip?.main_image ||
                   trip?.image ||
                   trip?.thumbnail;

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Durasi</p>
                      <p className="text-gray-900">{booking.trip_duration?.duration_label || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Jumlah Pax</p>
                      <p className="text-gray-900">{booking.total_pax} orang</p>
                    </div>
                  </div>
                  {startDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tanggal Keberangkatan</p>
                        <p className="text-gray-900">
                          {(() => {
                            // Jika startDate adalah waktu (format HH:mm:ss), skip
                            if (typeof startDate === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(startDate)) {
                              return "-";
                            }
                            return formatDate(startDate);
                          })()}
                        </p>
                        {endDate && !/^\d{2}:\d{2}:\d{2}$/.test(endDate) && (
                          <p className="text-sm text-gray-500">Sampai {formatDate(endDate)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tanggal Pemesanan</p>
                      <p className="text-gray-900">{formatDate(booking.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Customer Information */}
            <Card className="p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-3">Informasi Customer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Nama</p>
                    <p className="text-gray-900">{booking.customer_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-gray-900">{booking.customer_email || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Telepon</p>
                    <p className="text-gray-900">{booking.customer_phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Alamat</p>
                    <p className="text-gray-900">{booking.customer_address || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Negara</p>
                    <p className="text-gray-900">{booking.customer_country || "-"}</p>
                  </div>
                </div>
              </div>
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

            {/* Payment Proof Section */}
            {transaction && (
              <Card className="p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6 border-b pb-3">
                  <Receipt className="w-5 h-5 text-gold" />
                  <h2 className="text-xl font-bold text-gray-900">Bukti Pembayaran</h2>
                </div>
                <div className="space-y-6">
                  {transaction.payment_status && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Status Pembayaran</p>
                      <Badge 
                        className={
                          transaction.payment_status === "Lunas" || transaction.payment_status === "Pembayaran Berhasil"
                            ? "bg-green-100 text-green-700"
                            : transaction.payment_status === "Menunggu Pembayaran"
                            ? "bg-yellow-100 text-yellow-700"
                            : transaction.payment_status === "Ditolak"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {transaction.payment_status}
                      </Badge>
                    </div>
                  )}
                  {transaction.bank_type && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Metode Pembayaran</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900">{transaction.bank_type}</p>
                      </div>
                    </div>
                  )}
                  {transaction.total_amount && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Pembayaran</p>
                      <p className="text-gray-900 font-semibold">{formatCurrency(transaction.total_amount)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-4">Gambar Bukti Pembayaran</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Display assets jika ada */}
                      {transaction.assets && transaction.assets.length > 0 && transaction.assets.map((asset: TransactionAsset, index: number) => (
                        <div key={asset.id || index} className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                          <Image
                            src={getImageUrl(asset.file_url || asset.original_file_url)}
                            alt={asset.title || `Bukti Pembayaran ${index + 1}`}
                            fill
                            className="object-contain bg-gray-50"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/img/default-image.png";
                            }}
                          />
                        </div>
                      ))}
                      {/* Fallback ke payment_proof jika assets tidak ada */}
                      {(!transaction.assets || transaction.assets.length === 0) && transaction.payment_proof && (
                        <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                          <Image
                            src={getImageUrl(transaction.payment_proof)}
                            alt="Bukti Pembayaran"
                            fill
                            className="object-contain bg-gray-50"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/img/default-image.png";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Total Price */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b pb-3">
                <DollarSign className="w-5 h-5 text-gold" />
                <h2 className="text-xl font-bold text-gray-900">Total Harga</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gold mb-2">
                    {formatCurrency(booking.total_price)}
                  </p>
                  <p className="text-sm text-gray-500">
                    untuk {booking.total_pax} orang
                  </p>
                </div>
                {transaction && transaction.payment_status && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-2">Status Pembayaran</p>
                    <Badge 
                      className={
                        transaction.payment_status === "Lunas" || transaction.payment_status === "Pembayaran Berhasil"
                          ? "bg-green-100 text-green-700"
                          : transaction.payment_status === "Menunggu Pembayaran"
                          ? "bg-yellow-100 text-yellow-700"
                          : transaction.payment_status === "Ditolak"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {transaction.payment_status}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

