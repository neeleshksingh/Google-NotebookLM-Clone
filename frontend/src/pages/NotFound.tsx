import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            asChild 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary"
          >
            <a href="/">
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </a>
          </Button>
          
          <Button 
            variant="outline" 
            asChild
            className="w-full hover:bg-accent hover:text-accent-foreground"
          >
            <a href="/">
              <FileText className="h-4 w-4 mr-2" />
              Upload PDF
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
