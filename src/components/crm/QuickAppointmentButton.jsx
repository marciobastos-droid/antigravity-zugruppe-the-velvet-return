import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Check } from "lucide-react";
import CreateAppointmentDialog from "../calendar/CreateAppointmentDialog";

export default function QuickAppointmentButton({ propertyId, opportunityId, variant = "outline", size = "sm" }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [appointmentCreated, setAppointmentCreated] = useState(false);

  React.useEffect(() => {
    if (appointmentCreated) {
      const timer = setTimeout(() => setAppointmentCreated(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [appointmentCreated]);

  if (appointmentCreated) {
    return (
      <div className="text-center py-6 bg-green-50 rounded-lg border-2 border-green-200">
        <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
        <h5 className="font-semibold text-green-900">Visita Agendada!</h5>
        <p className="text-sm text-green-700 mt-1">Receberá uma confirmação brevemente.</p>
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
        Agendar Visita
      </Button>

      <CreateAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyId={propertyId}
        opportunityId={opportunityId}
        onSuccess={() => setAppointmentCreated(true)}
      />
    </>
  );
}