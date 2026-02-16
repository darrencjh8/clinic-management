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
    bracesPrice?: number;
    bracesType?: string;
    nettTotal?: number;
    adminFee?: number;
    discount?: number;
    rowIndex?: number; // For Google Sheets sync
}

export interface BracesType {
    type: string;
    price: number;
}

export interface Staff {
    name: string;
    role: 'Dentist' | 'Admin';
}

export type Dentist = string;
export type Admin = string;
