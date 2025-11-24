import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContextualTip({ tip, onDismiss }) {
  if (!tip) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-40 max-w-sm"
      >
        <Card className="shadow-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 mb-1">💡 Dica</h4>
                <p className="text-sm text-slate-700">{tip.message}</p>
                {tip.action && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={tip.action}
                  >
                    {tip.actionLabel}
                  </Button>
                )}
              </div>
              <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}