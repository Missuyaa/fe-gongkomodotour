"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { Trip } from "@/types/trips";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Boat, Cabin } from "@/types/boats";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
// @ts-expect-error: No types for country-telephone-data
import { allCountries } from "country-telephone-data";

// Inisialisasi daftar negara
countries.registerLocale(enLocale);
const countryList = countries.getNames("en", { select: "official" });
const countryOptions = Object.entries(countryList).map(([code, name]) => ({
  value: code,
  label: name,
}));

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TripPrice {
  id: number;
  trip_duration_id: number;
  pax_min: number;
  pax_max: number;
  price_per_pax: number;
  status: string;
  region: "Domestic" | "Overseas" | "Domestic & Overseas";
}

interface PackageData {
  id: string;
  title: string;
  price: string;
  daysTrip: string;
  type: "Open Trip" | "Private Trip";
  image: string;
  mainImage?: string;
  itinerary?: {
    durationId: number;
    durationLabel: string;
    days: { day: string; activities: string }[];
  }[];
  boatImages?: { image: string; title: string; id: string }[];
  has_boat?: boolean;
  has_hotel?: boolean;
  trip_durations?: {
    id: number;
    duration_label: string;
    duration_days: number;
    duration_nights?: number;
    trip_prices?: TripPrice[];
    itineraries: { day: string; activities: string }[];
  }[];
  additional_fees?: {
    id: number;
    fee_category: string;
    price: number;
    region: "Domestic" | "Overseas" | "Domestic & Overseas";
    unit: "per_pax" | "per_5pax" | "per_day" | "per_day_guide";
    pax_min: number;
    pax_max: number;
    day_type: "Weekday" | "Weekend" | null;
    is_required: boolean;
  }[];
  surcharges?: {
    id: number;
    season: string;
    start_date: string;
    end_date: string;
    surcharge_price: number;
  }[];
  operational_days?: string[];
}

type BoatResponse = {
  data: Boat[];
};

