"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { Booking } from "@/types/bookings";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Phone, Mail, Package, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BookingResponse {
  data: Booking[];
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

export default function BookHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Cek apakah user sudah login
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetchBookings();
  }, [router]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cek token dan user data
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Fetch bookings untuk user yang sedang login
      // Menggunakan endpoint /api/my-bookings yang sudah ditambahkan di backend
      // Endpoint ini mengembalikan semua booking milik user yang sedang login
      // Mendukung filter status via query parameter ?status=Pending (opsional)
      const response = await apiRequest<any>(
        'GET',
        '/api/my-bookings'
      );

      console.log('Booking response:', response);
      console.log('Response type:', typeof response);
      console.log('Is array:', Array.isArray(response));
      console.log('Has data property:', response?.data);
      
      // Log sample booking untuk debugging
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('Sample booking data:', response.data[0]);
        console.log('Sample booking start_date:', (response.data[0] as any).start_date);
        console.log('Sample booking trip:', (response.data[0] as any).trip);
        console.log('Sample booking trip assets:', (response.data[0] as any).trip?.assets);
      } else if (Array.isArray(response) && response.length > 0) {
        console.log('Sample booking data (direct array):', response[0]);
        console.log('Sample booking start_date:', (response[0] as any).start_date);
        console.log('Sample booking trip:', (response[0] as any).trip);
        console.log('Sample booking trip assets:', (response[0] as any).trip?.assets);
      }

      // Handle berbagai format response
      let bookingsData: Booking[] = [];
      
      // Jika response adalah array langsung
      if (Array.isArray(response)) {
        console.log('Response is array, length:', response.length);
        bookingsData = response;
      }
      // Jika response memiliki property data
      else if (response?.data !== undefined) {
        console.log('Response has data property:', typeof response.data);
        // Jika response.data adalah array
        if (Array.isArray(response.data)) {
          console.log('Response.data is array, length:', response.data.length);
          bookingsData = response.data;
        } 
        // Jika response.data adalah object dengan property bookings
        else if (response.data && typeof response.data === 'object' && (response.data as any).bookings) {
          console.log('Response.data has bookings property');
          bookingsData = (response.data as any).bookings;
        }
        // Jika response.data adalah object langsung (single booking)
        else if (response.data && typeof response.data === 'object' && (response.data as any).id) {
          console.log('Response.data is single booking object');
          bookingsData = [response.data as Booking];
        }
      } 
      // Jika response adalah object dengan property bookings
      else if (response && typeof response === 'object' && (response as any).bookings) {
        console.log('Response has bookings property');
        bookingsData = (response as any).bookings;
      }
      // Jika response adalah object langsung (single booking)
      else if (response && typeof response === 'object' && (response as any).id) {
        console.log('Response is single booking object');
        bookingsData = [response as Booking];
      }

      console.log('Extracted bookingsData:', bookingsData);
      console.log('BookingsData length:', bookingsData.length);

      // Filter hanya booking yang memiliki trip data (valid booking)
      const validBookings = bookingsData.filter(booking => {
        const isValid = booking && booking.id && booking.trip;
        if (!isValid) {
          console.log('Invalid booking filtered out:', booking);
        }
        return isValid;
      });

      console.log('Valid bookings after filter:', validBookings.length);

      // Sort by created_at descending (terbaru di atas)
      const sortedBookings = validBookings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('Final sorted bookings:', sortedBookings.length);
      setBookings(sortedBookings);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      
      // Handle error 401 (Unauthorized - not logged in)
      if (err?.response?.status === 401) {
        setError('Anda belum login. Silakan login terlebih dahulu.');
        router.push('/auth/login');
        return;
      }
      // Handle error 403 (Forbidden - no permission)
      else if (err?.response?.status === 403) {
        setError('Anda tidak memiliki izin untuk mengakses data booking. Silakan hubungi administrator.');
      } 
      // Handle error 404 (Not Found - endpoint tidak ada)
      else if (err?.response?.status === 404) {
        setError('Endpoint untuk mengambil data booking belum tersedia. Silakan hubungi administrator.');
      }
      // Handle error lainnya
      else {
        const errorMessage = err?.response?.data?.message || err?.message || 'Gagal memuat data booking. Silakan coba lagi.';
        setError(errorMessage);
      }
      
      setBookings([]);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Riwayat Pemesanan
          </h1>
          <p className="text-gray-600">
            Daftar semua pemesanan yang telah Anda lakukan
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Belum Ada Pemesanan
            </h3>
            <p className="text-gray-600 mb-6">
              Anda belum melakukan pemesanan apapun.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark-20 transition-colors"
            >
              Kembali ke Beranda
            </button>
          </Card>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image Section */}
                    <div className="relative w-full lg:w-64 h-48 flex-shrink-0">
                      <Image
                        src={(() => {
                          // Cek berbagai kemungkinan lokasi gambar
                          const trip = booking.trip as any;
                          const imageUrl = trip?.assets?.[0]?.file_url ||
                                         trip?.assets?.[0]?.original_file_url ||
                                         trip?.main_image ||
                                         trip?.image ||
                                         trip?.thumbnail;
                          return getImageUrl(imageUrl);
                        })()}
                        alt={booking.trip?.name || "Trip Image"}
                        fill
                        className="object-cover rounded-lg"
                        onError={(e) => {
                          // Fallback ke gambar default jika error
                          (e.target as HTMLImageElement).src = "/img/default-image.png";
                        }}
                      />
                      <div className="absolute top-3 left-3">
                        <Badge 
                          variant="secondary" 
                          className={booking.trip?.type === "Open Trip" 
                            ? "bg-green-500 text-white" 
                            : "bg-red-500 text-white"
                          }
                        >
                          {booking.trip?.type || "Trip"}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 space-y-4">
                      {/* Title and Booking Code */}
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                          {booking.trip?.name || "Trip"}
                        </h2>
                        <p className="text-sm text-gray-500">
                          Booking ID: #{booking.id}
                        </p>
                      </div>

                      {/* Booking Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Tanggal Keberangkatan</p>
                            <p className="text-gray-900">
                              {(() => {
                                // Cek berbagai kemungkinan field untuk start_date
                                const startDate = (booking as any).start_date || 
                                                 (booking as any).trip_start_date ||
                                                 (booking as any).departure_date ||
                                                 booking.trip?.start_time;
                                return startDate ? formatDate(startDate) : "-";
                              })()}
                            </p>
                            {(() => {
                              // Cek berbagai kemungkinan field untuk end_date
                              const endDate = (booking as any).end_date || 
                                            (booking as any).trip_end_date ||
                                            (booking as any).return_date ||
                                            booking.trip?.end_time;
                              return endDate ? (
                                <p className="text-sm text-gray-500">
                                  Sampai {formatDate(endDate)}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Jumlah Pax</p>
                            <p className="text-gray-900">{booking.total_pax} orang</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Durasi</p>
                            <p className="text-gray-900">
                              {booking.trip_duration?.duration_label || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Tanggal Pemesanan</p>
                            <p className="text-gray-900">
                              {formatDate(booking.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Email</p>
                            <p className="text-gray-900">{booking.customer_email || "-"}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Telepon</p>
                            <p className="text-gray-900">{booking.customer_phone || "-"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {(booking.cabin?.length > 0 || booking.hotel_occupancy || booking.additional_fees?.length > 0) && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-600 mb-2">Detail Tambahan:</p>
                          <div className="space-y-1 text-sm text-gray-700">
                            {booking.cabin && booking.cabin.length > 0 && (
                              <p>• Cabin: {booking.cabin.map(c => c.cabin_name).join(", ")}</p>
                            )}
                            {booking.hotel_occupancy && (
                              <p>• Hotel: {booking.hotel_occupancy.hotel_name} ({booking.hotel_occupancy.occupancy})</p>
                            )}
                            {booking.additional_fees && booking.additional_fees.length > 0 && (
                              <p>• Additional Fees: {booking.additional_fees.map(f => f.fee_category).join(", ")}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Total Price */}
                      <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Harga</p>
                          <p className="text-2xl font-bold text-gold">
                            {formatCurrency(booking.total_price)}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/booking/book-history/${booking.id}`)}
                          className="px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark-20 transition-colors text-sm font-medium"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
