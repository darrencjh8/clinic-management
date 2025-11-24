import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Patient, Treatment } from '../types';
import { GoogleSheetsService } from '../services/GoogleSheetsService';

const PATIENTS_SHEET = 'Patients';
const TREATMENT_TYPES_SHEET = 'TreatmentTypes';

interface StoreContextType {
    isLoading: boolean;
    isError: boolean;
    errorType: 'API' | 'AUTH' | null;
    spreadsheetId: string | null;
    accessToken: string | null;
    userRole: 'admin' | 'staff' | null;
    patients: Patient[];
    treatments: Treatment[];
    treatmentTypes: string[];
    currentMonth: string; // YYYY-MM
    setSheetId: (id: string) => void;
    handleLoginSuccess: (token: string, role?: 'admin' | 'staff') => void;
    addPatient: (patient: Omit<Patient, 'id' | 'rowIndex'>) => Promise<void>;
    updatePatient: (patient: Patient) => Promise<void>;
    addTreatment: (treatment: Omit<Treatment, 'id' | 'rowIndex'>) => Promise<void>;
    loadMonth: (month: string) => Promise<void>;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    isSyncing: boolean;
    syncData: () => Promise<void>;
    logout: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [errorType, setErrorType] = useState<'API' | 'AUTH' | null>(null);
    const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => localStorage.getItem('spreadsheet_id'));
    const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem('google_access_token'));
    const [isSyncing, setIsSyncing] = useState(false);

    const [patients, setPatients] = useState<Patient[]>([]);
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [treatmentTypes, setTreatmentTypes] = useState<string[]>(() => {
        const saved = localStorage.getItem('treatment_types');
        return saved ? JSON.parse(saved) : ['Cleaning', 'Filling', 'Root Canal', 'Extraction', 'Crown', 'Whitening', 'Checkup'];
    });
    const [currentMonth, setCurrentMonth] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('dark_mode');
        if (saved) return JSON.parse(saved);
        return false;
    });

    const loadData = useCallback(async (sheetId: string, month: string, silent: boolean = false) => {
        if (!GoogleSheetsService.getAccessToken()) return;

        if (!silent) setIsLoading(true);
        try {
            const treatmentsSheet = `Treatments_${month.replace('-', '_')}`;

            // Check spreadsheet and create missing sheets
            const spreadsheet = await GoogleSheetsService.getSpreadsheet(sheetId);
            const existingSheets = new Set(spreadsheet.sheets?.map((s: any) => s.properties.title) || []);

            // Create TreatmentTypes sheet if missing
            if (!existingSheets.has(TREATMENT_TYPES_SHEET)) {
                try {
                    await GoogleSheetsService.addSheet(sheetId, TREATMENT_TYPES_SHEET);
                    await GoogleSheetsService.updateValues(sheetId, `${TREATMENT_TYPES_SHEET}!A1:A8`, [
                        ['Type'], ['Cleaning'], ['Filling'], ['Root Canal'], ['Extraction'], ['Crown'], ['Whitening'], ['Checkup']
                    ]);
                    existingSheets.add(TREATMENT_TYPES_SHEET);
                } catch (e: any) {
                    if (!e.message?.includes('already exists')) console.error('Failed to create TreatmentTypes sheet', e);
                }
            }

            // Create monthly treatments sheet if missing
            if (!existingSheets.has(treatmentsSheet)) {
                try {
                    await GoogleSheetsService.addSheet(sheetId, treatmentsSheet);
                    await GoogleSheetsService.updateValues(sheetId, `${treatmentsSheet}!A1:G1`, [
                        ['ID', 'PatientID', 'Dentist', 'Admin', 'Amount', 'Treatment', 'Date']
                    ]);
                } catch (e: any) {
                    if (!e.message?.includes('already exists')) throw e;
                }
            }

            const rangesToFetch = [
                `${PATIENTS_SHEET}!A:D`,
                `${treatmentsSheet}!A:G`,
                `${TREATMENT_TYPES_SHEET}!A:A`
            ];

            const response = await GoogleSheetsService.batchGetValues(sheetId, rangesToFetch);
            const valueRanges = response.valueRanges || [];

            const getValuesForSheet = (sheetName: string) => {
                const range = valueRanges.find((r: any) => r.range.startsWith(`'${sheetName}'`) || r.range.startsWith(sheetName));
                return range ? range.values : [];
            };

            // Parse Patients
            const patientRows = getValuesForSheet(PATIENTS_SHEET) || [];
            const parsedPatients: Patient[] = [];
            patientRows.forEach((row: string[], index: number) => {
                if (index === 0) return;
                if (row[0]) {
                    parsedPatients.push({
                        id: row[0],
                        name: row[1],
                        age: row[2] ? Number(row[2]) : undefined,
                        notes: row[3],
                        rowIndex: index + 1
                    });
                }
            });
            setPatients(parsedPatients);

            // Parse Treatments
            const treatmentRows = getValuesForSheet(treatmentsSheet) || [];
            const parsedTreatments: Treatment[] = [];
            treatmentRows.forEach((row: string[], index: number) => {
                if (index === 0) return;
                if (row[0]) {
                    parsedTreatments.push({
                        id: row[0],
                        patientId: row[1],
                        dentist: row[2],
                        admin: row[3],
                        amount: Number(row[4]),
                        treatmentType: row[5],
                        date: row[6],
                        rowIndex: index + 1
                    });
                }
            });
            setTreatments(parsedTreatments);

            // Parse Treatment Types
            const treatmentTypeRows = getValuesForSheet(TREATMENT_TYPES_SHEET) || [];
            const parsedTypes: string[] = [];
            treatmentTypeRows.forEach((row: string[], index: number) => {
                if (index === 0) return;
                if (row[0]) parsedTypes.push(row[0]);
            });
            if (parsedTypes.length > 0) {
                setTreatmentTypes(parsedTypes);
                localStorage.setItem('treatment_types', JSON.stringify(parsedTypes));
            }

            setIsError(false);
        } catch (e: any) {
            console.error("Load failed", e);
            setIsError(true);
            setErrorType('API');
            if (e.message === 'Unauthorized') {
                setErrorType('AUTH');
                setAccessToken(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const syncData = useCallback(async () => {
        if (!spreadsheetId || !accessToken) return;
        setIsSyncing(true);
        try {
            await loadData(spreadsheetId, currentMonth, true);
        } finally {
            setIsSyncing(false);
        }
    }, [spreadsheetId, accessToken, currentMonth, loadData]);

    useEffect(() => {
        if (accessToken && spreadsheetId) {
            loadData(spreadsheetId, currentMonth);
        } else {
            setIsLoading(false);
        }
    }, [accessToken, spreadsheetId, currentMonth, loadData]);

    useEffect(() => {
        localStorage.setItem('dark_mode', JSON.stringify(isDarkMode));
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const addPatient = async (patientData: Omit<Patient, 'id' | 'rowIndex'>) => {
        if (!spreadsheetId) return;
        const newId = crypto.randomUUID();
        const row = [newId, patientData.name, patientData.age || '', patientData.notes || ''];
        await GoogleSheetsService.appendValues(spreadsheetId, PATIENTS_SHEET, [row]);
        await syncData();
    };

    const updatePatient = async (patient: Patient) => {
        if (!spreadsheetId || !patient.rowIndex) return;
        const range = `${PATIENTS_SHEET}!B${patient.rowIndex}:D${patient.rowIndex}`;
        const row = [patient.name, patient.age || '', patient.notes || ''];
        await GoogleSheetsService.updateValues(spreadsheetId, range, [row]);
        await syncData();
    };

    const addTreatment = async (treatmentData: Omit<Treatment, 'id' | 'rowIndex'>) => {
        if (!spreadsheetId) return;
        const newId = crypto.randomUUID();
        const treatmentsSheet = `Treatments_${currentMonth.replace('-', '_')}`;
        const row = [
            newId,
            treatmentData.patientId,
            treatmentData.dentist,
            treatmentData.admin,
            treatmentData.amount,
            treatmentData.treatmentType,
            treatmentData.date
        ];
        await GoogleSheetsService.appendValues(spreadsheetId, treatmentsSheet, [row]);
        await syncData();
    };

    const setSheetId = (id: string) => {
        setSpreadsheetId(id);
        localStorage.setItem('spreadsheet_id', id);
    };

    const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(() => {
        return localStorage.getItem('user_role') as 'admin' | 'staff' | null;
    });

    const handleLoginSuccess = (token: string, role: 'admin' | 'staff' = 'staff') => {
        setAccessToken(token);
        setUserRole(role);
        GoogleSheetsService.setAccessToken(token);
        localStorage.setItem('user_role', role);
    };

    const logout = () => {
        GoogleSheetsService.logout();
        setAccessToken(null);
        setSpreadsheetId(null);
        setUserRole(null);
        localStorage.removeItem('spreadsheet_id');
        localStorage.removeItem('user_role');
    };

    const loadMonth = async (month: string) => {
        setCurrentMonth(month);
    };

    const value: StoreContextType = {
        isLoading,
        isError,
        errorType,
        spreadsheetId,
        accessToken,
        userRole,
        patients,
        treatments,
        treatmentTypes,
        currentMonth,
        setSheetId,
        handleLoginSuccess,
        addPatient,
        updatePatient,
        addTreatment,
        loadMonth,
        isDarkMode,
        toggleDarkMode: () => setIsDarkMode((prev: boolean) => !prev),
        isSyncing,
        syncData,
        logout
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};
