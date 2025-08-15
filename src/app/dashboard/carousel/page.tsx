"use client";

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Upload, Plus, Pencil } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CarouselItem {
  id: number;
  title: string;
  description: string;
  order_num: string;
  is_active: string;
  assets: Array<{
    id: number;
    title: string;
    description: string;
    file_url: string;
    original_file_url: string;
    is_external: boolean;
    file_path: string;
    created_at: string;
    updated_at: string;
  }>;
  primary_image: {
    id: number;
    title: string;
    description: string;
    file_url: string;
    original_file_url: string;
    is_external: boolean;
    file_path: string;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}

export default function CarouselAdmin() {
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newOrderNum, setNewOrderNum] = useState("");
  const [newIsActive, setNewIsActive] = useState("1");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editOrderNum, setEditOrderNum] = useState("");
  const [editIsActive, setEditIsActive] = useState("1");
  const [editImageIndex, setEditImageIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCarouselImages();
  }, []);

  const fetchCarouselImages = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest<{ data: CarouselItem[] }>(
        'GET',
        '/api/carousels'
      );
      
      setCarouselItems(response.data || []);
      setMessage(null);
    } catch (error) {
      setMessage({
        text: 'Gagal mengambil data carousel',
        type: 'error'
      });
      console.error('Error fetching carousel:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const addImage = async () => {
    if ((!newImageUrl && !newImageFile) || !newTitle || !newOrderNum || !newIsActive) {
      setMessage({
        text: "Semua field wajib diisi",
        type: "error"
      });
      return;
    }
    try {
      setIsUploading(true);
      let carouselId = null;
      // 1. Submit data utama carousel (tanpa gambar)
      const carouselPayload = {
        title: newTitle,
        order_num: parseInt(newOrderNum),
        is_active: newIsActive === '1',
      };
      const response = await apiRequest('POST', '/api/carousels', carouselPayload);
      // Ambil id dari response (pastikan backend mengembalikan id)

      carouselId = (response as any)?.data?.id ?? null;
      if (!carouselId) throw new Error('Gagal mendapatkan ID carousel');

      // 2. Upload gambar jika ada file
      if (newImageFile) {
        const formData = new FormData();
        formData.append('model_type', 'carousel');
        formData.append('model_id', carouselId.toString());
        formData.append('is_external', '0');
        formData.append('files[]', newImageFile);
        formData.append('file_titles[]', newTitle);
        formData.append('file_descriptions[]', '');
        try {
          await apiRequest('POST', '/api/assets/multiple', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (assetErr: any) {
          // Coba ambil pesan error detail dari response backend
          let errorMsg = assetErr?.message || '';
          if (assetErr?.response?.data) {
            errorMsg += '\n' + JSON.stringify(assetErr.response.data);
          }
          console.error('Error upload asset:', assetErr);
          setMessage({
            text: 'Gagal upload gambar ke assets: ' + errorMsg,
            type: 'error'
          });
          return;
        }
      } else if (newImageUrl) {
        // Jika hanya URL, update carousel dengan assets eksternal
        await apiRequest('PUT', `/api/carousels/${carouselId}`, {
          assets: [
            {
              file_url: newImageUrl,
              title: newTitle,
              is_external: true,
            }
          ]
        });
      }

      setNewImageUrl("");
      setNewImageFile(null);
      setNewTitle("");
      setNewOrderNum("");
      setNewIsActive("1");
      setMessage({
        text: "Gambar berhasil ditambahkan ke carousel",
        type: "success"
      });
      setIsAddDialogOpen(false);
      fetchCarouselImages();
    } catch (error) {
      setMessage({
        text: "Gagal menambahkan gambar ke carousel",
        type: "error"
      });
      console.error("Error adding image:", error);
    } finally {
      setIsUploading(false);
    }
  };
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      setNewImageUrl(URL.createObjectURL(file)); // Tampilkan preview lokal
    }
  };

  const editImage = async () => {
    if (
      editImageIndex === null ||
      !editImageUrl ||
      !editTitle ||
      !editOrderNum ||
      !editIsActive
    ) {
      setMessage({
        text: "Semua field wajib diisi",
        type: "error"
      });
      return;
    }
    try {
      setIsUploading(true);
      const currentItem = carouselItems[editImageIndex!];
      await apiRequest('PUT', `/api/carousels/${currentItem.id}`, {
        title: editTitle,
        order_num: parseInt(editOrderNum),
        is_active: editIsActive === '1',
        assets: [
          {
            file_url: editImageUrl,
            title: editTitle,
            is_external: true,
          }
        ]
      });
      setMessage({
        text: "Gambar berhasil diperbarui",
        type: "success"
      });
      setIsEditDialogOpen(false);
      fetchCarouselImages();
    } catch (error) {
      setMessage({
        text: "Gagal memperbarui gambar",
        type: "error"
      });
      console.error("Error editing image:", error);
    } finally {
      setIsUploading(false);
      setEditImageIndex(null);
      setEditImageUrl("");
      setEditTitle("");
      setEditOrderNum("");
      setEditIsActive("1");
    }
  };

  const removeImage = async (carouselItem: CarouselItem) => {
    try {
      await apiRequest('DELETE', `/api/carousels/${carouselItem.id}`);
      setCarouselItems(carouselItems.filter((item) => item.id !== carouselItem.id));
      setMessage({
        text: "Gambar berhasil dihapus dari carousel",
        type: "success"
      });
    } catch (error) {
      setMessage({
        text: "Gagal menghapus gambar dari carousel",
        type: "error"
      });
      console.error("Error removing image:", error);
    }
  };
  
  const handleEditClick = (carouselItem: CarouselItem, index: number) => {
    if (!carouselItem.primary_image) {
      setMessage({
        text: "Item tidak memiliki primary image untuk diedit",
        type: "error"
      });
      return;
    }
    setEditImageUrl(carouselItem.primary_image.file_url);
    setEditTitle(carouselItem.title);
    setEditOrderNum(carouselItem.order_num);
    setEditIsActive(carouselItem.is_active);
    setEditImageIndex(index);
    setIsEditDialogOpen(true);
  };
  
  // Tidak perlu handle file upload, hanya gunakan URL gambar
  // Jika ingin preview, user bisa paste URL gambar

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Kelola Gambar Carousel</h1>

      {message && (
        <div className={`p-4 mb-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button 
            className="float-right" 
            onClick={() => setMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex mb-8 gap-4">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Tambah Gambar Baru
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Memuat gambar carousel...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {carouselItems.map((carouselItem, index) => (
            <Card key={carouselItem.id} className="overflow-hidden">
                              <div className="relative aspect-video">
                  <Image
                    src={carouselItem.primary_image?.file_url || carouselItem.assets?.[0]?.file_url || '/img/default-trip.jpg'}
                    alt={`Carousel image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {carouselItem.assets?.length || 0} assets
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    ID: {carouselItem.id}
                  </div>
                </div>
              <CardContent className="p-4">
                                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm mb-1 truncate">
                        {carouselItem.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {carouselItem.description}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Order: {carouselItem.order_num}</span>
                        <span>|</span>
                        <span>Status: {carouselItem.is_active === '1' ? 'Active' : 'Inactive'}</span>
                        <span>|</span>
                        <span className={carouselItem.primary_image ? 'text-green-600' : 'text-red-600'}>
                          {carouselItem.primary_image ? 'Has Image' : 'No Image'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Assets: {carouselItem.assets?.length || 0} | Primary: {carouselItem.primary_image ? 'Yes' : 'No'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(carouselItem, index)}
                            disabled={!carouselItem.primary_image}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeImage(carouselItem)}
                            disabled={!carouselItem.primary_image}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {carouselItems.length === 0 && !isLoading && (
        <div className="text-center py-10 border rounded-lg">
          <p className="text-muted-foreground">Belum ada gambar carousel.</p>
          <p className="text-muted-foreground">
            Tambahkan gambar pertama dengan tombol di atas.
          </p>
        </div>
      )}

      {/* Modal tambah gambar */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Gambar Carousel Baru</DialogTitle>
            <DialogDescription>
              Masukkan data gambar carousel.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Judul"
              className="w-full mb-2"
            />
            <Input
              value={newOrderNum}
              onChange={e => setNewOrderNum(e.target.value)}
              placeholder="Urutan (order_num)"
              className="w-full mb-2"
              type="number"
            />
            <div className="mb-2">
              <label className="mr-2">Status:</label>
              <select
                value={newIsActive}
                onChange={e => setNewIsActive(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="1">Aktif</option>
                <option value="0">Tidak Aktif</option>
              </select>
            </div>
            <Input
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              placeholder="Masukkan URL gambar"
              className="w-full mb-2"
            />
            <p className="text-xs text-muted-foreground mb-4">atau</p>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Unggah Gambar
              </Button>
            </div>
            {newImageUrl && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image
                  src={newImageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewImageUrl("");
                setNewTitle("");
                setNewOrderNum("");
                setNewIsActive("1");
                setIsAddDialogOpen(false);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={addImage}
              disabled={isUploading}
            >
              {isUploading ? "Menambahkan..." : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal edit gambar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gambar Carousel</DialogTitle>
            <DialogDescription>
              Ubah data gambar carousel.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Judul"
              className="w-full mb-2"
            />
            <Input
              value={editOrderNum}
              onChange={e => setEditOrderNum(e.target.value)}
              placeholder="Urutan (order_num)"
              className="w-full mb-2"
              type="number"
            />
            <div className="mb-2">
              <label className="mr-2">Status:</label>
              <select
                value={editIsActive}
                onChange={e => setEditIsActive(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="1">Aktif</option>
                <option value="0">Tidak Aktif</option>
              </select>
            </div>
            <Input
              value={editImageUrl}
              onChange={e => setEditImageUrl(e.target.value)}
              placeholder="Masukkan URL gambar baru"
              className="w-full mb-2"
            />
            <p className="text-xs text-muted-foreground mb-4">atau</p>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Unggah Gambar Baru
              </Button>
            </div>
            {editImageUrl && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image
                  src={editImageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditImageUrl("");
                setEditTitle("");
                setEditOrderNum("");
                setEditIsActive("1");
                setEditImageIndex(null);
                setIsEditDialogOpen(false);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={editImage}
              disabled={isUploading}
            >
              {isUploading ? "Memperbarui..." : "Perbarui"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

