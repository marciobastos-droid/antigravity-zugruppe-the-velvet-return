import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Check } from "lucide-react";
import CreateAppointmentDialog from "../calendar/CreateAppointmentDialog";
import { useLocalization } from "../i18n/LocalizationContext";

export default function QuickAppointmentButton({ propertyId, opportunityId, variant = "outline", size = "sm", onSuccess }) {
  const { t } = useLocalization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [appointmentCreated, setAppointmentCreated] = useState(false);

  React.useEffect(() => {
    if (appointmentCreated) {
      const timer = setTimeout(() => setAppointmentCreated(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [appointmentCreated]);

  const handleSuccess = () => {
    console.log('[QuickAppointmentButton] Appointment created successfully');
    
    // Call parent callback first
    if (onSuccess) {
      console.log('[QuickAppointmentButton] Calling onSuccess callback');
      onSuccess();
    }
    
    // Then show local confirmation
    setAppointmentCreated(true);
  };

  if (appointmentCreated) {
    return (
      <div className="text-center py-8 bg-green-50 rounded-lg border-2 border-green-200">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h5 className="text-lg font-semibold text-green-900 mb-1">{t('contact.visitScheduled')}</h5>
        <p className="text-sm text-green-700">{t('contact.visitConfirmation')}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => setAppointmentCreated(false)}
        >
          {t('contact.scheduleAnother')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className="w-full"
      >
        <Calendar className="w-4 h-4 mr-2" />
        {t('property.details.scheduleViewing')}
      </Button>

      <CreateAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyId={propertyId}
        opportunityId={opportunityId}
        onSuccess={handleSuccess}
      />
    </>
  );
}