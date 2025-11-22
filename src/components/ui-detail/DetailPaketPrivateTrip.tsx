"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FlightSchedule } from "@/types/trips";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dayNameToIndex: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Function untuk format harga Indonesia
const formatPrice = (price: string): string => {
  // Hapus semua karakter non-digit kecuali titik
  const cleanPrice = price.replace(/[^\d.]/g, '');
  
  // Parse sebagai float
  const numPrice = parseFloat(cleanPrice);
  
  if (isNaN(numPrice)) {
    return price; // Return original jika tidak bisa di-parse
  }
  
  // Format dengan pemisah ribuan menggunakan titik
  return numPrice.toLocaleString('id-ID');
};

// Definisikan tipe untuk data paket
interface PackageData {
  id: string;
  title: string;
  price: string;
  meetingPoint: string;
  destination: string;
  daysTrip: string;
  description: string;
  itinerary: {
    durationId: number;
    durationLabel: string;
    days: { day: string; activities: string }[];
  }[];
  information: string;
  boat: string;
  groupSize?: string;
  privateGuide?: string;
  images: string[];
  destinations?: number;
  include?: string[];
  exclude?: string[];
  session?: {
    highSeason: { period: string; price: string };
    peakSeason: { period: string; price: string };
  };
  flightInfo?: {
    guideFee1: string;
    guideFee2: string;
  };
  boatImages?: { image: string; title: string; id: string }[];
  mainImage?: string;
  flightSchedules?: FlightSchedule[];
  has_boat: boolean;
  destination_count: number;
  trip_durations: {
    id: number;
    duration_label: string;
    itineraries: { day: string; activities: string }[];
  }[];
  boat_ids?: number[];
  operational_days?: string[];
  tentation?: "Yes" | "No";
  note?: string; // Tambahkan field note
}

interface DetailPaketPrivateTripProps {
  data: PackageData;
}

