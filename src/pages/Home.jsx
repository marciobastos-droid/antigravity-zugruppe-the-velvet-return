import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Home() {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingBrand, setEditingBrand] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  // Menu CRM
  const menuItems = [
  {
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop",
    title: "Dashboard",
    path: "Dashboard"
  },
  {
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
    title: "Imóveis",
    path: "MyListings"
  },
  {
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
    title: "Navegar",
    path: "Browse"
  },
  {
    image: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400&h=300&fit=crop",
    title: "Contactos",
    path: "CRMAdvanced"
  },
  {
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
    title: "Ferramentas",
    path: "Tools"
  }];


  // Marcas da empresa - carregadas da base de dados
  const { data: brandItems = [], refetch: refetchBrands } = useQuery({
    queryKey: ['brandItems'],
    queryFn: () => base44.entities.BrandItem.list('order')
  });

  const handleEditBrand = (brand) => {
    setEditingBrand({ ...brand });
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingBrand((prev) => ({ ...prev, image: file_url }));
      toast.success("Imagem carregada");
    } catch (error) {
      toast.error("Erro ao carregar imagem");
    }
    setUploading(false);
  };

  const handleSaveBrand = async () => {
    try {
      await base44.entities.BrandItem.update(editingBrand.id, {
        title: editingBrand.title,
        image: editingBrand.image,
        url: editingBrand.url
      });
      refetchBrands();
      setEditDialogOpen(false);
      setEditingBrand(null);
      toast.success("Marca atualizada");
    } catch (error) {
      toast.error("Erro ao guardar marca");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8 sm:mb-12">

        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
          alt="Zugruppe"
          className="h-28 sm:h-40 md:h-56 w-auto mx-auto" />

      </motion.div>

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-center mb-10">

        <h1 className="text-[#27251f] mb-2 text-base font-semibold md:text-3xl">

        </h1>
        <p className="text-[#27251f]/60"></p>
      </motion.div>

      {/* Menu CRM Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-5xl w-full">

        {menuItems.map((item, index) =>
        <Link
          key={item.path}
          to={createPageUrl(item.path)}
          className="group">

            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
            className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">

              <div className="aspect-[4/3] overflow-hidden">
                <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />

              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#27251f]/80 via-[#27251f]/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-center">
                <h3 className="text-white font-semibold text-xs sm:text-sm md:text-base">{item.title}</h3>
              </div>
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#4cb5f5] rounded-lg sm:rounded-xl transition-colors duration-300"></div>
            </motion.div>
          </Link>
        )}
      </motion.div>

      {/* Marcas da Empresa */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8 sm:mt-12 text-center">

        <h2 className="text-base sm:text-lg font-medium text-[#27251f]/60 mb-4 sm:mb-6"></h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-5xl w-full">

        {brandItems.map((item, index) =>
        <div key={item.id} className="relative group">
            <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer">

              <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index + 0.7 }}
              className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">

                <div className="aspect-[4/3] overflow-hidden">
                  <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />

                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#4cb5f5] rounded-xl transition-colors duration-300"></div>
              </motion.div>
            </a>
            {isAdmin &&
          <button
            onClick={(e) => {e.preventDefault();handleEditBrand(item);}}
            className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">

                <Settings className="w-4 h-4 text-[#27251f]" />
              </button>
          }
          </div>
        )}
      </motion.div>

      {/* Edit Brand Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Marca</DialogTitle>
          </DialogHeader>
          {editingBrand &&
          <div className="space-y-4 mt-4">
              <div>
                <Label>Imagem</Label>
                <div className="mt-2 flex items-center gap-4">
                  <img
                  src={editingBrand.image}
                  alt="Preview"
                  className="w-24 h-18 object-cover rounded-lg" />

                  <div>
                    <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="brand-image-upload" />

                    <label htmlFor="brand-image-upload">
                      <Button variant="outline" size="sm" asChild disabled={uploading}>
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          {uploading ? "A carregar..." : "Alterar Imagem"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <Label>Nome da Marca</Label>
                <Input
                value={editingBrand.title}
                onChange={(e) => setEditingBrand((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nome da marca" />

              </div>
              <div>
                <Label>URL (link externo)</Label>
                <Input
                value={editingBrand.url}
                onChange={(e) => setEditingBrand((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://..." />

              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveBrand} className="flex-1 bg-[#4cb5f5] hover:bg-[#3da5e5]">
                  Guardar
                </Button>
              </div>
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-10 sm:mt-16 text-center px-4">

        <p className="text-[#27251f]/40 text-xs sm:text-sm">© 2025 ZuGruppe - The Velvet Return

        </p>
      </motion.footer>
    </div>);

}