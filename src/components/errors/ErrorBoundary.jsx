import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { createPageUrl } from "@/utils";
import { logError } from "./ErrorLogger";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to our centralized logger
    const errorId = logError(error, {
      componentStack: errorInfo.componentStack,
      boundaryName: this.props.name || 'Unknown',
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log to console for development
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
    
    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-slate-900">
                    Oops! Algo correu mal
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    {this.props.name ? `Erro em: ${this.props.name}` : 'Ocorreu um erro inesperado'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Detalhes do erro:
                </p>
                <p className="text-sm text-slate-600 font-mono">
                  {this.state.error?.message || 'Erro desconhecido'}
                </p>
                {this.state.errorId && (
                  <p className="text-xs text-slate-500 mt-2">
                    ID do erro: {this.state.errorId}
                  </p>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <summary className="text-sm font-medium text-slate-700 cursor-pointer">
                    Stack Trace (Desenvolvimento)
                  </summary>
                  <pre className="text-xs text-slate-600 mt-2 overflow-auto max-h-60">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = createPageUrl("Dashboard")}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Se o problema persistir, contacte o suporte técnico.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;