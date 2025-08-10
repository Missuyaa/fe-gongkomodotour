"use client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiRequest } from "@/lib/api"

const testimonialSchema = z.object({
  customer_name: z.string().min(1, "Nama customer harus diisi"),
  customer_email: z.string().email("Email harus valid"),
  customer_phone: z.string().min(1, "Nomor telepon harus diisi"),
  trip_id: z.string().optional(),
  rating: z.enum(["1", "2", "3", "4", "5"], {
    required_error: "Rating harus dipilih"
  }),
  review: z.string().min(1, "Review harus diisi"),
  is_approved: z.enum(["true", "false"]),
  is_highlight: z.enum(["true", "false"]),
  source: z.enum(["internal", "external"], {
    required_error: "Source harus dipilih"
  }),
})

export default function CreateTestimonialPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: z.infer<typeof testimonialSchema> = {
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    trip_id: "",
    rating: "5",
    review: "",
    is_approved: "true",
    is_highlight: "false",
    source: "internal",
  }

  const form = useForm<z.infer<typeof testimonialSchema>>({
    resolver: zodResolver(testimonialSchema),
    defaultValues
  })

  const onSubmit = async (values: z.infer<typeof testimonialSchema>) => {
    try {
      setIsSubmitting(true)
      
      const payload = {
        ...values,
        trip_id: values.trip_id ? parseInt(values.trip_id) : null,
        rating: parseInt(values.rating),
        is_approved: values.is_approved === "true",
        is_highlight: values.is_highlight === "true"
      }
      
      console.log('Final payload:', payload)
      
      const response = await apiRequest(
        'POST',
        '/api/testimonials',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('API Response:', response)

      if (!response) {
        throw new Error('Response tidak valid dari server')
      }

      toast.success("Testimonial berhasil dibuat")
      router.push("/dashboard/testimonials")
      router.refresh()
    } catch (error: unknown) {
      console.error('Error detail:', error)
      toast.error("Gagal membuat testimonial")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tambah Testimonial Baru</h1>
          <p className="text-gray-500 mt-2">Isi informasi testimonial dengan lengkap</p>
        </div>

        <div className="mx-auto bg-white rounded-xl shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
              <div className="space-y-8">
                {/* Informasi Customer */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Informasi Customer</h2>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="customer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Customer</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nama customer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Customer</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="Masukkan email customer" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Telepon</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nomor telepon" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="internal">Internal</SelectItem>
                              <SelectItem value="external">External</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Informasi Trip */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Informasi Trip</h2>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="trip_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trip ID (Opsional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="Masukkan ID trip (opsional)" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Informasi Testimonial */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Informasi Testimonial</h2>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rating</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih rating" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 Bintang</SelectItem>
                              <SelectItem value="2">2 Bintang</SelectItem>
                              <SelectItem value="3">3 Bintang</SelectItem>
                              <SelectItem value="4">4 Bintang</SelectItem>
                              <SelectItem value="5">5 Bintang</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_approved"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status Approval</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Approved</SelectItem>
                              <SelectItem value="false">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_highlight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Highlight</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih highlight" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Ya</SelectItem>
                              <SelectItem value="false">Tidak</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="review"
                    render={({ field }) => (
                      <FormItem className="mt-6">
                        <FormLabel>Review</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan review customer"
                            className="min-h-[150px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/testimonials")}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
