export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string }) => void;
  initialMode?: "login" | "register";
}

export interface PasswordStrength {
  score: number;
  text: string;
  color: string;
}

export interface FoodImage {
  url: string;
  alt: string;
}

export interface LoginFeatureBadge {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lines: string[];
}
