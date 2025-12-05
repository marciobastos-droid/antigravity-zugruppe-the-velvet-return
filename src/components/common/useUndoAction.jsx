import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

export function useUndoAction() {
  const [pendingAction, setPendingAction] = useState(null);
  const timeoutRef = useRef(null);

  const executeWithUndo = useCallback(({
    action,
    undoAction,
    successMessage = "Ação realizada",
    undoMessage = "Ação desfeita",
    duration = 5000
  }) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Execute the action
    const result = action();

    // Store the undo action
    setPendingAction({ undoAction, undoMessage });

    // Show toast with undo button
    toast.success(successMessage, {
      duration,
      action: {
        label: "Desfazer",
        onClick: async () => {
          try {
            await undoAction();
            toast.success(undoMessage);
            setPendingAction(null);
          } catch (error) {
            toast.error("Erro ao desfazer ação");
          }
        }
      }
    });

    // Auto-clear pending action after duration
    timeoutRef.current = setTimeout(() => {
      setPendingAction(null);
    }, duration);

    return result;
  }, []);

  const clearPendingAction = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPendingAction(null);
  }, []);

  return { executeWithUndo, pendingAction, clearPendingAction };
}