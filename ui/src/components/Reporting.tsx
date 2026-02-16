import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calculator, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import { isOrthodontic } from '../utils/constants';

export const Reporting = () => {
    const { treatments, patients, currentMonth, loadMonth } = useStore();
    const { t } = useTranslation();
    const [selectedDentist, setSelectedDentist] = useState<string | null>(null);

    const [orthoPercentage, setOrthoPercentage] = useState<string>('50');
    const [normalPercentage, setNormalPercentage] = useState<string>('40');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Helper to get patient name
    const getPatientName = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        return patient ? patient.name : 'Unknown Patient';
    };

    // Group treatments by dentist
    const dentistRevenue = treatments.reduce((acc, treatment) => {
        const dentist = treatment.dentist || 'Unknown';
        // Revenue to clinic/owner is usually NettTotal (money in hand) or Amount? 
        // User said "nett total as the total revenue receivable by the owner".
        // The previous code using nettTotal ?? amount seems correct for "Revenue" display.
        acc[dentist] = (acc[dentist] || 0) + (treatment.nettTotal ?? treatment.amount);
        return acc;
    }, {} as Record<string, number>);

    const totalRevenue = Object.values(dentistRevenue).reduce((sum, val) => sum + val, 0);

    // Detail View
    if (selectedDentist) {
        const dentistTreatments = treatments.filter(t => t.dentist === selectedDentist);
        const dentistTotal = dentistRevenue[selectedDentist] || 0;

        // Calculate Commission
        // Rule: 
        // - Rate: 50% if New Ortho (Ortho + Braces), 40% otherwise.
        // - Base: Amount - Discount - BracesPrice (Excludes Admin Fee)
        const calculatePayable = (treatment: any) => {
            const bracesPrice = treatment.bracesPrice || 0;
            // Bug Fix: Only apply 50% if it's Ortho AND has Braces PRICE > 0 (meaning New Ortho).
            const isNewOrtho = isOrthodontic(treatment.treatmentType) && bracesPrice > 0;

            const rate = isNewOrtho ? Number(orthoPercentage) : Number(normalPercentage);

            const amount = treatment.amount || 0;
            const discount = treatment.discount || 0;

            // Commission Base = Amount - Discount - Braces Price
            const baseAmount = amount - discount - bracesPrice;

            return baseAmount * (rate / 100);
        };

        const payableAmount = dentistTreatments.reduce((sum, treatment) => {
            return sum + calculatePayable(treatment);
        }, 0);

        // Pagination Logic
        const totalPages = Math.ceil(dentistTreatments.length / itemsPerPage);
        const paginatedTreatments = dentistTreatments.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );

        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, dentistTreatments.length);

        return (
            <div className="max-w-5xl mx-auto p-3 md:px-4 md:py-2 lg:p-6">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => {
                            setSelectedDentist(null);
                            setCurrentPage(1);
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors text-sm lg:text-xl"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        {/* {t('reporting.back')} */}
                    </button>

                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <input
                            type="month"
                            value={currentMonth}
                            onChange={(e) => loadMonth(e.target.value)}
                            className="px-2 py-1 md:px-4 md:py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary text-sm md:text-lg font-semibold"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-xl md:text-xl lg:text-3xl font-bold text-secondary-dark mb-2">{selectedDentist}</h1>
                        <p className="text-gray-500 text-sm lg:text-xl">{t('reporting.dentistRevenue')}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl md:text-2xl lg:text-4xl font-bold text-primary">
                            Rp {dentistTotal.toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>

                {/* Calculator */}
                <div className="bg-white rounded-2xl shadow-lg p-4 md:p-4 lg:p-6 mb-8 border border-secondary-light">
                    <div className="flex items-center gap-2 mb-4 text-secondary-dark font-semibold text-sm lg:text-xl">
                        <Calculator className="w-5 h-5" />
                        {t('reporting.calculator')}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Ortho Percentage */}
                        <div>
                            <label className="block text-sm lg:text-lg text-gray-500 mb-1">{t('reporting.orthoPercentage')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={orthoPercentage}
                                    onChange={(e) => setOrthoPercentage(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary font-semibold text-sm lg:text-xl"
                                    min="0"
                                    max="100"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                            </div>
                        </div>
                        {/* Normal Percentage */}
                        <div>
                            <label className="block text-sm lg:text-lg text-gray-500 mb-1">{t('reporting.normalPercentage')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={normalPercentage}
                                    onChange={(e) => setNormalPercentage(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary font-semibold text-sm lg:text-xl"
                                    min="0"
                                    max="100"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                            </div>
                        </div>
                        {/* Payable Amount */}
                        <div>
                            <label className="block text-sm lg:text-lg text-gray-500 mb-1">{t('reporting.payable')}</label>
                            <div className="px-4 py-2 bg-secondary-light bg-opacity-30 rounded-xl font-bold text-primary text-sm lg:text-xl">
                                Rp {payableAmount.toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-4">
                    {/* Pagination Info */}
                    {dentistTreatments.length > 0 && (
                        <div className="text-center text-gray-500 text-sm mb-2 font-medium">
                            {t('common.showing')} {startItem} - {endItem} {t('common.of')} {dentistTreatments.length} {t('common.treatments')}
                        </div>
                    )}

                    {paginatedTreatments.map(treatment => {
                        const payable = calculatePayable(treatment);
                        return (
                            <div key={treatment.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-lg text-secondary-dark mb-1">
                                        {getPatientName(treatment.patientId)}
                                    </div>
                                    <div className="font-semibold text-secondary-dark text-sm lg:text-lg text-gray-600">
                                        {treatment.treatmentType}
                                    </div>
                                    {isOrthodontic(treatment.treatmentType) && treatment.bracesType && (
                                        <div className="text-xs lg:text-sm text-primary font-medium mt-0.5">
                                            {treatment.bracesType}
                                        </div>
                                    )}
                                    <div className="text-xs lg:text-sm text-gray-400 flex items-center gap-2 mt-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(treatment.date), 'dd MMM yyyy, HH:mm')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-primary font-bold text-sm lg:text-xl">
                                        Rp {(treatment.nettTotal ?? treatment.amount).toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-xs text-secondary-dark font-medium mt-1 bg-secondary-light/20 px-2 py-0.5 rounded">
                                        {t('reporting.payable')}: Rp {payable.toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {t('reporting.gross')}: Rp {treatment.amount.toLocaleString('id-ID')}
                                    </div>
                                    {(treatment.adminFee || 0) > 0 && (
                                        <div className="text-xs text-gray-500">
                                            {t('treatment.adminFee')}: +Rp {(treatment.adminFee || 0).toLocaleString('id-ID')}
                                        </div>
                                    )}
                                    {(treatment.discount || 0) > 0 && (
                                        <div className="text-xs text-green-600">
                                            {t('treatment.discount')}: -Rp {(treatment.discount || 0).toLocaleString('id-ID')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-lg bg-white border border-secondary-light text-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-light hover:bg-opacity-20 transition-colors font-medium"
                            >
                                {t('common.previous')}
                            </button>
                            <span className="text-secondary-dark font-medium">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 rounded-lg bg-white border border-secondary-light text-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-light hover:bg-opacity-20 transition-colors font-medium"
                            >
                                {t('common.next')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Summary View
    return (
        <div className="max-w-5xl mx-auto p-3 md:px-4 md:py-2 lg:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-1 lg:mb-8">
                <h1 className="text-xl md:text-xl lg:text-3xl font-bold text-secondary-dark">{t('reporting.title')}</h1>
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <input
                        type="month"
                        value={currentMonth}
                        onChange={(e) => loadMonth(e.target.value)}
                        className="px-2 py-1 md:px-4 md:py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary text-sm md:text-lg font-semibold"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-4 lg:p-6 mb-4 md:mb-3 lg:mb-8 border border-secondary-light shadow-md">
                <div className="text-gray-600 mb-1 text-sm lg:text-xl">{t('reporting.nettRevenue')}</div>
                <div className="text-xl md:text-3xl lg:text-5xl font-bold text-primary break-words">
                    Rp {totalRevenue.toLocaleString('id-ID')}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2 lg:gap-4">
                {Object.entries(dentistRevenue).map(([dentist, revenue]) => (
                    <button
                        key={dentist}
                        onClick={() => setSelectedDentist(dentist)}
                        className="bg-white p-4 md:p-4 lg:p-6 rounded-2xl shadow-md hover:shadow-lg transition-all text-left border border-transparent hover:border-primary group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-secondary-light rounded-full flex items-center justify-center text-secondary-dark group-hover:bg-primary group-hover:text-white transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="text-gray-400 group-hover:text-primary transition-colors">
                                <ArrowLeft className="w-5 h-5 rotate-180" />
                            </div>
                        </div>
                        <div className="font-bold text-lg lg:text-2xl text-secondary-dark mb-1">{dentist}</div>
                        <div className="text-primary font-bold text-base lg:text-xl">
                            Rp {revenue.toLocaleString('id-ID')}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
