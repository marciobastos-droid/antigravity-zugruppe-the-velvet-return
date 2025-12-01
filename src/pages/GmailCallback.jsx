import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GmailCallback() {
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("A conectar Gmail...");
  const [connectedEmail, setConnectedEmail] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus("error");
        setMessage("Autorização cancelada ou negada");
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Código de autorização não encontrado");
        return;
      }

      try {
        const redirectUri = window.location.origin + '/gmail-callback';
        const response = await base44.functions.invoke('gmailIntegration', {
          action: 'exchangeCode',
          code,
          redirectUri
        });

        if (response.data?.success) {
          setStatus("success");
          setConnectedEmail(response.data.connected_email);
          setMessage("Gmail conectado com sucesso!");
        } else {
          setStatus("error");
          setMessage(response.data?.error || "Erro ao conectar Gmail");
        }
      } catch (error) {
        setStatus("error");
        setMessage(error.message || "Erro na autenticação");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            {status === "processing" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">A processar...</h2>
                <p className="text-slate-600">{message}</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Conectado!</h2>
                <p className="text-slate-600 mb-2">{message}</p>
                {connectedEmail && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                    <Mail className="w-4 h-4" />
                    {connectedEmail}
                  </div>
                )}
                <Link to={createPageUrl("Tools")}>
                  <Button className="w-full">
                    Voltar às Ferramentas
                  </Button>
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Erro</h2>
                <p className="text-slate-600 mb-4">{message}</p>
                <Link to={createPageUrl("Tools")}>
                  <Button variant="outline" className="w-full">
                    Voltar às Ferramentas
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}