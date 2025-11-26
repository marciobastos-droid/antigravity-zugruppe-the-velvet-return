import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const menuItems = [
    {
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
      title: "Imóveis",
      path: "MyListings"
    },
    {
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop",
      title: "Explorar",
      path: "Browse"
    },
    {
      image: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400&h=300&fit=crop",
      title: "Clientes",
      path: "ClientPreferences"
    },
    {
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
      title: "Dashboard",
      path: "Dashboard"
    },
    {
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
      title: "Oportunidades",
      path: "Opportunities"
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg"
          alt="Zugruppe"
          className="h-28 md:h-36 w-auto mx-auto"
        />
      </motion.div>

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl md:text-3xl font-semibold text-[#27251f] mb-2">
          {user ? `Olá, ${user.full_name?.split(' ')[0] || 'Bem-vindo'}!` : 'Bem-vindo'}
        </h1>
        <p className="text-[#27251f]/60">Escolha uma opção para continuar</p>
      </motion.div>

      {/* Menu Grid with Images */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl w-full"
      >
        {menuItems.map((item, index) => (
          <Link 
            key={item.path} 
            to={createPageUrl(item.path)}
            className="group"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#27251f]/80 via-[#27251f]/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                <h3 className="text-white font-semibold text-sm md:text-base">{item.title}</h3>
              </div>
              {/* Hover accent */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#4cb5f5] rounded-xl transition-colors duration-300"></div>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-16 text-center"
      >
        <p className="text-[#27251f]/40 text-sm">
          © 2025 Zugruppe - Privileged Approach
        </p>
      </motion.footer>
    </div>
  );
}