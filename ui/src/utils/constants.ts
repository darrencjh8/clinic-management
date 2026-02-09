export const ORTHODONTIC_VARIANTS = ['Orthodontic', 'Ortodontik'];

export const isOrthodontic = (type: string | undefined | null): boolean => {
    if (!type) return false;
    return ORTHODONTIC_VARIANTS.some(variant => variant.toLowerCase() === type.toLowerCase());
};


export const parseIDRCurrency = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove "Rp", spaces, and dots (thousands separator)
    // Replace comma with dot (decimal separator) - though standard IDR formatting usually doesn't use decimals for amounts,
    // if user enters 10.500 it might mean 10,500. This logic removes dots.
    // So 1.234 become 1234. 1,234 (if user uses comma dec) becomes 1.234 (1.234).
    // The requirement says "add a . ... for every 3 zeroes". So it's standard ID thousands separator.
    const clean = val.replace(/[Rp\s.]/g, '').replace(',', '.');
    return Number(clean) || 0;
};

export const formatThousands = (val: number | string): string => {
    if (!val) return '';
    // Ensure we are working with a string of digits
    const numStr = val.toString().replace(/[^\d]/g, '');
    if (!numStr) return '';
    // Add dots every 3 digits from the right
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