interface Hotel {
  id: number;
  hotel_name: string;
  hotel_type: string;
  occupancy: "Single Occupancy" | "Double Occupancy";
  price: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BookingResponse {
  data: {
    id: number;
    // tambahkan field lain jika diperlukan
  };
}

// Helper untuk mendapatkan kode negara telepon
function getCountryCallingCode(countryCode: string) {
  if (!countryCode) return "";
  const country = allCountries.find(
    (c: { iso2: string }) => c.iso2.toUpperCase() === countryCode.toUpperCase()
  );
  return country ? `+${country.dialCode}` : "";
}

// Helper untuk mencari country code dari nama negara atau country code
function getCountryCodeFromName(countryNameOrCode: string): string {
  if (!countryNameOrCode) return "";
  
  // Jika sudah country code (2-3 karakter uppercase), langsung return
  if (countryNameOrCode.length <= 3 && /^[A-Z]+$/.test(countryNameOrCode.toUpperCase())) {
    // Validasi apakah country code valid
    const isValidCode = countryOptions.some(opt => opt.value === countryNameOrCode.toUpperCase());
    if (isValidCode) {
      return countryNameOrCode.toUpperCase();
    }
  }
  
  // Coba cari exact match (case insensitive) dengan nama negara
  const entry = Object.entries(countryList).find(
    ([_, name]) => name.toLowerCase() === countryNameOrCode.toLowerCase()
  );
  
  if (entry) return entry[0];
  
  // Coba cari partial match untuk handle variasi nama
  const partialMatch = Object.entries(countryList).find(
    ([_, name]) => name.toLowerCase().includes(countryNameOrCode.toLowerCase()) || 
                   countryNameOrCode.toLowerCase().includes(name.toLowerCase())
  );
  
  return partialMatch ? partialMatch[0] : "";
}

// Helper untuk mendapatkan country code dari dial code
function getCountryCodeFromDialCode(dialCode: string): string {
  if (!dialCode) return "";
  // Remove + if present
  const cleanDialCode = dialCode.replace("+", "");
  
  // Cari country dari allCountries yang memiliki dial code ini
  const country = allCountries.find((c: { dialCode: string }) => c.dialCode === cleanDialCode);
  if (!country) return "";
  
  // Cari country code dari countryOptions berdasarkan dial code
  for (const opt of countryOptions) {
    const callingCode = getCountryCallingCode(opt.value);
    if (callingCode === `+${cleanDialCode}`) {
      return opt.value;
    }
  }
  
  return "";
}

// Helper untuk parse phone number (memisahkan country code dari nomor)
function parsePhoneNumber(phoneNumber: string, countryCode: string): string {
  if (!phoneNumber) return "";
  
  // Jika phone number dimulai dengan +, coba parse country code
  if (phoneNumber.startsWith("+")) {
    // Cari country code yang cocok dari allCountries (urutkan dari yang terpanjang ke terpendek)
    const sortedCountries = [...allCountries].sort((a: { dialCode: string }, b: { dialCode: string }) => 
      b.dialCode.length - a.dialCode.length
    );
    
    const matchedCountry = sortedCountries.find((c: { dialCode: string }) => 
      phoneNumber.startsWith(`+${c.dialCode}`)
    );
    
    if (matchedCountry) {
      const localNumber = phoneNumber.substring(matchedCountry.dialCode.length + 1).trim();
      return localNumber;
    }
  }
  
  // Jika phone number dimulai dengan country calling code (tanpa +)
  const callingCode = getCountryCallingCode(countryCode);
  if (callingCode) {
    const cleanCallingCode = callingCode.replace("+", "");
    if (phoneNumber.startsWith(cleanCallingCode)) {
      return phoneNumber.substring(cleanCallingCode.length).trim();
    }
  }
  
  // Jika phone number dimulai dengan country calling code (dengan +)
  if (callingCode && phoneNumber.startsWith(callingCode)) {
    return phoneNumber.substring(callingCode.length).trim();
  }
  
  // Jika tidak ada country code, return as is (mungkin sudah local number)
  return phoneNumber;
}

export default function Booking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get("packageId");
  const dateParam = searchParams.get("date");
  const packageType = searchParams.get("type");

  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dateParam ? new Date(dateParam) : undefined
  );
  // Inisialisasi tripCount dengan 0
  const [tripCount, setTripCount] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [selectedBoat, setSelectedBoat] = useState<string>("");
  const [additionalCharges, setAdditionalCharges] = useState<string[]>([]);
  const [selectedDurationDays, setSelectedDurationDays] = useState<number>(0);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [filteredBoats, setFilteredBoats] = useState<Boat[]>([]);
  const [requiredBoats, setRequiredBoats] = useState<number>(0);
  const [requiredCabins, setRequiredCabins] = useState<number>(0);
  const [selectedCabins, setSelectedCabins] = useState<{ cabinId: string, pax: number }[]>([]);
  const [isLoadingBoats, setIsLoadingBoats] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [selectedHotelRooms, setSelectedHotelRooms] = useState<{ hotelId: string, rooms: number, pax: number }[]>([]);
  // Helper: hitung jumlah malam dari data durasi
  const computeNights = useCallback((duration?: { duration_label: string; duration_days: number; duration_nights?: number; }) => {
    if (!duration) return 0;
    // 1) Coba parse dari label, contoh: "4D5N", "4d 5n"
    const match = duration.duration_label?.match(/(\d+)\s*[dD][^\d]*?(\d+)\s*[nN]/);
    if (match) {
      const nightsFromLabel = Number(match[2]);
      if (Number.isFinite(nightsFromLabel) && nightsFromLabel >= 0) return nightsFromLabel;
    }
    // 2) Pakai duration_nights bila tersedia
    if (typeof duration.duration_nights === 'number' && duration.duration_nights >= 0) {
      return duration.duration_nights;
    }
    // 3) Fallback: days - 1
    return Math.max((duration.duration_days || 0) - 1, 0);
  }, []);
  const [userRegion, setUserRegion] = useState<"domestic" | "overseas">("domestic");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    country: "",
    phone: "",
    notes: "",
    requestHotel: false,
    selectedHotel: "",
    numberOfRooms: 1
  });
  const [isFormAutoFilled, setIsFormAutoFilled] = useState(false);

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Disable kalender mengikuti operational_days
  const dayNameToIndex: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const allowedDaysSet = new Set(
    (selectedPackage?.operational_days || []).map((d) => dayNameToIndex[d])
  );
  const disabledByOperationalDays = (date: Date) => {
    if (allowedDaysSet.size === 0) return false; // jika tidak ada konfigurasi, izinkan semua hari
    return !allowedDaysSet.has(date.getDay());
  };

  const getDatesInRange = (startDate: Date, days: number) => {
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const calculateSurcharge = () => {
    if (!selectedPackage || !selectedDate || !selectedDurationDays) return null;

    const tripDates = getDatesInRange(selectedDate, selectedDurationDays);
    let surchargeAmount = 0;

    selectedPackage.surcharges?.forEach(surcharge => {
      const surchargeStart = new Date(surcharge.start_date);
      const surchargeEnd = new Date(surcharge.end_date);

      // Cek apakah ada tanggal dalam range perjalanan yang masuk ke periode surcharge
      const isInSurchargePeriod = tripDates.some(date =>
        date >= surchargeStart && date <= surchargeEnd
      );

      // Jika ada tanggal yang masuk periode surcharge, tambahkan surcharge (hanya sekali)
      if (isInSurchargePeriod) {
        surchargeAmount = Number(surcharge.surcharge_price);
      }
    });

    return surchargeAmount > 0 ? surchargeAmount : null;
  };

  const getApplicableAdditionalFees = useCallback(() => {
    if (!selectedPackage?.additional_fees || !selectedDate || !selectedDurationDays) return [];

    const tripDates = getDatesInRange(selectedDate, selectedDurationDays);
    const applicableFees: typeof selectedPackage.additional_fees = [];

    // Kelompokkan fee berdasarkan kategori
    const feesByCategory = selectedPackage.additional_fees.reduce((acc, fee) => {
      // Cek apakah fee berlaku untuk region yang dipilih
      const isApplicableRegion =
        fee.region === "Domestic & Overseas" ||
        (userRegion === "domestic" && fee.region === "Domestic") ||
        (userRegion === "overseas" && fee.region === "Overseas");

      if (!isApplicableRegion) return acc;

      const hasWeekendDay = tripDates.some(date => isWeekend(date));
      const hasWeekdayDay = tripDates.some(date => !isWeekend(date));

      if (
        !fee.day_type ||
        (fee.day_type === "Weekend" && hasWeekendDay) ||
        (fee.day_type === "Weekday" && hasWeekdayDay)
      ) {
        const category = fee.fee_category.replace(/[0-9]/g, '').trim();
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(fee);
      }
      return acc;
    }, {} as Record<string, typeof selectedPackage.additional_fees>);

    // Untuk setiap kategori, pilih fee yang sesuai dengan range pax
    Object.values(feesByCategory).forEach(fees => {
      if (fees.length > 0) {
        const applicableFee = tripCount > 0
          ? fees.find(fee => tripCount >= fee.pax_min && tripCount <= fee.pax_max)
          : fees[0];

        if (applicableFee) {
          applicableFees.push(applicableFee);
        }
      }
    });

    return applicableFees;
  }, [selectedPackage, selectedDate, selectedDurationDays, tripCount, userRegion]);

  const isActive = (status: unknown) => {
    if (typeof status === "string") {
      const s = status.toLowerCase();
      return s.includes("aktif") || s.includes("active") || s === "1" || s === "true";
    }
    if (typeof status === "number") return status === 1;
    if (typeof status === "boolean") return status;
    return true; // default to active if unknown
  };

  const toNumber = (value: unknown) => {
    return typeof value === "number" ? value : Number(value ?? 0);
  };

  const calculateTotalBoatCapacity = useCallback((boat: Boat) => {
    return boat.cabin
      .filter(cabin => isActive(cabin.status))
      .reduce((total, cabin) => total + toNumber(cabin.max_pax), 0);
  }, []);

  useEffect(() => {
    // Tampilkan loading saat melakukan re-filter boat akibat perubahan pax/boats
    setIsLoadingBoats(true);

    const availableBoats = boats
      .filter(boat => isActive(boat.status))
      .filter(boat => {
        const totalCapacity = calculateTotalBoatCapacity(boat);
        const hasCabinWithMin = boat.cabin.some(cabin => isActive(cabin.status) && toNumber(cabin.min_pax) <= tripCount);
        return totalCapacity >= tripCount && hasCabinWithMin;
      });
    setFilteredBoats(availableBoats);

    // Reset selected boat jika boat yang dipilih tidak tersedia lagi
    if (selectedBoat) {
      const selectedBoatData = availableBoats.find(boat => boat.id.toString() === selectedBoat);
      if (!selectedBoatData) {
        setSelectedBoat("");
      }
    }

    // Tahan indikator loading sebentar agar terlihat oleh user
    const timeoutId = setTimeout(() => setIsLoadingBoats(false), 300);
    return () => clearTimeout(timeoutId);
  }, [tripCount, boats, selectedBoat, calculateTotalBoatCapacity]);

  useEffect(() => {
    const fetchTripData = async () => {
      if (!packageId) return;

      try {
        const response = await apiRequest<{ data: Trip }>(
          'GET',
          `/api/landing-page/trips/${packageId}`
        );

        if (response.data) {
          const trip = response.data;
          console.log('Original Trip Data:', trip);
          // Helper untuk memastikan file_url tidak double API_URL
          const getImageUrl = (file_url: string | undefined) => {
            if (!file_url) return "/img/default-image.png";
            if (/^https?:\/\//.test(file_url)) return file_url;
            return `${API_URL}${file_url}`;
          };

          const transformedData: PackageData = {
            id: trip.id.toString(),
            title: trip.name,
            price: trip.trip_durations?.[0]?.trip_prices?.[0]?.price_per_pax?.toString() || "0",
            daysTrip: trip.trip_durations?.[0]?.duration_label || "",
            type: trip.type,
            image: getImageUrl(trip.assets?.[0]?.file_url),
            mainImage: getImageUrl(trip.assets?.[0]?.file_url),
            itinerary: trip.trip_durations?.map(duration => ({
              durationId: duration.id,
              durationLabel: duration.duration_label,
              days: duration.itineraries?.map(itinerary => ({
                day: `Day ${itinerary.day_number}`,
                activities: itinerary.activities
              })) || []
            })),
            boatImages: trip.boat_assets?.map(asset => ({
              image: getImageUrl(asset.file_url),
              title: asset.title || "Boat",
              id: asset.id.toString()
            })),
            has_boat: trip.has_boat,
            has_hotel: trip.has_hotel,
            trip_durations: trip.trip_durations?.map(duration => ({
              id: duration.id,
              duration_label: duration.duration_label,
              duration_days: duration.duration_days,
              trip_prices: duration.trip_prices,
              itineraries: duration.itineraries?.map(itinerary => ({
                day: `Day ${itinerary.day_number}`,
                activities: itinerary.activities
              })) || []
            })),
            additional_fees: trip.additional_fees?.map(fee => ({
              id: fee.id,
              fee_category: fee.fee_category.replace(/[0-9]/g, '').trim(),
              price: Number(fee.price || 0),
              region: fee.region,
              unit: fee.unit,
              pax_min: fee.pax_min,
              pax_max: fee.pax_max,
              day_type: fee.day_type,
              is_required: Boolean(fee.is_required)
            })),
            surcharges: trip.surcharges?.map(surcharge => ({
              id: surcharge.id,
              season: surcharge.season,
              start_date: surcharge.start_date,
              end_date: surcharge.end_date,
              surcharge_price: Number(surcharge.surcharge_price)
            })),
            operational_days: trip.operational_days || []
          };
          console.log('Transformed Package Data:', transformedData);
          setSelectedPackage(transformedData);
          // Set durasi otomatis jika hanya ada satu opsi
          if (transformedData.trip_durations?.length === 1) {
            setSelectedDuration(transformedData.trip_durations[0].duration_label);
          }
          // Set additional charges yang required secara otomatis
          const requiredFees = trip.additional_fees
            ?.filter(fee => Boolean(fee.is_required))
            .map(fee => fee.id.toString()) || [];
          setAdditionalCharges(requiredFees);
        }
      } catch (error) {
        console.error('Error fetching trip data:', error);
      }
    };

    fetchTripData();
  }, [packageId]);

  // Auto-fill form dari data user yang sudah login
  useEffect(() => {
    // Cek apakah user sudah login
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsFormAutoFilled(false);
      return;
    }

    // Load data user dari localStorage
    const userDataString = localStorage.getItem('user');
    if (!userDataString) {
      setIsFormAutoFilled(false);
      return;
    }

    try {
      const userData = JSON.parse(userDataString);
      const customer = userData.customer;

      // Jika tidak ada data customer, biarkan form kosong
      if (!customer) {
        setIsFormAutoFilled(false);
        return;
      }

      // Auto-fill form dengan data customer
      const newFormData = {
        name: userData.name || customer.user?.name || "",
        email: userData.email || customer.user?.email || "",
        address: customer.alamat || "",
        country: "",
        phone: "",
        notes: "",
        requestHotel: false,
        selectedHotel: "",
        numberOfRooms: 1
      };

      // Convert nationality ke country code
      // Cek apakah nasionality adalah country code (2-3 karakter) atau country name
      let countryCode = "";
      if (customer.nasionality) {
        // Jika sudah country code (2-3 karakter uppercase), langsung pakai
        if (customer.nasionality.length <= 3 && /^[A-Z]+$/.test(customer.nasionality.toUpperCase())) {
          const isValidCode = countryOptions.some(opt => opt.value === customer.nasionality.toUpperCase());
          if (isValidCode) {
            countryCode = customer.nasionality.toUpperCase();
          }
        }
        
        // Jika belum dapat country code, coba convert dari nama negara
        if (!countryCode) {
          countryCode = getCountryCodeFromName(customer.nasionality);
        }
      }

      // Parse phone number (hapus country code jika ada)
      // Prioritaskan country code dari phone number karena lebih akurat
      if (customer.no_hp) {
        // Jika phone number dimulai dengan +, cari country code dari phone number
        if (customer.no_hp.startsWith("+")) {
          // Cari country code yang cocok dari allCountries (urutkan dari yang terpanjang)
          const sortedCountries = [...allCountries].sort((a: { dialCode: string }, b: { dialCode: string }) => 
            b.dialCode.length - a.dialCode.length
          );
          
          const matchedCountry = sortedCountries.find((c: { dialCode: string }) => 
            customer.no_hp.startsWith(`+${c.dialCode}`)
          );
          
          if (matchedCountry) {
            // Extract local number
            newFormData.phone = customer.no_hp.substring(matchedCountry.dialCode.length + 1).trim();
            
            // Update country code berdasarkan phone number (prioritaskan dari phone)
            const countryCodeFromPhone = getCountryCodeFromDialCode(`+${matchedCountry.dialCode}`);
            if (countryCodeFromPhone) {
              // Prioritaskan country code dari phone number
              countryCode = countryCodeFromPhone;
              newFormData.country = countryCode;
            } else if (countryCode) {
              // Jika tidak dapat dari phone, gunakan dari nationality
              newFormData.country = countryCode;
            }
          } else {
            // Jika tidak match, gunakan country code yang sudah ada
            if (countryCode) {
              newFormData.country = countryCode;
            }
            newFormData.phone = parsePhoneNumber(customer.no_hp, countryCode);
          }
        } else {
          // Jika tidak dimulai dengan +, parse dengan country code yang sudah ada
          if (countryCode) {
            newFormData.country = countryCode;
          }
          newFormData.phone = parsePhoneNumber(customer.no_hp, countryCode);
        }
      } else if (countryCode) {
        // Jika tidak ada phone number, set country code dari nationality
        newFormData.country = countryCode;
      }

      // Set region berdasarkan customer.region atau country
      if (customer.region) {
        setUserRegion(customer.region === "domestic" ? "domestic" : "overseas");
      } else if (newFormData.country === "ID") {
        setUserRegion("domestic");
      } else if (newFormData.country) {
        setUserRegion("overseas");
      }

      // Update form data hanya jika ada data yang valid
      if (newFormData.name || newFormData.email || newFormData.address || newFormData.country || newFormData.phone) {
        setFormData(newFormData);
        setIsFormAutoFilled(true);
      } else {
        setIsFormAutoFilled(false);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      setIsFormAutoFilled(false);
    }
  }, []); // Hanya run sekali saat mount

  // Set tripCount ke minimal pax saat paket/durasi berubah
  // Catatan: Jangan bergantung pada tripCount agar tidak me-reset saat user menambah
  useEffect(() => {
    if (!selectedPackage?.trip_durations || selectedPackage.trip_durations.length === 0) return;

    const duration = selectedPackage.trip_durations.find(
      (d) => d.duration_label === selectedDuration
    ) || selectedPackage.trip_durations[0];

    const minFromPrices = duration?.trip_prices?.reduce((min, price) => {
      const currentMin = Number(price.pax_min ?? Infinity);
      return Number.isFinite(currentMin) ? Math.min(min, currentMin) : min;
    }, Infinity);

    const minimumPax = Number.isFinite(minFromPrices) ? Number(minFromPrices) : 1;

    setTripCount((prev) => {
      const current = Number(prev) || 0;
      return current < minimumPax ? minimumPax : current;
    });
  }, [selectedPackage, selectedDuration]);

  useEffect(() => {
    if (selectedDuration && selectedPackage?.trip_durations) {
      const duration = selectedPackage.trip_durations.find(
        d => d.duration_label === selectedDuration
      );
      if (duration) {
        setSelectedDurationDays(duration.duration_days);
      }
    }
  }, [selectedDuration, selectedPackage]);

  // Minimum pax helper (berdasarkan trip_prices, fallback 1)
  const getMinimumPax = useCallback(() => {
    if (!selectedPackage?.trip_durations || selectedPackage.trip_durations.length === 0) {
      return 1;
    }
    const duration = selectedPackage.trip_durations.find(
      (d) => d.duration_label === selectedDuration
    ) || selectedPackage.trip_durations[0];
    const minFromPrices = duration?.trip_prices?.reduce((min, price) => {
      const currentMin = Number(price.pax_min ?? Infinity);
      return Number.isFinite(currentMin) ? Math.min(min, currentMin) : min;
    }, Infinity);
    const minPax = Number.isFinite(minFromPrices) ? Number(minFromPrices) : 1;
    return Math.max(minPax, 1);
  }, [selectedDuration, selectedPackage]);

  // Pastikan tripCount tidak turun di bawah minimum saat state relevan berubah
  useEffect(() => {
    const minimumPax = getMinimumPax();
    if (tripCount < minimumPax) {
      setTripCount(minimumPax);
    }
  }, [getMinimumPax, tripCount]);

  useEffect(() => {
    // Update additional charges based on date and duration
    if (selectedDate && selectedDurationDays && tripCount > 0) {
      const applicableFees = getApplicableAdditionalFees();

      // Pisahkan antara fee required dan non-required
      const requiredFees = applicableFees.filter(fee => fee.is_required);
      const nonRequiredFees = applicableFees.filter(fee => !fee.is_required);

      // Untuk fee required, auto select yang sesuai range pax
      const requiredFeeIds = requiredFees.map(fee => fee.id.toString());

      // Untuk non-required, pertahankan pilihan user yang masih valid
      const validNonRequiredCharges = additionalCharges.filter(id =>
        nonRequiredFees.some(fee => fee.id.toString() === id)
      );

      const newCharges = [...new Set([...requiredFeeIds, ...validNonRequiredCharges])];
      if (JSON.stringify(newCharges) !== JSON.stringify(additionalCharges)) {
        setAdditionalCharges(newCharges);
      }
    }
  }, [selectedDate, selectedDurationDays, tripCount, selectedPackage, additionalCharges, getApplicableAdditionalFees]);

  const handleDurationChange = (value: string) => {
    setSelectedDuration(value);
    // Reset boat saat durasi berubah
    setSelectedBoat("");
  };

  const handleBoatChange = (value: string) => {
    // Ganti boat: reset alokasi cabin & kebutuhan
    setSelectedBoat(value);
    setSelectedCabins([]);
    setRequiredBoats(0);
    setRequiredCabins(0);
  };

  const calculateBasePrice = () => {
    if (!selectedPackage?.trip_durations || tripCount === 0) return 0;
    // Jika trip punya relasi boat, abaikan trip_prices (harga mengikuti boat/cabin)
    if (selectedPackage?.has_boat) return 0;

    // Cari durasi yang dipilih
    const selectedDurationData = selectedPackage.trip_durations.find(
      d => d.duration_label === selectedDuration
    );

    if (!selectedDurationData?.trip_prices) return 0;

    // Cari harga yang sesuai dengan jumlah pax dan region
    const applicablePrice = selectedDurationData.trip_prices.find(
      price => {
        const isInPaxRange = tripCount >= price.pax_min && tripCount <= price.pax_max;
        // Cek apakah harga sesuai dengan region atau berlaku untuk kedua region
        const isApplicableRegion =
          price.region === "Domestic & Overseas" ||
          (userRegion === "domestic" && price.region === "Domestic") ||
          (userRegion === "overseas" && price.region === "Overseas");
        return isInPaxRange && isApplicableRegion;
      }
    );

    if (!applicablePrice) return 0;
    return Number(applicablePrice.price_per_pax);
  };

  const calculateBasePriceTotal = () => {
    return calculateBasePrice() * tripCount;
  };

  const calculateAdditionalFeeAmount = (fee: NonNullable<PackageData['additional_fees']>[number]) => {
    // Cek apakah fee berlaku untuk region yang dipilih
    const isApplicableRegion =
      fee.region === "Domestic & Overseas" ||
      (userRegion === "domestic" && fee.region === "Domestic") ||
      (userRegion === "overseas" && fee.region === "Overseas");

    if (!isApplicableRegion) return 0;

    const basePrice = Number(fee.price);

    switch (fee.unit) {
      case 'per_pax':
        return basePrice * tripCount;
      case 'per_5pax':
        return basePrice * Math.ceil(tripCount / 5);
      case 'per_day':
        const durationData = selectedPackage?.trip_durations?.find(
          d => d.duration_label === selectedDuration
        );
        return basePrice * (durationData?.duration_days || 0);
      case 'per_day_guide':
        const durationInfo = selectedPackage?.trip_durations?.find(
          d => d.duration_label === selectedDuration
        );
        return basePrice * (durationInfo?.duration_days || 0);
      default:
        return basePrice;
    }
  };

  const calculateAdditionalFees = () => {
    if (!selectedPackage?.additional_fees) return 0;

    // Filter additional fees berdasarkan region
    const applicableFees = selectedPackage.additional_fees.filter(fee => {
      if (fee.region === "Domestic & Overseas") return true;
      if (userRegion === "domestic" && fee.region === "Domestic") return true;
      if (userRegion === "overseas" && fee.region === "Overseas") return true;
      return false;
    });

    const feesWithAmounts = applicableFees
      .filter(fee => additionalCharges.includes(fee.id.toString()))
      .map(fee => ({
        fee,
        amount: calculateAdditionalFeeAmount(fee)
      }));

    console.log('Booking Additional Fees:', {
      selectedFees: additionalCharges,
      applicableFees: feesWithAmounts,
      total: feesWithAmounts.reduce((total, { amount }) => total + amount, 0)
    });

    return feesWithAmounts.reduce((total, { amount }) => total + amount, 0);
  };

  const calculateSurchargeAmount = () => {
    const surcharge = calculateSurcharge();
    if (!surcharge) return 0;
    // Surcharge dikalikan dengan jumlah pax
    return surcharge * tripCount;
  };

  const calculateTotalHotelPrice = () => {
    if (!selectedDuration || !selectedPackage?.trip_durations) return 0;

    // Cari durasi yang dipilih
    const durationData = selectedPackage.trip_durations.find(
      d => d.duration_label === selectedDuration
    );

    // Hitung jumlah malam dengan helper yang konsisten
    const nights = computeNights(durationData);

    return selectedHotelRooms.reduce((total, room) => {
      const hotel = hotels.find(h => h.id.toString() === room.hotelId);
      if (!hotel) return total;
      return total + (Number(hotel.price) * room.rooms * nights);
    }, 0);
  };

  const calculateTotalPrice = () => {
    const basePriceTotal = calculateBasePriceTotal();
    const additionalFeesTotal = calculateAdditionalFees();
    const surchargeTotal = calculateSurchargeAmount();
    const cabinTotal = calculateTotalCabinPrice();
    const hotelTotal = calculateTotalHotelPrice();

    return basePriceTotal + additionalFeesTotal + surchargeTotal + cabinTotal + hotelTotal;
  };

  useEffect(() => {
    const fetchBoats = async () => {
      try {
        setIsLoadingBoats(true);
        console.log('Selected Package:', selectedPackage);
        console.log('Has Boat:', selectedPackage?.has_boat);
        console.log('Fetching boats...');
        const response = await apiRequest<BoatResponse>(
          'GET',
          '/api/landing-page/boats'
        );
        console.log('Raw Boats Response:', response);

        if (response && response.data && Array.isArray(response.data)) {
          // Filter hanya boat yang aktif (longgar terhadap variasi status)
          const activeBoats = response.data.filter(boat => isActive(boat.status));
          console.log('Active boats:', activeBoats);
          console.log('Number of active boats:', activeBoats.length);
          setBoats(activeBoats);
          // Set filtered langsung sesuai tripCount saat ini dan min_pax cabin
          const availableNow = activeBoats.filter(boat => {
            const totalCapacity = calculateTotalBoatCapacity(boat);
            const hasCabinWithMin = boat.cabin.some(cabin => isActive(cabin.status) && toNumber(cabin.min_pax) <= tripCount);
            return totalCapacity >= tripCount && hasCabinWithMin;
          });
          setFilteredBoats(availableNow);
        } else {
          console.log('Invalid response format:', response);
        }
      } catch (error) {
        console.error('Error fetching boats:', error);
      } finally {
        setIsLoadingBoats(false);
      }
    };

    if (selectedPackage?.has_boat) {
      console.log('Package has boat, fetching boats...');
      fetchBoats();
    } else {
      console.log('Package does not have boat, skipping fetch');
    }
  }, [selectedPackage, calculateTotalBoatCapacity, tripCount]);

  // Reset alokasi cabin saat jumlah pax berubah
  useEffect(() => {
    setSelectedCabins([]);
    setRequiredBoats(0);
    setRequiredCabins(0);
  }, [tripCount]);

  const calculateBoatAndCabinRequirements = useCallback(() => {
    if (!selectedBoat || !tripCount) return;

    const selectedBoatData = boats.find(boat => boat.id.toString() === selectedBoat);
    if (!selectedBoatData) return;

    // Hitung total kapasitas cabin per boat
    const totalCabinCapacity = calculateTotalBoatCapacity(selectedBoatData);

    // Hitung jumlah boat yang dibutuhkan
    const boatsNeeded = Math.ceil(tripCount / totalCabinCapacity);
    setRequiredBoats(boatsNeeded);

    // Hitung jumlah cabin yang dibutuhkan
    const cabinsNeeded = Math.ceil(tripCount / selectedBoatData.cabin[0].max_pax);
    setRequiredCabins(cabinsNeeded);
  }, [selectedBoat, tripCount, boats, calculateTotalBoatCapacity]);

  useEffect(() => {
    calculateBoatAndCabinRequirements();
  }, [calculateBoatAndCabinRequirements, tripCount]);

  // Ambil harga per pax terendah dari cabin (base_price) untuk sebuah boat
  const getMinimumCabinBasePriceForBoat = (boat: Boat | undefined) => {
    if (!boat) return 0;
    const activeCabins = boat.cabin.filter(c => c.status === "Aktif");
    if (activeCabins.length === 0) return 0;
    return activeCabins.reduce((min, c) => {
      const price = Number(c.base_price || 0);
      return min === 0 ? price : Math.min(min, price);
    }, 0);
  };

  // Harga per pax untuk display di panel kiri
  const calculateDisplayPricePerPax = () => {
    // Jika mengikuti boat, tampilkan harga cabin (min base price)
    if (selectedPackage?.has_boat) {
      // Jika boat sudah dipilih, pakai boat tersebut
      if (selectedBoat) {
        const boat = boats.find(b => b.id.toString() === selectedBoat);
        return getMinimumCabinBasePriceForBoat(boat);
      }
      // Jika belum pilih boat, pakai boat termurah dari daftar tersedia
      const list = filteredBoats.length > 0 ? filteredBoats : boats;
      if (list.length === 0) return 0;
      const minAcrossBoats = list.reduce((min, b) => {
        const boatMin = getMinimumCabinBasePriceForBoat(b);
        if (boatMin === 0) return min;
        return min === 0 ? boatMin : Math.min(min, boatMin);
      }, 0);
      return minAcrossBoats;
    }
    // Jika tidak punya boat, pakai trip base price
    return calculateBasePrice();
  };

  const calculateCabinPrice = (cabin: Cabin, pax: number) => {
    const basePrice = Number(cabin.base_price);
    // Harga cabin per pax
    return basePrice * pax;
  };

  const calculateTotalCabinPrice = () => {
    return selectedCabins.reduce((total, selectedCabin) => {
      const cabinData = boats
        .find(boat => boat.id.toString() === selectedBoat)
        ?.cabin.find(c => c.id.toString() === selectedCabin.cabinId);

      if (!cabinData) return total;

      const cabinPrice = calculateCabinPrice(cabinData, selectedCabin.pax);

      return total + cabinPrice;
    }, 0);
  };

  const calculateTotalSelectedPax = () => {
    return selectedCabins.reduce((total, cabin) => total + cabin.pax, 0);
  };

  const handleCabinPaxChange = (cabinId: string, increment: boolean) => {
    const currentPax = selectedCabins.find(sc => sc.cabinId === cabinId)?.pax || 0;
    const totalSelectedPax = calculateTotalSelectedPax();
    const cabin = boats
      .find(boat => boat.id.toString() === selectedBoat)
      ?.cabin.find(c => c.id.toString() === cabinId);

    if (!cabin) return;

    if (increment) {
      // Saat pertama kali add, gunakan min_pax cabin (bukan 1). Jika totalSelectedPax + min_pax > tripCount, naikkan tripCount otomatis.
      if (currentPax === 0) {
        const minToAdd = Math.min(cabin.min_pax, cabin.max_pax);
        const neededTotal = totalSelectedPax + minToAdd;
        if (neededTotal > tripCount) {
          setTripCount(neededTotal);
        }
        setSelectedCabins([...selectedCabins, { cabinId, pax: minToAdd }]);
        return;
      }
      // Tambah 1 per klik, batasi oleh max_pax dan total tripCount
      if (currentPax < cabin.max_pax) {
        if (totalSelectedPax + 1 > tripCount) {
          setTripCount(totalSelectedPax + 1);
        }
        setSelectedCabins(selectedCabins.map(sc =>
          sc.cabinId === cabinId ? { ...sc, pax: sc.pax + 1 } : sc
        ));
      }
    } else {
      // Kurangi pax; tidak boleh kurang dari min_pax (tidak menjadi 0)
      if (currentPax > cabin.min_pax) {
        setSelectedCabins(selectedCabins.map(sc =>
          sc.cabinId === cabinId ? { ...sc, pax: sc.pax - 1 } : sc
        ));
      }
    }
  };

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoadingHotels(true);
        console.log('Fetching hotels...');
        const response = await apiRequest<{ data: Hotel[] }>(
          'GET',
          '/api/landing-page/hotels'
        );
        console.log('Hotels response:', response);

        if (response && response.data) {
          // Filter hanya hotel yang aktif
          const activeHotels = response.data.filter(hotel => hotel.status === "Aktif");
          console.log('Active hotels:', activeHotels);
          setHotels(activeHotels);
        } else {
          console.log('No hotels data received');
        }
      } catch (error) {
        console.error('Error fetching hotels:', error);
      } finally {
        setIsLoadingHotels(false);
      }
    };

    // Panggil fetchHotels ketika komponen dimount
    fetchHotels();
  }, []);

  const calculateTotalSelectedHotelPax = () => {
    return selectedHotelRooms.reduce((total, room) => total + room.pax, 0);
  };

  const handleRoomChange = (hotelId: string, increment: boolean) => {
    setSelectedHotelRooms(prev => {
      const currentRoom = prev.find(room => room.hotelId === hotelId);
      const hotel = hotels.find(h => h.id.toString() === hotelId);
      if (!hotel) return prev;

      const maxPaxPerRoom = hotel.occupancy === "Single Occupancy" ? 1 : 2;
      const totalPaxAllocated = calculateTotalSelectedHotelPax();
      const currentPax = currentRoom?.pax || 0;
      const remainingPax = tripCount - (totalPaxAllocated - currentPax);

    if (!currentRoom) {
      // Izinkan tambah kamar meski remainingPax < maxPaxPerRoom (contoh: pax 1, double occupancy)
      if (!increment || remainingPax <= 0) return prev;
      const initialPax = Math.min(maxPaxPerRoom, remainingPax);
      return [...prev, { hotelId, rooms: 1, pax: initialPax }];
    }

    if (increment) {
      // Tambah kamar: naikkan rooms, alokasikan pax hingga sisa (remainingPax)
      if (remainingPax <= 0) return prev;
      const newRooms = currentRoom.rooms + 1;
      const newPax = Math.min(currentPax + maxPaxPerRoom, Math.max(remainingPax, 0));
        return prev.map(room =>
          room.hotelId === hotelId ? { ...room, rooms: newRooms, pax: newPax } : room
        );
      } else {
        if (currentRoom.rooms <= 1) {
          return prev.filter(room => room.hotelId !== hotelId);
        }
        const newRooms = currentRoom.rooms - 1;
      const newPax = Math.max(currentPax - maxPaxPerRoom, 0);
        return prev.map(room =>
          room.hotelId === hotelId ? { ...room, rooms: newRooms, pax: newPax } : room
        );
      }
    });
  };

  const handleBooking = async () => {
    try {
      if (!selectedPackage || !selectedDate || !userRegion) {
        console.error('Missing required data for booking');
        return;
      }

      // Hitung tanggal selesai berdasarkan durasi yang dipilih
      const durationData = selectedPackage.trip_durations?.find(
        d => d.duration_label === selectedDuration
      );
      const endDate = new Date(selectedDate);
      // Lama inap untuk hotel mengikuti jumlah malam, bukan hari
      const nights = computeNights(durationData);
      endDate.setDate(endDate.getDate() + nights);

      // Siapkan data booking
      const bookingData = {
        trip_id: Number(selectedPackage.id),
        trip_duration_id: durationData?.id || 0,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_address: formData.address,
        customer_country: formData.country,
        customer_phone: `${getCountryCallingCode(formData.country)}${formData.phone}`,
        hotel_occupancy_id: selectedHotelRooms.length > 0 ?
          Number(selectedHotelRooms[0].hotelId) : null,
        total_pax: tripCount,
        status: "Pending",
        start_date: format(selectedDate, "yyyy-MM-dd"), // Format: yyyy-MM-dd (contoh: 2025-11-24)
        end_date: format(endDate, "yyyy-MM-dd"), // Format: yyyy-MM-dd
        total_price: calculateTotalPrice(),
        cabins: selectedCabins.length > 0 ? selectedCabins.map(cabin => {
          const cabinData = boats
            .find(boat => boat.id.toString() === selectedBoat)
            ?.cabin.find(c => c.id.toString() === cabin.cabinId);

          return {
            cabin_id: Number(cabin.cabinId),
            total_pax: cabin.pax,
            total_price: cabinData ? calculateCabinPrice(cabinData, cabin.pax) : 0
          };
        }) : [],
        boat_ids: selectedBoat ? [Number(selectedBoat)] : [],
        additional_fee_ids: additionalCharges.map(feeId => {
          const fee = selectedPackage.additional_fees?.find(f => f.id.toString() === feeId);
          return {
            additional_fee_id: Number(feeId),
            total_price: fee ? calculateAdditionalFeeAmount(fee) : 0
          };
        })
      };

      // Log data yang akan dikirim ke API untuk debugging
      console.log('📤 Sending booking data to API:', {
        ...bookingData,
        start_date_formatted: bookingData.start_date,
        end_date_formatted: bookingData.end_date,
        selectedDate_original: selectedDate,
        endDate_calculated: endDate
      });

      // Kirim data ke API (tanpa dialog konfirmasi)
      const response = await apiRequest<BookingResponse>(
        'POST',
        '/api/landing-page/bookings',
        bookingData
      );

      console.log('📥 Booking API response:', response);
      
      // Log detail response untuk debugging start_date
      if (response?.data) {
        console.log('📋 Booking API Response Details:', {
          booking_id: response.data.id,
          start_date_in_response: (response.data as any).start_date,
          end_date_in_response: (response.data as any).end_date,
          start_date_sent: bookingData.start_date,
          end_date_sent: bookingData.end_date,
          full_response_data: response.data
        });
        
        // Warning jika start_date tidak ada di response
        if (!(response.data as any).start_date) {
          console.warn('⚠️ WARNING: start_date tidak ada di response API create booking!', {
            booking_id: response.data.id,
            start_date_sent: bookingData.start_date,
            response_data: response.data
          });
        }
      }

      if (response?.data?.id) {
        // Redirect ke halaman payment dengan ID booking
        // Date di URL digunakan sebagai fallback jika backend tidak menyimpan start_date
        router.push(
          `/payment?bookingId=${response.data.id}&packageId=${packageId}&type=${packageType}&date=${selectedDate?.toISOString()}&tripCount=${tripCount}`
        );
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      // Tambahkan handling error sesuai kebutuhan
    }
  };

  if (!packageId || !selectedPackage) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex justify-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl">
          <h1 className="text-3xl font-bold text-center mb-6">YOUR BOOKING</h1>
          <p className="text-center text-gray-600">
            No package selected. Please select a package to book.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#efeaea] flex justify-center p-8"
    >
      <Card className="w-full max-w-9xl p-6">
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl font-bold text-center mb-6"
        >
          YOUR BOOKING
        </motion.h1>
        <div className="flex space-x-6">
          {/* Left Section: Trip Information */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-1/3"
          >
            <div className="relative">
              <Image
                src={selectedPackage.mainImage || "/img/default-image.png"}
                alt={selectedPackage.title}
                width={500}
                height={900}
                layout="responsive"
                className="rounded-lg object-cover"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="absolute top-4 left-4"
              >
                <Badge variant="secondary" className={packageType === "open" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}>
                  {packageType === "open" ? "Open Trip" : "Private Trip"}
                </Badge>
              </motion.div>
            </div>
            <div className="mt-4 space-y-4">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-xl font-semibold"
              >
                {selectedPackage.title}
              </motion.h2>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex items-center space-x-4"
              >
                <Label htmlFor="pax">Jumlah Pax</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const minimumPax = getMinimumPax();
                      setTripCount((prev) => Math.max(Number(prev) - 1, minimumPax));
                    }}
                    disabled={tripCount <= getMinimumPax()}
                    className="hover:bg-gold hover:text-white transition-colors duration-300"
                  >
                    -
                  </Button>
                  <Input
                    id="pax"
                    type="number"
                    value={tripCount}
                    readOnly
                    className="w-16 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTripCount((prev) => Number(prev) + 1)}
                    className="hover:bg-gold hover:text-white transition-colors duration-300"
                  >
                    +
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="space-y-2"
              >
                <p className="text-gray-600">{selectedPackage.daysTrip}</p>
                {/* <p className="text-2xl font-bold text-gold">
                  IDR {calculateDisplayPricePerPax().toLocaleString('id-ID')}/pax
                </p> */}
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="space-y-6"
              >
                {selectedPackage?.has_boat && selectedBoat && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg">Detail Boat & Cabin</h3>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Jumlah Boat yang Dibutuhkan: {requiredBoats} boat
                      </p>
                      <p className="text-sm text-gray-600">
                        Jumlah Cabin yang Dibutuhkan: {requiredCabins} cabin
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Distribusi Pax per Cabin:</h4>
                      {selectedCabins.map((cabin, index) => {
                        const cabinData = boats
                          .find(boat => boat.id.toString() === selectedBoat)
                          ?.cabin.find(c => c.id.toString() === cabin.cabinId);

                        if (!cabinData) return null;

                        const cabinPrice = calculateCabinPrice(cabinData, cabin.pax);

                        return (
                          <div key={index} className="flex flex-col p-2 bg-white rounded">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">
                                {cabinData.cabin_name} ({cabinData.bed_type})
                              </span>
                              <span className="text-sm font-medium">
                                {cabin.pax} pax
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {cabin.pax <= cabinData.min_pax ? (
                                <span>Base Price: IDR {Number(cabinData.base_price).toLocaleString('id-ID')}</span>
                              ) : (
                                <>
                                  <span>Base Price: IDR {Number(cabinData.base_price).toLocaleString('id-ID')}</span>
                                  <br />
                                  <span>
                                    Additional: {cabin.pax - cabinData.min_pax} pax × IDR {Number(cabinData.additional_price).toLocaleString('id-ID')}
                                    = IDR {((cabin.pax - cabinData.min_pax) * Number(cabinData.additional_price)).toLocaleString('id-ID')}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gold mt-1">
                              Total: IDR {cabinPrice.toLocaleString('id-ID')}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">
                        Total Harga Cabin: IDR {calculateTotalCabinPrice().toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-4">Detail Pembayaran</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">• Harga Cabin: IDR {calculateTotalCabinPrice().toLocaleString('id-ID')}</p>
                    {calculateSurcharge() && (
                      <p className="text-gray-600">• High/Peak Season: IDR {calculateSurchargeAmount().toLocaleString('id-ID')}</p>
                    )}
                    {selectedPackage?.additional_fees && selectedPackage.additional_fees.filter(fee => additionalCharges.includes(fee.id.toString())).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-gray-600">• Additional Fees:</p>
                        {selectedPackage.additional_fees
                          .filter(fee => additionalCharges.includes(fee.id.toString()))
                          .map(fee => (
                            <p key={fee.id} className="text-gray-600 ml-4">- {fee.fee_category}: IDR {calculateAdditionalFeeAmount(fee).toLocaleString('id-ID')}</p>
                          ))}
                      </div>
                    )}
                    {selectedHotelRooms.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-gray-600">• Hotel:</p>
                        {selectedHotelRooms.map(room => {
                          const hotel = hotels.find(h => h.id.toString() === room.hotelId);
                          if (!hotel) return null;
                          const durationData = selectedPackage?.trip_durations?.find(d => d.duration_label === selectedDuration);
                          const nights = computeNights(durationData);
                          const totalHotel = Number(hotel.price) * room.rooms * Math.max(nights, 0);
                          return (
                            <p key={hotel.id} className="text-gray-600 ml-4">- {hotel.hotel_name}: IDR {totalHotel.toLocaleString('id-ID')}</p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xl font-semibold">
                      Total Pembayaran:{" "}
                      <span className="text-gold">
                        IDR {calculateTotalPrice().toLocaleString('id-ID')}
                      </span>
                    </p>
                  </div>
                </div>

                <Button
                  className={`w-full py-6 rounded-lg font-bold text-2xl transition-all duration-300 transform hover:scale-105 ${selectedDuration && selectedDate && tripCount > 0
                      ? "bg-gold text-white hover:bg-gold-dark-20 shadow-lg hover:shadow-xl"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  disabled={!selectedDuration || !selectedDate || tripCount === 0}
                  onClick={handleBooking}
                >
                  BOOK NOW
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Section: Booking Form */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-2/3"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex justify-between mb-4"
            >
              <Badge variant="secondary" className={`${userRegion === "overseas"
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-100/80"
                  : "bg-[#efe6e6] text-gray-700 hover:bg-[#efe6e6]/80"
                }`}>
                {userRegion === "overseas" ? "OVERSEAS" : "DOMESTIC"}
              </Badge>
            </motion.div>
            <div className="grid grid-cols-2 gap-6">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-6"
              >
                {/* <h3 className="text-lg font-semibold">Data Diri Pemesan</h3>
                {isFormAutoFilled && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      ✓ Data telah diisi otomatis dari profil Anda. Form ini dalam mode read-only.
                    </p>
                  </div>
                )} */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="example@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Your address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, country: value }));
                        // Update region based on country
                        setUserRegion(value === "ID" ? "domestic" : "overseas");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={getCountryCallingCode(formData.country)}
                        disabled
                        className="w-1/4 text-center bg-gray-100"
                      />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Nomor telepon"
                        className="w-3/4"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Catatan Tambahan</Label>
                    <div className="space-y-4">
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Catatan Tambahan"
                        className="h-20"
                      />
                      {/* Hotel Section */}
                      {selectedDuration && selectedDate && selectedPackage?.has_hotel && (
                        <div className="space-y-2">
                          <Label>Hotel</Label>
                          <div className="space-y-4">
                            {isLoadingHotels ? (
                              <div className="p-2 text-center text-sm text-gray-500">
                                Loading hotels...
                              </div>
                            ) : hotels.length === 0 ? (
                              <div className="p-2 text-center text-sm text-gray-500">
                                Tidak ada hotel tersedia
                              </div>
                            ) : (
                              hotels.map((hotel) => {
                                const selectedRoom = selectedHotelRooms.find(room => room.hotelId === hotel.id.toString());
                                const currentRooms = selectedRoom?.rooms || 0;
                                const currentPax = selectedRoom?.pax || 0;
                                return (
                                  <div key={hotel.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-1">
                                      <div className="font-medium">{hotel.hotel_name}</div>
                                      <div className="text-sm text-gray-500">
                                        {hotel.hotel_type} - {hotel.occupancy}
                                      </div>
                                      <div className="text-sm text-gold">
                                        IDR {Number(hotel.price).toLocaleString('id-ID')}/malam
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {currentPax} dari {tripCount} pax dialokasikan
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRoomChange(hotel.id.toString(), false)}
                                        disabled={currentRooms <= 0}
                                      >
                                        -
                                      </Button>
                                      <Input
                                        type="number"
                                        value={currentRooms}
                                        readOnly
                                        className="w-16 text-center"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRoomChange(hotel.id.toString(), true)}
                                        disabled={calculateTotalSelectedHotelPax() >= tripCount}
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold">Detail Pesanan</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Durasi</Label>
                    <Select value={selectedDuration} onValueChange={handleDurationChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Durasi" />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedPackage?.trip_durations ? (
                          <div className="p-2 text-center text-sm text-gray-500">
                            Tidak ada durasi tersedia
                          </div>
                        ) : selectedPackage.trip_durations.length === 0 ? (
                          <div className="p-2 text-center text-sm text-gray-500">
                            Tidak ada durasi tersedia untuk paket ini
                          </div>
                        ) : (
                          selectedPackage.trip_durations.map((duration) => (
                            <SelectItem key={duration.id} value={duration.duration_label}>
                              {duration.duration_label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Keberangkatan</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!selectedDuration ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!selectedDuration}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pilih Tanggal"}
                        </Button>
                      </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                        disabled={!selectedDuration ? true : disabledByOperationalDays}
                        initialFocus
                        className="rounded-md border"
                        showOutsideDays={false}
                        captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {selectedPackage?.has_boat && (
                    <>
                      <div className="space-y-2">
                        <Label>Boat</Label>
                        <Select
                          value={selectedBoat}
                          onValueChange={handleBoatChange}
                          disabled={isLoadingBoats}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingBoats ? "Loading boats..." : "Pilih Boat"} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingBoats ? (
                              <div className="p-2 text-center text-sm text-gray-500">
                                Loading boats...
                              </div>
                            ) : filteredBoats.length === 0 ? (
                              <div className="p-2 text-center text-sm text-gray-500">
                                {tripCount > 0 ? "Tidak ada boat yang tersedia untuk jumlah pax ini" : "Tidak ada boat tersedia"}
                              </div>
                            ) : (
                              filteredBoats.map((boat) => (
                                <SelectItem
                                  key={boat.id}
                                  value={boat.id.toString()}
                                  className="flex flex-col items-start"
                                >
                                  <span className="font-medium">{boat.boat_name}</span>
                                  <span className="text-xs text-gray-500">
                                    Kapasitas: {calculateTotalBoatCapacity(boat)} pax
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedBoat && (
                        <div className="space-y-2">
                          <Label>Cabin</Label>
                          <div className="space-y-4">
                            {boats
                              .find(boat => boat.id.toString() === selectedBoat)
                              ?.cabin
                              .filter(cabin => cabin.status === "Aktif")
                              .map((cabin) => (
                                <div key={cabin.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="space-y-1">
                                    <div className="font-medium">{cabin.cabin_name}</div>
                                    <div className="text-sm text-gray-500">
                                      {cabin.bed_type} - {cabin.min_pax}-{cabin.max_pax} pax
                                    </div>
                                    <div className="text-sm text-gold">
                                      Base Price: IDR {Number(cabin.base_price).toLocaleString('id-ID')}
                                      <br />
                                      Additional Price: IDR {Number(cabin.additional_price).toLocaleString('id-ID')}/pax
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCabinPaxChange(cabin.id.toString(), false)}
                                      disabled={!selectedCabins.find(sc => sc.cabinId === cabin.id.toString())?.pax}
                                    >
                                      -
                                    </Button>
                                    <Input
                                      type="number"
                                      value={Math.max(
                                        selectedCabins.find(sc => sc.cabinId === cabin.id.toString())?.pax || 0,
                                        selectedCabins.find(sc => sc.cabinId === cabin.id.toString()) ? cabin.min_pax : 0
                                      )}
                                      readOnly
                                      className="w-16 text-center"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCabinPaxChange(cabin.id.toString(), true)}
                                      disabled={
                                        selectedCabins.find(sc => sc.cabinId === cabin.id.toString())?.pax === cabin.max_pax ||
                                        calculateTotalSelectedPax() >= tripCount
                                      }
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Pax Terpilih: {calculateTotalSelectedPax()} dari {tripCount} pax
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedDuration && selectedDate && (
                    <div className="space-y-2">
                      <Label>Additional Charges</Label>
                      <div className="space-y-2">
                        {getApplicableAdditionalFees().map((fee) => (
                          <div key={fee.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`fee-${fee.id}`}
                                checked={
                                  fee.is_required
                                    ? tripCount >= fee.pax_min && tripCount <= fee.pax_max
                                    : additionalCharges.includes(fee.id.toString())
                                }
                                onChange={(e) => {
                                  if (fee.is_required) return; // Tidak ada perubahan untuk fee required
                                  if (e.target.checked) {
                                    setAdditionalCharges([...additionalCharges, fee.id.toString()]);
                                  } else {
                                    setAdditionalCharges(additionalCharges.filter(id => id !== fee.id.toString()));
                                  }
                                }}
                                readOnly={fee.is_required}
                                className={`rounded focus:ring-gold ${fee.is_required ? 'cursor-not-allowed opacity-50' : 'text-gold'
                                  }`}
                              />
                              <Label htmlFor={`fee-${fee.id}`} className="cursor-pointer flex items-center">
                                <span>{fee.fee_category}</span>
                                {fee.is_required && <sup className="text-red-500 ml-0.5">*</sup>}
                              </Label>
                            </div>
                            <span className="text-gold font-semibold">
                              {fee.price > 0 ? `IDR ${fee.price.toLocaleString('id-ID')}` : ""}
                              {fee.unit === 'per_pax' ? '/pax' : ''}
                              {fee.unit === 'per_5pax' ? '/5 pax' : ''}
                              {fee.unit === 'per_day' ? '/hari' : ''}
                              {fee.unit === 'per_day_guide' ? '/hari' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
