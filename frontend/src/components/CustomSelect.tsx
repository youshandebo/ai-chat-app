import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ options, value, onChange, placeholder = "请选择", className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between min-w-[160px] px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-gray-900 dark:text-dark-text text-sm hover:border-primary dark:hover:border-primary transition-colors outline-none focus:ring-2 focus:ring-primary/20 shadow-sm active:scale-[0.98]"
      >
        <span className="truncate">{currentOption?.label || placeholder}</span>
        <ChevronDown className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
            className="absolute left-0 top-full mt-2 w-full min-w-[180px] max-h-64 overflow-y-auto bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border border-gray-200/60 dark:border-dark-border/40 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/30 z-[60] py-1.5 scroll-smooth"
          >
            {options.map((opt, index) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left mx-1.5 px-3 py-2.5 text-sm flex items-center justify-between transition-all duration-150 ${index === 0 ? 'rounded-t-2xl' : ''} ${index === options.length - 1 ? 'rounded-b-2xl' : ''} rounded-xl ${opt.value === value ? "text-primary font-medium bg-primary/8 dark:bg-primary/12" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-white/5"}`}
                style={{ width: 'calc(100% - 12px)' }}
              >
                <span className="truncate pr-4">{opt.label}</span>
                {opt.value === value && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
