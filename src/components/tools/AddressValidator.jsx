import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AddressValidator({ 
  address, 
  city, 
  state, 
  country, 
  postalCode,
  onValidated 
}) {
  const [validating, setValidating] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState(null);

  const handleValidate = async () => {
    if (!address && !city) {
      toast.error("Adicione pelo menos uma morada ou cidade");
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const { data } = await base44.functions.invoke('geocodeAddress', {
        address,
        city,
        state,
        country,
        postalCode
      });

      setValidationResult(data);

      if (data.success) {
        toast.success("Morada validada com sucesso");
        if (onValidated) {
          onValidated({
            latitude: data.coordinates.latitude,
            longitude: data.coordinates.longitude,
            formattedAddress: data.formattedAddress,
            ...data.details
          });
        }
      } else {
        toast.warning("Morada não encontrada");
      }
    } catch (error) {
      toast.error("Erro ao validar morada");
      setValidationResult({ 
        success: false, 
        message: error.message 
      });
    }

    setValidating(false);
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleValidate}
        variant="outline"
        size="sm"
        disabled={validating || (!address && !city)}
        className="w-full"
      >
        {validating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A validar...
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4 mr-2" />
            Validar e Geocodificar Morada
          </>
        )}
      </Button>

      {validationResult && (
        <Card className={validationResult.success ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              {validationResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                {validationResult.success ? (
                  <div className="space-y-1">
                    <p className="font-medium text-green-900">Morada Validada</p>
                    <p className="text-green-700">{validationResult.formattedAddress}</p>
                    <div className="text-xs text-green-600 mt-2">
                      <p>Coordenadas: {validationResult.coordinates.latitude.toFixed(6)}, {validationResult.coordinates.longitude.toFixed(6)}</p>
                      <p>Confiança: {Math.round(validationResult.confidence * 100)}%</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-amber-900">Morada Não Encontrada</p>
                    <p className="text-amber-700 text-xs mt-1">
                      Verifique se a morada está correta e tente novamente
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}