import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, TrendingUp, TrendingDown, Users, Building2, Target, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FocusMode({ 
  isOpen, 
  onClose, 
  metrics,
  urgentItems = []
}) {
  if (!isOpen) return null;

  const { 
    totalProperties = 0, 
    activeProperties = 0,
    totalLeads = 0, 
    newLeads = 0, 
    conversionRate = 0,
    closedLeads = 0,
    hotLeads = 0
  } = metrics || {};

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-4xl"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Modo Foco</h2>
              <p className="text-slate-400">Informações cruciais de relance</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-slate-800"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Main KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Building2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-4xl font-bold text-white">{activeProperties}</p>
                <p className="text-sm text-slate-400">Imóveis Ativos</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-4xl font-bold text-white">{newLeads}</p>
                <p className="text-sm text-slate-400">Novos Leads</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Target className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-4xl font-bold text-white">{conversionRate}%</p>
                <p className="text-sm text-slate-400">Conversão</p>
              </CardContent>
            </Card>

            <Card className={`border-slate-700 ${hotLeads > 0 ? 'bg-red-900/50' : 'bg-slate-800'}`}>
              <CardContent className="p-6 text-center">
                <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${hotLeads > 0 ? 'text-red-400' : 'text-green-400'}`} />
                <p className="text-4xl font-bold text-white">{hotLeads}</p>
                <p className="text-sm text-slate-400">Leads Hot 🔥</p>
              </CardContent>
            </Card>
          </div>

          {/* Urgent Actions */}
          {urgentItems.length > 0 && (
            <Card className="bg-amber-900/30 border-amber-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Ações Urgentes
                </h3>
                <div className="space-y-3">
                  {urgentItems.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-white">
                      <div className={`w-2 h-2 rounded-full ${
                        item.priority === 'high' ? 'bg-red-500' : 
                        item.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      <span className="text-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Summary */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-slate-800/50">
              <p className="text-2xl font-bold text-green-400">{closedLeads}</p>
              <p className="text-xs text-slate-400">Fechados este mês</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <p className="text-2xl font-bold text-blue-400">{totalProperties}</p>
              <p className="text-xs text-slate-400">Total Imóveis</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <p className="text-2xl font-bold text-purple-400">{totalLeads}</p>
              <p className="text-xs text-slate-400">Total Leads</p>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            Pressione ESC ou clique no X para sair
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}