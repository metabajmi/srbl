import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  to?: string;
  label?: string;
  useHistory?: boolean;
}

export function BackButton({ to, label = "رجوع", useHistory = true }: BackButtonProps) {
  const [location, setLocation] = useLocation();

  // Don't show on home or login pages
  const hiddenPaths = ["/", "/login", "/auth"];
  if (hiddenPaths.includes(location)) {
    return null;
  }

  const handleBack = () => {
    if (to) {
      // Navigate to specific path if provided
      setLocation(to);
    } else if (useHistory && window.history.length > 1) {
      // Use browser history to go back
      window.history.back();
    } else {
      // Fallback to home page
      setLocation("/");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] px-3"
      data-testid="button-back"
    >
      <ArrowRight className="w-5 h-5 ml-2" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
