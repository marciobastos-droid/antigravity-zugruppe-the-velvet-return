import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, ExternalLink } from "lucide-react";

export default function GoogleDriveUploader({ onUploadSuccess, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um ficheiro primeiro");
      return;
    }

    setUploading(true);

    try {
      // First upload to Base44 storage
      const { data: uploadData } = await base44.functions.invoke('uploadFile', {
        file: file
      });

      if (!uploadData?.file_url) {
        throw new Error('Failed to upload file to storage');
      }

      // Then upload to Google Drive
      const { data } = await base44.functions.invoke('uploadToGoogleDrive', {
        file_url: uploadData.file_url,
        filename: file.name,
        mimeType: file.type
      });

      if (data.success) {
        setUploadedFile(data.file);
        toast.success("Ficheiro enviado para Google Drive!");
        
        if (onUploadSuccess) {
          onUploadSuccess({
            name: data.file.name,
            drive_id: data.file.id,
            drive_link: data.file.webViewLink,
            mime_type: data.file.mimeType
          });
        }

        // Reset
        setFile(null);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.message?.includes('not connected')) {
        toast.error("Google Drive não está conectado. Autorize o acesso primeiro.");
      } else {
        toast.error("Erro ao enviar para Google Drive: " + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M8.5 2.5L1.5 13.5 8.5 21.5 15.5 13.5z"/>
            <path fill="#34A853" d="M15.5 2.5L8.5 13.5 15.5 21.5 22.5 13.5z"/>
            <path fill="#FBBC04" d="M8.5 13.5L1.5 21.5H15.5z"/>
          </svg>
          Upload para Google Drive
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="driveFile" className="text-xs">Selecionar Ficheiro</Label>
          <Input
            id="driveFile"
            type="file"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            className="mt-1"
          />
        </div>

        {file && (
          <div className="text-xs text-slate-600 bg-white p-2 rounded border">
            📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}

        {uploadedFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900">{uploadedFile.name}</p>
                <a
                  href={uploadedFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                >
                  Ver no Google Drive <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading || disabled}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A enviar...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar para Drive
            </>
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          O ficheiro será guardado no seu Google Drive
        </p>
      </CardContent>
    </Card>
  );
}