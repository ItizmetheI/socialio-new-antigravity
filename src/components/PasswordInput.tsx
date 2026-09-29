import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

// A password field with a show/hide toggle, so people can check what they
// typed instead of guessing (and failing) their way through a login.
export default function PasswordInput(props: Props) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={isVisible ? "text" : "password"} autoCapitalize="none" spellCheck={false} className="field pr-11" />
      <button
        type="button"
        onClick={() => setIsVisible((v) => !v)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-white transition-colors"
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
