"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { motion } from "framer-motion";
import { User, Mail, MapPin, Phone, Globe, Calendar, Shield, CheckCircle2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
// @ts-expect-error: No types for country-telephone-data
import { allCountries } from "country-telephone-data";

// Inisialisasi daftar negara
countries.registerLocale(enLocale);
const countryList = countries.getNames("en", { select: "official" });
const countryOptions = Object.entries(countryList).map(([code, name]) => ({
  value: code,
  label: name,
}));

// Helper untuk mendapatkan nama negara dari country code
function getCountryName(countryCode: string): string {
  if (!countryCode) return "";
  const country = countryOptions.find(opt => opt.value === countryCode.toUpperCase());
  return country ? country.label : countryCode;
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

// Helper untuk parse phone number (memisahkan country code dari nomor)
function parsePhoneNumber(phoneNumber: string, countryCode: string): string {
  if (!phoneNumber) return "";
  
  const callingCode = getCountryCallingCode(countryCode);
  if (!callingCode) return phoneNumber;
  
  // Jika phone number sudah dimulai dengan country calling code, hapus
  if (phoneNumber.startsWith(callingCode)) {
    return phoneNumber.substring(callingCode.length).trim();
  }
  
  // Jika phone number dimulai dengan +, coba parse
  if (phoneNumber.startsWith("+")) {
    const sortedCountries = [...allCountries].sort((a: { dialCode: string }, b: { dialCode: string }) => 
      b.dialCode.length - a.dialCode.length
    );
    
    const matchedCountry = sortedCountries.find((c: { dialCode: string }) => 
      phoneNumber.startsWith(`+${c.dialCode}`)
    );
    if (matchedCountry) {
      return phoneNumber.substring(matchedCountry.dialCode.length + 1).trim();
    }
  }
  
  return phoneNumber;
}

// Form schema
const profileFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  alamat: z.string().min(1, { message: "Address is required." }),
  no_hp: z
    .string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\d+$/, { message: "Phone number must contain only digits." }),
  nasionality: z.string().min(1, { message: "Please select a nationality." }),
});

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  customer?: {
    id: number;
    user_id: number;
    alamat: string;
    no_hp: string;
    nasionality: string;
    region: "domestic" | "overseas";
    status: string;
    created_at: string;
    updated_at: string;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const router = useRouter();

  // Initialize form
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      alamat: "",
      no_hp: "",
      nasionality: "",
    },
  });

  // Watch form changes
  const formValues = form.watch();

  // Load user data from localStorage
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const userDataString = localStorage.getItem('user');
    if (!userDataString) {
      router.push('/auth/login');
      return;
    }

    try {
      const data = JSON.parse(userDataString);
      setUserData(data);
      
      // Set form default values
      if (data.customer) {
        const countryCode = getCountryCodeFromName(data.customer.nasionality);
        const phoneNumber = parsePhoneNumber(data.customer.no_hp, countryCode);
        
        const formData = {
          name: data.name || data.customer.user?.name || "",
          email: data.email || data.customer.user?.email || "",
          alamat: data.customer.alamat || "",
          no_hp: phoneNumber || "",
          nasionality: countryCode || data.customer.nasionality || "",
        };
        
        form.reset(formData);
        setInitialFormData(formData);
      } else {
        const formData = {
          name: data.name || "",
          email: data.email || "",
          alamat: "",
          no_hp: "",
          nasionality: "",
        };
        form.reset(formData);
        setInitialFormData(formData);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  }, [router, form]);

  // Check for changes
  useEffect(() => {
    if (initialFormData) {
      const currentData = {
        name: formValues.name || "",
        email: formValues.email || "",
        alamat: formValues.alamat || "",
        no_hp: formValues.no_hp || "",
        nasionality: formValues.nasionality || "",
      };
      
      const changed = JSON.stringify(currentData) !== JSON.stringify(initialFormData);
      setHasChanges(changed);
    }
  }, [formValues, initialFormData]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    try {
      setIsSubmitting(true);

      // Determine region based on nationality
      const region = values.nasionality === "ID" ? "domestic" : "overseas";

      // Prepare phone number with country code
      const countryCallingCode = getCountryCallingCode(values.nasionality);
      const fullPhoneNumber = countryCallingCode ? `${countryCallingCode}${values.no_hp}` : values.no_hp;

      // Update user data
      const updateUserData = {
        name: values.name,
        email: values.email,
      };

      // Update customer data if exists
      if (userData?.customer) {
        const updateCustomerData = {
          alamat: values.alamat,
          no_hp: fullPhoneNumber,
          nasionality: values.nasionality,
          region: region,
        };

        // Update customer via API
        await apiRequest("PUT", `/api/customers/${userData.customer.id}`, updateCustomerData);
      } else {
        // Create customer if doesn't exist
        const createCustomerData = {
          alamat: values.alamat,
          no_hp: fullPhoneNumber,
          nasionality: values.nasionality,
          region: region,
        };

        await apiRequest("POST", "/api/customers", createCustomerData);
      }

      // Update user via API
      // Backend akan mengecek apakah user update profil sendiri atau user lain
      // Jika update profil sendiri: tidak perlu permission
      // Jika update user lain: akan dicek permission di controller
      if (!userData?.id) {
        throw new Error("User ID tidak ditemukan");
      }

      // Pastikan ID yang dikirim adalah ID user yang sedang login (untuk keamanan)
      await apiRequest("PUT", `/api/users/${userData.id}`, updateUserData);

      // Update localStorage
      if (userData) {
        const updatedUserData: UserData = {
          ...userData,
          name: values.name,
          email: values.email,
          customer: userData.customer ? {
            ...userData.customer,
            alamat: values.alamat,
            no_hp: fullPhoneNumber,
            nasionality: values.nasionality,
            region: region,
          } : undefined,
        };

        localStorage.setItem('user', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
      }
      setInitialFormData(values);
      setHasChanges(false);

      toast.success("Profile berhasil diperbarui!");
    } catch (error) {
      console.error("Profile update error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui profile. Silakan coba lagi.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Profile Saya
          </h1>
          <p className="text-gray-600">
            Informasi akun dan profil Anda
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="p-6 bg-white border border-gray-200 shadow-md">
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-gold-dark-20 flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  {userData.customer && (
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1.5 border-4 border-white">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
                  {userData.name || userData.customer?.user?.name || "User"}
                </h2>
                <p className="text-sm text-gray-600 text-center mb-3">
                  {userData.email || userData.customer?.user?.email || ""}
                </p>
                {userData.customer && (
                  <Badge 
                    variant="secondary" 
                    className={`${
                      userData.customer.region === "domestic" 
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100/80" 
                        : "bg-purple-100 text-purple-700 hover:bg-purple-100/80"
                    }`}
                  >
                    {userData.customer.region === "domestic" ? "Domestic" : "Overseas"}
                  </Badge>
                )}
              </div>

              {/* Account Status */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Status Akun</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <Shield className="w-3 h-3 mr-1" />
                    Aktif
                  </Badge>
                </div>
                {userData.customer?.created_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Bergabung {new Date(userData.customer.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Information Cards - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Profile Form */}
            <Card className="p-6 bg-white border border-gray-200 shadow-md">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Profile</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Nama Lengkap
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nama lengkap" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Masukkan email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Address */}
                    <FormField
                      control={form.control}
                      name="alamat"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Alamat
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan alamat lengkap" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone Number */}
                    <FormField
                      control={form.control}
                      name="no_hp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Nomor Telepon
                          </FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input
                                value={getCountryCallingCode(form.watch("nasionality"))}
                                disabled
                                className="w-1/4 text-center bg-gray-100"
                              />
                              <Input
                                placeholder="Nomor telepon"
                                {...field}
                                className="w-3/4"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nationality */}
                    <FormField
                      control={form.control}
                      name="nasionality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Kebangsaan
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih kebangsaan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countryOptions.map((country) => (
                                <SelectItem key={country.value} value={country.value}>
                                  {country.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Region Display */}
                  {form.watch("nasionality") && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Region:</span>{" "}
                        {form.watch("nasionality") === "ID" ? "Domestic" : "Overseas"}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  {hasChanges && (
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          form.reset(initialFormData);
                          setHasChanges(false);
                        }}
                        disabled={isSubmitting}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gold text-white hover:bg-gold-dark-20"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </Card>

            {/* Info Message */}
            {!userData.customer && (
              <Card className="p-6 bg-yellow-50 border border-yellow-200">
                <div className="flex items-start gap-4">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-1">Profil Belum Lengkap</h4>
                    <p className="text-sm text-yellow-700">
                      Silakan lengkapi data profil di atas dan klik "Simpan Perubahan" untuk menyimpan.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

