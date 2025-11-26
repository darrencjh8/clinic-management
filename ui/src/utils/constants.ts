export const ORTHODONTIC_VARIANTS = ['Orthodontic', 'Ortodontik'];

export const isOrthodontic = (type: string | undefined | null): boolean => {
    if (!type) return false;
    return ORTHODONTIC_VARIANTS.some(variant => variant.toLowerCase() === type.toLowerCase());
};

export const parseIDRCurrency = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove "Rp", spaces, and dots (thousands separator)
    // Replace comma with dot (decimal separator)
    const clean = val.replace(/[Rp\s.]/g, '').replace(',', '.');
    return Number(clean) || 0;
};
