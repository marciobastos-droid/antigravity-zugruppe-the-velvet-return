import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function MatchFeedbackWidget({ 
  profileId, 
  propertyId, 
  matchScore, 
  matchDetails, 
  criteriaWeights,
  compact = false,
  onFeedbackSubmitted 
}) {
  const [feedbackType, setFeedbackType] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const queryClient = useQueryClient();

  const submitFeedbackMutation = useMutation({
    mutationFn: (data) => base44.entities.MatchFeedback.create(data),
    onSuccess: () => {
      toast.success("Feedback registado! Isto ajuda a melhorar os matches futuros.");
      setFeedbackNote("");
      setShowNoteInput(false);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
      queryClient.invalidateQueries({ queryKey: ['matchFeedback'] });
    },
    onError: () => {
      toast.error("Erro ao registar feedback");
    }
  });

  const handleFeedback = (type) => {
    setFeedbackType(type);
    
    if (type === 'excellent') {
      // Excellent feedback - submit immediately
      submitFeedbackMutation.mutate({
        profile_id: profileId,
        property_id: propertyId,
        match_score: matchScore,
        feedback_type: type,
        criteria_weights: criteriaWeights,
        match_details: matchDetails
      });
      setFeedbackType(null);
    } else {
      // Good or bad - allow optional note
      setShowNoteInput(true);
    }
  };

  const handleSubmitWithNote = () => {
    submitFeedbackMutation.mutate({
      profile_id: profileId,
      property_id: propertyId,
      match_score: matchScore,
      feedback_type: feedbackType,
      feedback_note: feedbackNote || undefined,
      criteria_weights: criteriaWeights,
      match_details: matchDetails
    });
  };

  if (showNoteInput && feedbackType) {
    return (
      <Card className="border-blue-300 bg-blue-50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {feedbackType === 'good' ? (
              <Badge className="bg-green-100 text-green-800">
                <ThumbsUp className="w-3 h-3 mr-1" />
                Bom Match
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                <ThumbsDown className="w-3 h-3 mr-1" />
                Match Fraco
              </Badge>
            )}
          </div>
          <Textarea
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            placeholder={feedbackType === 'good' ? 
              "O que tornou este match bom? (opcional)" : 
              "Porque este match não funcionou? (opcional)"
            }
            className="text-sm"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmitWithNote}
              disabled={submitFeedbackMutation.isPending}
              className="flex-1"
            >
              {submitFeedbackMutation.isPending ? 'A enviar...' : 'Enviar Feedback'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNoteInput(false);
                setFeedbackType(null);
                setFeedbackNote("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleFeedback('excellent')}
          className="text-yellow-600 hover:bg-yellow-50"
        >
          <Star className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleFeedback('good')}
          className="text-green-600 hover:bg-green-50"
        >
          <ThumbsUp className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleFeedback('bad')}
          className="text-red-600 hover:bg-red-50"
        >
          <ThumbsDown className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-slate-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Este match foi útil?
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFeedback('excellent')}
            className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
          >
            <Star className="w-4 h-4 mr-2" />
            Excelente
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFeedback('good')}
            className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Bom
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFeedback('bad')}
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Fraco
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          O seu feedback ajuda a melhorar as recomendações futuras
        </p>
      </CardContent>
    </Card>
  );
}