import { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    suggestions: string[];
    placeholder?: string;
    className?: string;
    label?: string;
    icon?: React.ReactNode;
    required?: boolean;
}

export const Autocomplete = ({
    value,
    onChange,
    suggestions,
    placeholder,
    className,
    label,
    icon,
    required
}: AutocompleteProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input
    useEffect(() => {
        if (value) {
            const filtered = suggestions.filter(s =>
                s.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredSuggestions(filtered);
        } else {
            setFilteredSuggestions([]);
        }
    }, [value, suggestions]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (suggestion: string) => {
        onChange(suggestion);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {label && (
                <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                    {icon && <span className="inline-block mr-1">{icon}</span>}
                    {label}
                </label>
            )}
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className={className || "w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"}
                required={required}
            />
            {isOpen && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-secondary-dark rounded-lg shadow-lg overflow-hidden">
                    {filteredSuggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleSelect(suggestion)}
                            className="w-full px-4 py-3 text-left text-white hover:bg-primary transition-colors"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
