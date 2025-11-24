import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

export default function DocumentViewerDialog({ document, open, onOpenChange }) {
  if (!document) return null;

  // Simple check for image types
  const isImage = document.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  const isPDF = document.url?.match(/\.pdf$/i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>{document.name}</DialogTitle>
            <div className="flex gap-2">
              <a href={document.url} download target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </a>
              <a href={document.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir
                </Button>
              </a>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden mt-4 relative">
          {isImage ? (
            <img 
              src={document.url} 
              alt={document.name} 
              className="w-full h-full object-contain"
            />
          ) : isPDF ? (
            <iframe 
              src={`${document.url}#toolbar=0`} 
              className="w-full h-full"
              title={document.name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="mb-4">Pré-visualização não disponível para este tipo de ficheiro.</p>
              <a href={document.url} target="_blank" rel="noopener noreferrer">
                <Button>Download para visualizar</Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}