const DetailPaketPrivateTrip: React.FC<DetailPaketPrivateTripProps> = ({
  data,
}) => {
  const searchParams = useSearchParams();
  const mainImage =
    searchParams.get("mainImage") || data.mainImage || "/img/default-trip.jpg"; // Ambil mainImage dari query string

  const [activeTab, setActiveTab] = useState("itinerary");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();
  const [selectedDurationId, setSelectedDurationId] = useState<number>(
    data.trip_durations?.[0]?.id || 0
  );

  // Safe image handling like OpenTrip
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const handleImageError = (imageSrc: string) => {
    if (!imageSrc) return;
    console.error("Image failed to load:", imageSrc);
    setImageErrors((prev) => new Set(prev).add(imageSrc));
  };

  // Function untuk encode URL dengan aman (sama persis seperti di TripHighlight)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const toSafeUrl = (raw: string) => {
    try {
      // Jika sudah absolute URL
      if (/^https?:\/\//.test(raw)) {
        // Cek apakah sudah ter-encode (mengandung %)
        // Jika sudah ter-encode, jangan encode lagi untuk menghindari double encoding
        if (raw.includes('%')) {
          return raw;
        }
        // Jika belum ter-encode, encode hanya bagian yang perlu
        return encodeURI(raw);
      }
      // Jika path static Next.js (dimulai dengan /img/ atau path public lainnya), jangan tambahkan API_URL
      if (raw.startsWith('/img/') || raw.startsWith('/_next/') || raw.startsWith('/api/')) {
        return raw; // Path static tidak perlu di-encode
      }
      // Relative path dari API - cek apakah sudah ter-encode
      if (raw.includes('%')) {
        // Jika sudah ter-encode, langsung gabungkan dengan API_URL
        return `${API_URL}${raw}`;
      }
      // Jika belum ter-encode, encode dulu
      return `${API_URL}${encodeURI(raw)}`;
    } catch {
      // Jika error, cek apakah path static
      if (raw.startsWith('/img/') || raw.startsWith('/_next/') || raw.startsWith('/api/')) {
        return raw;
      }
      return `${API_URL}${raw}`;
    }
  };

  const getSafeImageSrc = (imageSrc: string | undefined | null, fallback: string = "/img/default-trip.jpg") => {
    if (!imageSrc || imageErrors.has(imageSrc)) {
      return fallback;
    }
    // Jika path static, langsung return tanpa proses toSafeUrl
    if (imageSrc.startsWith('/img/') || imageSrc.startsWith('/_next/') || imageSrc.startsWith('/api/')) {
      return imageSrc;
    }
    // Encode URL untuk menghindari masalah dengan karakter khusus
    return toSafeUrl(imageSrc);
  };

  // Disabled date berdasarkan hari operasional paket
  const allowedDaysSet = new Set(
    (data.operational_days || []).map((d) => dayNameToIndex[d])
  );
  const disabledByOperationalDays = (date: Date) => {
    if (allowedDaysSet.size === 0) return false; // jika tidak ada konfigurasi, izinkan semua hari
    return !allowedDaysSet.has(date.getDay());
  };

  const handleBookNow = (packageId: string) => {
    if (selectedDate) {
      router.push(
        `/booking?type=private&packageId=${packageId}&date=${selectedDate.toISOString()}`
      );
    } else {
      alert("Please select a date before booking.");
    }
  };

  return (
    <div className="py-4 px-4">
      {/* Section 1: Gambar */}
      <div className="relative mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Gambar Utama */}
          <Dialog
            open={!!selectedImage}
            onOpenChange={() => setSelectedImage(null)}
          >
            <DialogTrigger asChild>
              <div
                className="relative h-[400px] md:h-[458px] md:col-span-7 cursor-pointer"
                onClick={() => setSelectedImage(mainImage)}
              >
                <Image
                  src={getSafeImageSrc(mainImage)}
                  alt={data.title || "Default Image"}
                  fill
                  className="rounded-sm object-cover"
                  unoptimized={true}
                  onError={() => handleImageError(mainImage)}
                />
              </div>
            </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  {selectedImage && (
                    <Image
                      src={getSafeImageSrc(selectedImage)}
                      alt="Selected Image"
                      width={800}
                      height={600}
                      className="rounded-lg"
                      unoptimized={true}
                      onError={() => selectedImage && handleImageError(selectedImage)}
                    />
                  )}
                </DialogContent>
          </Dialog>
          {/* Gambar Kecil - hanya tampilkan jika ada gambar */}
          <div className="grid grid-cols-2 gap-4 md:col-span-5">
            {data.images.slice(1, 4).filter(img => img && !img.includes('default-trip.jpg')).map((image, index) => (
              <Dialog
                key={index}
                open={!!selectedImage}
                onOpenChange={() => setSelectedImage(null)}
              >
                <DialogTrigger asChild>
                  <div
                    className="relative h-[196px] md:h-[221px] w-full cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <Image
                      src={getSafeImageSrc(image)}
                      alt={`${data.title} ${index + 1}`}
                      fill
                      className="rounded-sm object-cover"
                      unoptimized={true}
                      onError={() => handleImageError(image)}
                    />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  {selectedImage && (
                    <Image
                      src={getSafeImageSrc(selectedImage)}
                      alt="Selected Image"
                      width={800}
                      height={600}
                      className="rounded-lg"
                      unoptimized={true}
                      onError={() => selectedImage && handleImageError(selectedImage)}
                    />
                  )}
                </DialogContent>
              </Dialog>
            ))}
            {/* Gambar ke-4 dengan More Info - selalu tampil, bisa diklik jika ada lebih dari 4 gambar */}
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative h-[196px] md:h-[221px] w-full flex items-center justify-center rounded-sm cursor-pointer">
                  {data.images.length > 4 && data.images[4] ? (
                    <Image
                      src={getSafeImageSrc(data.images[4])}
                      alt="More Info Background"
                      fill
                      className="rounded-sm object-cover"
                      unoptimized={true}
                      onError={() => data.images[4] && handleImageError(data.images[4])}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-300 rounded-sm" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <p className="text-white font-semibold">More Info</p>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                {data.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {data.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative h-[150px] w-[150px] md:h-[200px] md:w-[200px]"
                      >
                        <Image
                          src={getSafeImageSrc(image)}
                          alt={`${data.title} ${index + 1}`}
                          fill
                          className="rounded-sm object-cover"
                          unoptimized={true}
                          onError={() => handleImageError(image)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Tidak ada gambar tersedia</p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Section 2: Judul dan Rating */}
      <div className="mb-4 bg-[#f5f5f5] p-6 rounded-lg shadow-xl">
        <div className="flex items-center mb-2">
          <span className="bg-[#E16238] text-white px-3 py-1 rounded-xs text-sm font-semibold w-fit">
            Private Trip
          </span>
          <span className="text-[#CFB53B] text-xl ml-8"> ★ 5 (100 ulasan)</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mt-2">{data.title}</h1>
        <p className="text-2xl text-gray-600 mt-2">
          Start from <strong>IDR {formatPrice(data.price)}</strong>
        </p>
      </div>

      {/* Section 3: Destination Info */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {/* Meeting Point */}
            <div className="flex items-center space-x-4">
              <div className="p-2">
              <Image
                src="/img/assembly-point.gif"
                alt="Meeting Point Icon"
                  width={40}
                  height={40}
                  className="min-w-[40px]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-gold font-semibold">Meeting Point</span>
                <span className="text-gray-600">{data.meetingPoint}</span>
              </div>
            </div>

            {/* Destinations */}
            <div className="flex items-center space-x-4">
              <div className="p-2">
              <Image
                src="/img/destination-map.gif"
                alt="Destinations Icon"
                  width={40}
                  height={40}
                  className="min-w-[40px]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-gold font-semibold">Destinations</span>
                <span className="text-gray-600">{data.destinations} Destinations</span>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center space-x-4">
              <div className="p-2">
              <Image
                src="/img/24-hour-service.gif"
                  alt="Duration Icon"
                  width={40}
                  height={40}
                  className="min-w-[40px]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-gold font-semibold">Trip Duration</span>
                <span className="text-gray-600">{data.daysTrip}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-6 md:mt-0 w-full md:w-auto justify-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-gold hover:border-gold/80 text-gold px-6 py-2 rounded-lg"
                >
                  {selectedDate ? format(selectedDate, "PPP") : "Select Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={disabledByOperationalDays}
                  initialFocus
                  className="rounded-md border"
                  showOutsideDays={false}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <Button
                onClick={() => handleBookNow(data.id)}
                className="bg-gold text-white px-8 py-2 rounded-lg font-semibold text-sm hover:bg-gold-dark-20 hover:scale-95 transition-all duration-300"
              >
                Book Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Section 3.5: Additional Information */}
      {(data.operational_days && data.operational_days.length > 0) || (data.boat_ids && data.boat_ids.length > 0) ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Informasi Tambahan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.operational_days && data.operational_days.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="p-2">
                  <Image
                    src="/img/calendar-time.gif"
                    alt="Operational Days Icon"
                    width={40}
                    height={40}
                    className="min-w-[40px]"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-gold font-semibold">Hari Operasional</span>
                  <span className="text-gray-600">
                    {data.operational_days
                      .map((day) => {
                        const dayLabels: { [key: string]: string } = {
                          Monday: "Senin",
                          Tuesday: "Selasa",
                          Wednesday: "Rabu",
                          Thursday: "Kamis",
                          Friday: "Jumat",
                          Saturday: "Sabtu",
                          Sunday: "Minggu",
                        };
                        return dayLabels[day] || day;
                      })
                      .join(", ")}
                  </span>
                </div>
              </div>
            )}

            {data.boat_ids && data.boat_ids.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className="p-2">
                  <Image
                    src="/img/cruise-ship.gif"
                    alt="Boat Icon"
                    width={40}
                    height={40}
                    className="min-w-[40px]"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-gold font-semibold">Kapal</span>
                  <span className="text-gray-600">{data.boat_ids.length} kapal tersedia</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Section 4: Tabs Navigation */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex space-x-4 mb-6">
          <Button
            variant={activeTab === "itinerary" ? "default" : "outline"}
            onClick={() => setActiveTab("itinerary")}
            className={`${
              activeTab === "itinerary"
                ? "bg-gold text-white hover:bg-gold-dark-20"
                : "bg-gold/5 text-gold hover:bg-gold hover:text-white"
            } px-7 py-6 rounded-lg font-semibold text-sm transition-all duration-300`}
          >
            Itinerary
          </Button>
          {(() => {
            const includeContent = (data.include || []).join("") || "";
            const hasInclude = includeContent.trim() !== "" && 
              includeContent.replace(/<[^>]*>/g, '').trim() !== "";
            
            const excludeContent = (data.exclude || []).join("") || "";
            const hasExclude = excludeContent.trim() !== "" && 
              excludeContent.replace(/<[^>]*>/g, '').trim() !== "";
            
            const hasFlight = (data.flightSchedules && data.flightSchedules.length > 0) || 
              (data.flightInfo && (data.flightInfo.guideFee1 || data.flightInfo.guideFee2));
            
            const hasNote = data.note && data.note.trim() !== "" && 
              data.note.replace(/<[^>]*>/g, '').trim() !== "";
            
            const hasDescription = data.description && 
              (Array.isArray(data.description) ? 
                data.description.some(item => item && item.trim() !== "") : 
                data.description.trim() !== "" && data.description.split(/\r?\n/).some(line => line.trim().startsWith("*"))
              );
            
            return hasInclude || hasExclude || hasFlight || hasNote || hasDescription;
          })() && (
          <Button
            variant={activeTab === "information" ? "default" : "outline"}
            onClick={() => setActiveTab("information")}
            className={`${
              activeTab === "information"
                  ? "bg-gold text-white hover:bg-gold-dark-20"
                  : "bg-gold/5 text-gold hover:bg-gold hover:text-white"
              } px-7 py-6 rounded-lg font-semibold text-sm transition-all duration-300`}
          >
            Information
          </Button>
          )}
          {data.has_boat && (
          <Button
            variant={activeTab === "boat" ? "default" : "outline"}
            onClick={() => setActiveTab("boat")}
            className={`${
              activeTab === "boat"
                  ? "bg-gold text-white hover:bg-gold-dark-20"
                  : "bg-gold/5 text-gold hover:bg-gold hover:text-white"
              } px-7 py-6 rounded-lg font-semibold text-sm transition-all duration-300`}
          >
            Boat
          </Button>
          )}
        </div>

        <div>
          {activeTab === "itinerary" && (
            <div className="space-y-6">
              <div className="flex flex-col items-start">
                <h1 className="text-3xl font-bold text-gray-800">Itinerary</h1>
                <div className="w-[120px] h-[3px] bg-gold mt-1 mb-6"></div>
              </div>

              <Tabs
                defaultValue={selectedDurationId.toString()}
                className="w-full"
                onValueChange={(value) => setSelectedDurationId(parseInt(value))}
              >
                <TabsList className="mb-6 bg-transparent flex flex-wrap gap-2 h-auto p-0">
                {data.trip_durations.map((duration) => (
                    <TabsTrigger
                      key={duration.id}
                      value={duration.id.toString()}
                      className="px-4 py-2 rounded-lg data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-none bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      {duration.duration_label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {data.trip_durations.map((duration) => (
                  <TabsContent
                    key={duration.id}
                    value={duration.id.toString()}
                    className="space-y-6 mt-2"
                  >
                    {duration.itineraries.map((day, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
                      >
                        <h3 className="text-lg font-semibold mb-4 text-gold">
                          {day.day}
                    </h3>
                        <div
                          className="text-gray-600 text-sm [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_ol]:space-y-2 [&_ul]:space-y-2 [&_p]:my-0 [&_li]:pl-2 [&_li]:relative [&_li]:leading-normal"
                            dangerouslySetInnerHTML={{ __html: day.activities }}
                          />
                      </div>
                      ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
          {activeTab === "information" && (
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Information
              </h1>
              <div className="w-[140px] h-[3px] bg-[#CFB53B] mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolom Kiri */}
                <div className="space-y-6">
                  {/* Include Section */}
                  {(() => {
                    const includeContent = (data.include || []).join("") || "";
                    const hasValidContent = includeContent.trim() !== "" && 
                      includeContent.replace(/<[^>]*>/g, '').trim() !== "";
                    return hasValidContent;
                  })() && (
                  <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm min-h-[250px] flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                      Include
                    </h2>
                      <div
                        className="text-gray-600 text-sm [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_ol]:space-y-2 [&_ul]:space-y-2 [&_p]:my-0 [&_li]:pl-2 [&_li]:relative [&_li]:leading-normal"
                        dangerouslySetInnerHTML={{
                          __html: (data.include || []).join("") || "",
                        }}
                      />
                    </div>
                  )}

                  {/* Flight Information */}
                  {((data.flightSchedules && data.flightSchedules.length > 0) || 
                    (data.flightInfo && (data.flightInfo.guideFee1 || data.flightInfo.guideFee2))) && (
                    <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm min-h-[250px] flex flex-col">
                      <h2 className="text-xl font-bold text-gray-800 mb-6">
                        Flight Information
                      </h2>
                      <div className="space-y-6">
                        {data.flightSchedules &&
                        data.flightSchedules.length > 0 ? (
                          <>
                            <div className="bg-gold/10 border-l-4 border-gold p-4 mb-4">
                              <p className="text-gold-dark text-sm font-medium">
                                <strong>Note:</strong> Flight schedules below are estimated departure and arrival times to Labuan Bajo. Actual flight times may vary depending on airline schedules and weather conditions.
                              </p>
                            </div>
                            {data.flightSchedules.map((schedule, index) => (
                              <div key={index}>
                                <h3 className="text-gold text-xl font-semibold mb-4">
                                  {schedule.route}
                                </h3>
                                <div className="grid grid-cols-2 gap-8">
                                  <div>
                                    <p className="text-gold font-medium mb-2">
                                      Estimated Departure from Labuan Bajo
                                    </p>
                                    <p className="text-gray-500">
                                      {schedule.etd_text === "-"
                                        ? `${schedule.etd_time.slice(0, -3)} WITA`
                                        : schedule.etd_text}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gold font-medium mb-2">
                                      Estimated Arrival to Labuan Bajo
                                    </p>
                                    <p className="text-gray-500">
                                      {schedule.eta_text === "-"
                                        ? `${schedule.eta_time.slice(0, -3)} WITA`
                                        : schedule.eta_text}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-gray-600">
                            {data.flightInfo?.guideFee1 && data.flightInfo.guideFee1 !== '0' && (
                              <p className="text-sm">
                                Guide Fee (per day): IDR {formatPrice(data.flightInfo.guideFee1)}
                              </p>
                            )}
                            {data.flightInfo?.guideFee2 && data.flightInfo.guideFee2 !== '0' && (
                              <p className="text-sm mt-2">
                                Guide Fee (per 5 pax): IDR {formatPrice(data.flightInfo.guideFee2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-6">
                  {/* Exclude Section */}
                  {(() => {
                    const excludeContent = (data.exclude || []).join("") || "";
                    const hasValidContent = excludeContent.trim() !== "" && 
                      excludeContent.replace(/<[^>]*>/g, '').trim() !== "";
                    return hasValidContent;
                  })() && (
                    <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm min-h-[250px] flex flex-col">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Exclude
                      </h2>
                      <div
                        className="text-gray-600 text-sm [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_ol]:space-y-2 [&_ul]:space-y-2 [&_p]:my-0 [&_li]:pl-2 [&_li]:relative [&_li]:leading-normal"
                        dangerouslySetInnerHTML={{
                          __html: (data.exclude || []).join("") || "",
                        }}
                      />
                    </div>
                  )}

                  {/* Description Section */}
                  {(() => {
                    const hasNote = data.note && data.note.trim() !== "" && 
                      data.note.replace(/<[^>]*>/g, '').trim() !== "";
                    const hasDescription = data.description && 
                      (Array.isArray(data.description) ? 
                        data.description.some(item => item && item.trim() !== "") : 
                        data.description.trim() !== "" && data.description.split(/\r?\n/).some(line => line.trim().startsWith("*"))
                      );
                    return hasNote || hasDescription;
                  })() && (
                    <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm min-h-[100px] flex flex-col">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Description
                      </h2>
                      {data.note ? (
                        <div
                          className="text-gray-600 text-sm [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_ol]:space-y-2 [&_ul]:space-y-2 [&_p]:my-0 [&_li]:pl-2 [&_li]:relative [&_li]:leading-normal"
                          dangerouslySetInnerHTML={{
                            __html: data.note,
                          }}
                        />
                      ) : Array.isArray(data.description) ? (
                        <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
                          {data.description.map((item, idx) => (
                            <li key={idx}>{item.replace(/^\*\s?/, "")}</li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
                          {data.description
                            .split(/\r?\n/)
                            .filter((line) => line.trim().startsWith("*"))
                            .map((line, idx) => (
                              <li key={idx}>{line.replace(/^\*\s?/, "")}</li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === "boat" && (
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Boat</h1>
              <div className="w-[80px] h-[3px] bg-[#CFB53B] mb-6"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-8xl mx-auto items-center mb-6">
                {" "}
                {data.boatImages?.map((boat, index) => (
                  <Link key={index} href={`/detail-boat/${boat.id}`}>
                    <div className="relative group overflow-hidden rounded-lg shadow-lg cursor-pointer">
                      {/* Gambar Boat */}
                      <div className="relative h-[330px] w-full">
                        <Image
                          src={getSafeImageSrc(boat.image)}
                          alt={boat.title}
                          fill
                          className="rounded-lg transition-transform duration-300 group-hover:scale-110 object-cover"
                          unoptimized={true}
                          onError={() => handleImageError(boat.image)}
                        />
                      </div>
                      {/* Overlay dengan Judul */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <p className="text-white font-semibold text-lg">
                          {boat.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailPaketPrivateTrip;
