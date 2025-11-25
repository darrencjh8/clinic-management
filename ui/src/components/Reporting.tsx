import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calculator, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const Reporting = () => {
    const { treatments, currentMonth, loadMonth } = useStore();
    const { t } = useTranslation();
    const [selectedDentist, setSelectedDentist] = useState<string | null>(null);
    const [commissionRate, setCommissionRate] = useState<string>('60');

    // Group treatments by dentist
    const dentistRevenue = treatments.reduce((acc, treatment) => {
        const dentist = treatment.dentist || 'Unknown';
        acc[dentist] = (acc[dentist] || 0) + treatment.amount;
        return acc;
    }, {} as Record<string, number>);

    const totalRevenue = Object.values(dentistRevenue).reduce((sum, val) => sum + val, 0);

    // Detail View
    if (selectedDentist) {
        const dentistTreatments = treatments.filter(t => t.dentist === selectedDentist);
        const dentistTotal = dentistRevenue[selectedDentist] || 0;
        const payableAmount = dentistTotal * (Number(commissionRate) / 100);

        return (
            <div className="max-w-4xl mx-auto p-6">
                <button
                    onClick={() => setSelectedDentist(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    {t('reporting.back')}
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-dark mb-2">{selectedDentist}</h1>
                        <p className="text-gray-500">{t('reporting.dentistRevenue')}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-primary">
                            Rp {dentistTotal.toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>

                {/* Calculator */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-secondary-light">
                    <div className="flex items-center gap-2 mb-4 text-secondary-dark font-semibold">
                        <Calculator className="w-5 h-5" />
                        {t('reporting.calculator')}
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-500 mb-1">{t('reporting.percentage')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={commissionRate}
                                    onChange={(e) => setCommissionRate(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary font-semibold"
                                    min="0"
                                    max="100"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-gray-500 mb-1">{t('reporting.payable')}</label>
                            <div className="px-4 py-2 bg-secondary-light bg-opacity-30 rounded-xl font-bold text-primary text-lg">
                                Rp {payableAmount.toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-4">
                    {dentistTreatments.map(treatment => (
                        <div key={treatment.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-secondary-dark">{treatment.treatmentType}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(treatment.date), 'dd MMM yyyy, HH:mm')}
                                </div>
                            </div>
                            <div className="font-bold text-primary">
                                Rp {treatment.amount.toLocaleString('id-ID')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Summary View
    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-secondary-dark">{t('reporting.title')}</h1>
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <input
                        type="month"
                        value={currentMonth}
                        onChange={(e) => loadMonth(e.target.value)}
                        className="px-4 py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary text-lg font-semibold"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 mb-8 border border-secondary-light shadow-md">
                <div className="text-gray-600 mb-1">{t('reporting.totalRevenue')}</div>
                <div className="text-4xl font-bold text-primary">
                    Rp {totalRevenue.toLocaleString('id-ID')}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(dentistRevenue).map(([dentist, revenue]) => (
                    <button
                        key={dentist}
                        onClick={() => setSelectedDentist(dentist)}
                        className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all text-left border border-transparent hover:border-primary group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-secondary-light rounded-full flex items-center justify-center text-secondary-dark group-hover:bg-primary group-hover:text-white transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="text-gray-400 group-hover:text-primary transition-colors">
                                <ArrowLeft className="w-5 h-5 rotate-180" />
                            </div>
                        </div>
                        <div className="font-bold text-xl text-secondary-dark mb-1">{dentist}</div>
                        <div className="text-primary font-bold text-lg">
                            Rp {revenue.toLocaleString('id-ID')}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
