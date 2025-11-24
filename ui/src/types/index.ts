// Force rebuild
export interface Patient {
    id: string;
    name: string;
    age?: number;
    notes?: string;
    rowIndex?: number; // For Google Sheets sync
}

export interface Treatment {
    id: string;
    patientId: string;
    dentist: string;
    admin: string;
    amount: number;
    treatmentType: string;
    date: string; // ISO string
    rowIndex?: number; // For Google Sheets sync
}

export const DENTISTS = [
    'Dr. Smith',
    'Dr. Jones',
    'Dr. Brown'
] as const;

export const ADMINS = [
    'Admin Alice',
    'Admin Bob'
] as const;

export type Dentist = typeof DENTISTS[number];
export type Admin = typeof ADMINS[number];
