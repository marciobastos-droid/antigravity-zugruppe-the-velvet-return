import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import CreateAppointmentDialog from "../calendar/CreateAppointmentDialog";

export default function QuickAppointmentButton({ propertyId, opportunityId, variant = "outline", size = "sm" }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Agendar Visita
      </Button>

      <CreateAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyId={propertyId}
        opportunityId={opportunityId}
      />
    </>
  );
}