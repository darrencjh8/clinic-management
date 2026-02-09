import React from 'react';
import { StoreContext } from '../store/useStore';
// Import types if needed, but we can treat context value as partial or any for flexibility in tests
// import { StoreContextType } from '../store/useStore'; 

export const MockStoreProvider = ({ children, value }: { children: React.ReactNode, value?: any }) => {
    const defaultValue = {
        isLoading: false,
        isError: false,
        errorType: null,
        spreadsheetId: 'mock-sheet-id',
        accessToken: 'mock-token',
        userRole: 'admin',
        patients: [
            { id: 'p1', name: 'John Doe', rowIndex: 1 },
            { id: 'p2', name: 'Jane Smith', rowIndex: 2 }
        ],
        treatments: [],
        staff: [],
        dentists: ['Dr. Smith', 'Dr. Jones'],
        admins: ['Admin A'],
        treatmentTypes: ['Cleaning', 'Filling', 'Orthodontic', 'Ortodontik', 'Checkup'],
        bracesTypes: [
            { type: 'Metal', price: 5000000 },
            { type: 'Control', price: 0 }
        ],
        currentMonth: '2023-01',
        setSheetId: () => { },
        handleLoginSuccess: () => { },
        addPatient: async () => 'new-id',
        updatePatient: async () => { },
        addTreatment: async () => { },
        updateTreatment: async () => { },
        loadMonth: async () => { },
        isDarkMode: false,
        toggleDarkMode: () => { },
        isSyncing: false,
        syncData: async () => { },
        logout: async () => { }
    };

    return (
        <StoreContext.Provider value={{ ...defaultValue, ...value }}>
            {children}
        </StoreContext.Provider>
    );
};
