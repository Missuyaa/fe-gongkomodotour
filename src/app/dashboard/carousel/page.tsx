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

export default function CarouselAdmin() {
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
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
      const response = await apiRequest<{ data: string[] }>(
        'GET',
        '/api/carousels'
      );
      setImages(response.data || []);
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
    if (!newImageUrl) return;

    try {
      setIsUploading(true);
      await apiRequest('POST', '/api/carousels', { imageUrl: newImageUrl });
      setNewImageUrl("");
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

  const editImage = async () => {
    if (!editImageUrl || editImageIndex === null) return;

    try {
      setIsUploading(true);
      const oldImageUrl = images[editImageIndex!];
      await apiRequest('PUT', '/api/carousels/edit', {
        oldImageUrl,
        newImageUrl: editImageUrl
      });
      const newImages = [...images];
      newImages[editImageIndex!] = editImageUrl;
      setImages(newImages);
      setMessage({
        text: "Gambar berhasil diperbarui",
        type: "success"
      });
      setIsEditDialogOpen(false);
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
    }
  };

  const removeImage = async (imageUrl: string) => {
    try {
      await apiRequest('DELETE', '/api/carousels', { imageUrl });
      setImages(images.filter((img) => img !== imageUrl));
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
  
  const handleEditClick = (imageUrl: string, index: number) => {
    setEditImageUrl(imageUrl);
    setEditImageIndex(index);
    setIsEditDialogOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Untuk demo, gunakan URL.createObjectURL
      // Pada implementasi sebenarnya, Anda akan upload file ke server/storage
      const tempUrl = URL.createObjectURL(file);
      if (isEditDialogOpen && editImageIndex !== null) {
        setEditImageUrl(tempUrl);
      } else {
        setNewImageUrl(tempUrl);
      }
    }
  };

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
          {images.map((image, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="relative aspect-video">
                <Image
                  src={typeof image === 'string' ? image : image.link || ''}
                  alt={`Carousel image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[200px]">
                    {typeof image === 'string'
                      ? image.split("/").pop()
                      : image.title || image.link || 'Gambar'}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(image, index)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(typeof image === 'string' ? image : image.link)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && !isLoading && (
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
              Masukkan URL gambar atau unggah file gambar untuk ditambahkan ke carousel.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Masukkan URL gambar"
                className="w-full mb-2"
              />
              <p className="text-xs text-muted-foreground mb-4">atau</p>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
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
                setIsAddDialogOpen(false);
              }}
            >
              Batal
            </Button>
            <Button 
              onClick={addImage}
              disabled={!newImageUrl || isUploading}
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
              Ubah URL gambar atau unggah file gambar baru.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Input
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder="Masukkan URL gambar baru"
                className="w-full mb-2"
              />
              <p className="text-xs text-muted-foreground mb-4">atau</p>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
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
                setEditImageIndex(null);
                setIsEditDialogOpen(false);
              }}
            >
              Batal
            </Button>
            <Button 
              onClick={editImage}
              disabled={!editImageUrl || isUploading}
            >
              {isUploading ? "Memperbarui..." : "Perbarui"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

