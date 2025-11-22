"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { Booking } from "@/types/bookings";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Phone, Mail, Package, Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tripTypeFilter, setTripTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

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
        const sample = response.data[0] as any;
        console.log('Sample booking data:', sample);
        console.log('Sample booking date fields:', {
          start_date: sample.start_date,
          trip_start_date: sample.trip_start_date,
          departure_date: sample.departure_date,
          end_date: sample.end_date,
          trip_end_date: sample.trip_end_date,
          return_date: sample.return_date,
          created_at: sample.created_at,
          updated_at: sample.updated_at
        });
        console.log('Sample booking trip:', sample.trip);
        console.log('Sample booking trip assets:', sample.trip?.assets);
      } else if (Array.isArray(response) && response.length > 0) {
        const sample = response[0] as any;
        console.log('Sample booking data (direct array):', sample);
        console.log('Sample booking date fields:', {
          start_date: sample.start_date,
          trip_start_date: sample.trip_start_date,
          departure_date: sample.departure_date,
          end_date: sample.end_date,
          trip_end_date: sample.trip_end_date,
          return_date: sample.return_date,
          created_at: sample.created_at,
          updated_at: sample.updated_at
        });
        console.log('Sample booking trip:', sample.trip);
        console.log('Sample booking trip assets:', sample.trip?.assets);
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

      // Log lengkap untuk debugging tanggal - tampilkan SEMUA field yang ada
      if (bookingsData.length > 0) {
        console.log('=== BOOKING DATE FIELDS CHECK ===');
        console.log('📋 INFO: Di Booking.tsx, start_date dikirim sebagai:', {
          field_name: 'start_date',
          format: 'yyyy-MM-dd',
          example: '2025-11-24',
          code_location: 'Booking.tsx line 1136: start_date: format(selectedDate, "yyyy-MM-dd")'
        });
        
        bookingsData.forEach((booking: any, index: number) => {
          // Ambil SEMUA keys yang mungkin terkait dengan tanggal
          const allKeys = Object.keys(booking);
          const dateRelatedKeys = allKeys.filter(k => 
            k.toLowerCase().includes('date') || 
            k.toLowerCase().includes('start') || 
            k.toLowerCase().includes('end') ||
            k.toLowerCase().includes('departure') ||
            k.toLowerCase().includes('return') ||
            k.toLowerCase().includes('time')
          );
          
          // Tampilkan nilai dari semua date-related keys
          const dateRelatedValues = dateRelatedKeys.reduce((acc, key) => {
            acc[key] = booking[key];
            return acc;
          }, {} as Record<string, any>);
          
          console.log(`Booking ${index + 1} (ID: ${booking.id}):`, {
            // Field utama yang dikirim saat booking (dari Booking.tsx line 1136)
            start_date: booking.start_date,
            end_date: booking.end_date,
            // Alias fields
            trip_start_date: booking.trip_start_date,
            trip_end_date: booking.trip_end_date,
            departure_date: booking.departure_date,
            return_date: booking.return_date,
            // Timestamps
            created_at: booking.created_at,
            updated_at: booking.updated_at,
            // SEMUA keys yang mengandung 'date' untuk debugging
            allDateKeys: dateRelatedKeys,
            // Tampilkan nilai dari semua date-related keys
            dateRelatedValues: dateRelatedValues,
            // Full booking object untuk melihat struktur lengkap
            fullBookingKeys: allKeys
          });
          
          // Log FULL booking object untuk debugging lengkap (hanya untuk booking pertama)
          if (index === 0) {
            console.log(`📦 Full booking object ${index + 1} (FIRST BOOKING ONLY - RAW FROM API):`, JSON.stringify(booking, null, 2));
            console.log(`🔍 Checking if start_date exists:`, {
              has_start_date: 'start_date' in booking,
              start_date_value: booking.start_date,
              start_date_type: typeof booking.start_date,
              is_null: booking.start_date === null,
              is_undefined: booking.start_date === undefined,
              is_empty_string: booking.start_date === ''
          });
          }
        });
        console.log('=== END DATE FIELDS CHECK ===');
      }

      // Filter hanya booking yang memiliki trip data (valid booking)
      // Jangan terlalu ketat - booking tetap valid meskipun trip data tidak lengkap
      const validBookings = bookingsData.filter(booking => {
        // Booking valid jika memiliki ID dan minimal trip_id
        const isValid = booking && booking.id && (booking.trip || booking.trip_id);
        if (!isValid) {
          console.log('Invalid booking filtered out:', booking);
        }
        return isValid;
      });

      console.log('Valid bookings after filter:', validBookings.length);

      // Pastikan tidak ada duplikasi berdasarkan ID (jika API mengembalikan duplikat, ambil yang terbaru)
      // Setiap booking harus memiliki ID unik, jadi ini hanya untuk safety
      // TAPI: Jangan menghilangkan booking yang berbeda - setiap booking ID harus unik
      const uniqueBookingsMap = new Map<number, Booking>();
      validBookings.forEach(booking => {
        // Jika booking dengan ID yang sama sudah ada, cek mana yang lebih baru berdasarkan updated_at
        const existing = uniqueBookingsMap.get(booking.id);
        if (!existing) {
          // Booking baru, langsung tambahkan
          uniqueBookingsMap.set(booking.id, booking);
        } else {
          // Booking dengan ID sama sudah ada - ambil yang updated_at lebih baru
          const existingUpdated = new Date(existing.updated_at || existing.created_at).getTime();
          const currentUpdated = new Date(booking.updated_at || booking.created_at).getTime();
          
          if (currentUpdated > existingUpdated) {
            console.log(`Booking ID ${booking.id} ditemukan duplikat, menggunakan versi yang lebih baru (updated_at: ${booking.updated_at})`);
            uniqueBookingsMap.set(booking.id, booking);
          } else {
            console.log(`Booking ID ${booking.id} ditemukan duplikat, mempertahankan versi yang lebih baru (updated_at: ${existing.updated_at})`);
          }
        }
      });
      
      // Convert map back to array - setiap booking ID hanya muncul sekali
      const allBookings = Array.from(uniqueBookingsMap.values());
      
      console.log(`Total bookings setelah deduplication: ${allBookings.length} dari ${validBookings.length} valid bookings`);
      
      // Log untuk debugging - cek apakah ada booking dengan trip_id dan tanggal yang sama
      // Ini membantu mengidentifikasi jika user melakukan booking yang sama beberapa kali
      const duplicateCheck = new Map<string, Booking[]>();
      allBookings.forEach(booking => {
        const bookingAny = booking as any;
        // Gunakan start_date yang sebenarnya (field yang dikirim saat booking)
        // Prioritas: start_date > trip_start_date > departure_date
        const startDate = bookingAny.start_date || 
                         bookingAny.trip_start_date || 
                         bookingAny.departure_date ||
                         null;
        
        // Log warning jika tidak ada start_date untuk booking ini
        if (!startDate) {
          console.warn(`⚠️ Booking ID ${booking.id} tidak memiliki start_date!`, {
            start_date: bookingAny.start_date,
            trip_start_date: bookingAny.trip_start_date,
            departure_date: bookingAny.departure_date,
            created_at: booking.created_at
          });
        }
        
        const key = startDate ? `${booking.trip_id}-${startDate}` : `${booking.trip_id}-${booking.id}`;
        if (!duplicateCheck.has(key)) {
          duplicateCheck.set(key, []);
        }
        duplicateCheck.get(key)!.push(booking);
      });
      
      // Log booking yang mungkin duplikat (trip_id dan tanggal sama) - ini normal jika user booking trip yang sama beberapa kali
      duplicateCheck.forEach((bookings, key) => {
        if (bookings.length > 1) {
          console.log(`Found ${bookings.length} bookings with same trip_id and date (${key}):`, 
            bookings.map(b => ({ 
              id: b.id, 
              created_at: b.created_at,
              status: b.status 
            }))
          );
        }
      });

      // Sort by created_at descending (terbaru di atas)
      const sortedBookings = allBookings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('Final sorted bookings:', sortedBookings.length);
      console.log('All booking IDs:', sortedBookings.map(b => ({ id: b.id, trip_id: b.trip_id, created_at: b.created_at })));
      setBookings(sortedBookings);
      setFilteredBookings(sortedBookings); // Set initial filtered bookings
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

  // Filter bookings berdasarkan search query, status, trip type, dan date
  useEffect(() => {
    let filtered = [...bookings];

    // Filter berdasarkan search query (nama trip)
    if (searchQuery.trim()) {
      filtered = filtered.filter(booking =>
        booking.trip?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toString().includes(searchQuery) ||
        booking.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter berdasarkan status
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking =>
        booking.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Filter berdasarkan trip type
    if (tripTypeFilter !== "all") {
      filtered = filtered.filter(booking =>
        booking.trip?.type === tripTypeFilter
      );
    }

    // Filter berdasarkan date (bulan ini, bulan lalu, atau semua)
    if (dateFilter !== "all") {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        const bookingMonth = bookingDate.getMonth();
        const bookingYear = bookingDate.getFullYear();

        if (dateFilter === "thisMonth") {
          return bookingMonth === currentMonth && bookingYear === currentYear;
        } else if (dateFilter === "lastMonth") {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return bookingMonth === lastMonth && bookingYear === lastMonthYear;
        } else if (dateFilter === "thisYear") {
          return bookingYear === currentYear;
        }
        return true;
      });
    }

    // Sort filtered results
    filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFilteredBookings(filtered);
  }, [bookings, searchQuery, statusFilter, tripTypeFilter, dateFilter]);

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTripTypeFilter("all");
    setDateFilter("all");
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

        {/* Filter Section */}
        {bookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 bg-white rounded-lg shadow-sm p-4"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari berdasarkan nama trip, booking ID, atau nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Trip Type Filter */}
              <Select value={tripTypeFilter} onValueChange={setTripTypeFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter Tipe Trip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="Open Trip">Open Trip</SelectItem>
                  <SelectItem value="Private Trip">Private Trip</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter Tanggal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="thisMonth">Bulan Ini</SelectItem>
                  <SelectItem value="lastMonth">Bulan Lalu</SelectItem>
                  <SelectItem value="thisYear">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Button */}
              {(searchQuery || statusFilter !== "all" || tripTypeFilter !== "all" || dateFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full lg:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Menampilkan {filteredBookings.length} dari {bookings.length} pemesanan
            </div>
          </motion.div>
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
        ) : filteredBookings.length === 0 ? (
          <Card className="p-12 text-center">
            <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Tidak Ada Hasil
            </h3>
            <p className="text-gray-600 mb-6">
              Tidak ada pemesanan yang sesuai dengan filter yang Anda pilih.
            </p>
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark-20 transition-colors"
            >
              Reset Filter
            </button>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking, index) => (
              <motion.div
                key={`${booking.id}-${booking.created_at}`}
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
                            {(() => {
                              const bookingAny = booking as any;
                              
                              // Cek SEMUA kemungkinan field yang mungkin menyimpan tanggal
                              // Prioritas: start_date (format yyyy-MM-dd dari Booking.tsx) 
                              // > trip_start_date > departure_date > trip.departure_date
                              let startDate = bookingAny.start_date || 
                                               bookingAny.trip_start_date ||
                                               bookingAny.departure_date ||
                                               null;
                              
                              // Jika masih null, cek di relasi trip
                              if (!startDate && bookingAny.trip) {
                                startDate = bookingAny.trip.start_date ||
                                           bookingAny.trip.departure_date ||
                                           bookingAny.trip.trip_start_date ||
                                           null;
                              }
                              
                              let endDate = bookingAny.end_date || 
                                            bookingAny.trip_end_date ||
                                            bookingAny.return_date ||
                                            null;
                              
                              // Jika masih null, cek di relasi trip
                              if (!endDate && bookingAny.trip) {
                                endDate = bookingAny.trip.end_date ||
                                         bookingAny.trip.return_date ||
                                         bookingAny.trip.trip_end_date ||
                                         null;
                              }
                              
                              // Debug logging jika tidak ada tanggal - tampilkan SEMUA kemungkinan field
                              if (!startDate) {
                                const allDateKeys = Object.keys(bookingAny).filter(k => 
                                  k.toLowerCase().includes('date') || 
                                  k.toLowerCase().includes('start') || 
                                  k.toLowerCase().includes('departure') ||
                                  k.toLowerCase().includes('end') ||
                                  k.toLowerCase().includes('return')
                                );
                                
                                console.error('❌ ERROR: No start_date found for booking:', booking.id, {
                                  booking_id: booking.id,
                                  created_at: booking.created_at,
                                  // Field yang dikirim saat booking (dari Booking.tsx line 1136)
                                  start_date_sent_to_api: 'format(selectedDate, "yyyy-MM-dd")',
                                  // Field yang seharusnya ada di response
                                  start_date_in_response: bookingAny.start_date,
                                  trip_start_date: bookingAny.trip_start_date,
                                  departure_date: bookingAny.departure_date,
                                  end_date: bookingAny.end_date,
                                  // Cek di relasi trip
                                  trip: bookingAny.trip ? {
                                    start_date: bookingAny.trip.start_date,
                                    departure_date: bookingAny.trip.departure_date,
                                    trip_start_date: bookingAny.trip.trip_start_date,
                                    start_time: bookingAny.trip.start_time,
                                    end_time: bookingAny.trip.end_time,
                                  } : null,
                                  // Semua keys yang terkait dengan date
                                  allDateKeys: allDateKeys,
                                  allDateValues: allDateKeys.reduce((acc, key) => {
                                    acc[key] = bookingAny[key];
                                    return acc;
                                  }, {} as Record<string, any>),
                                  // Full booking object untuk debugging
                                  fullBookingObject: bookingAny,
                                  // INFO: Kemungkinan masalah
                                  possible_issues: [
                                    'Backend tidak menyimpan start_date ke database saat create booking',
                                    'Backend tidak mengembalikan start_date di response API /api/my-bookings',
                                    'Field name berbeda di backend (bukan start_date)'
                                  ]
                                });
                                return <p className="text-gray-500 italic">Belum ditentukan</p>;
                              }
                              
                              return (
                                <>
                                  <p className="text-gray-900 font-medium">{formatDate(startDate)}</p>
                                  {endDate && (
                                    <p className="text-sm text-gray-500">Sampai {formatDate(endDate)}</p>
                                  )}
                                </>
                              );
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
