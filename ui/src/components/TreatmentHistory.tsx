import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Calendar, DollarSign, User, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const TreatmentHistory = () => {
    const { treatments, patients, currentMonth, loadMonth, syncData } = useStore();
    const { t } = useTranslation();

    useEffect(() => {
        syncData();
    }, [syncData]);

    const getPatientName = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        return patient?.name || 'Unknown Patient';
    };

    const totalRevenue = treatments.reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="max-w-6xl mx-auto p-0 md:p-2">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
                <h1 className="text-3xl font-bold text-secondary-dark">{t('history.title')}</h1>
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

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-secondary-dark">{t('history.totalRevenue')}</h2>
                    <span className="text-3xl font-bold text-primary">
                        Rp {totalRevenue.toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {treatments.map((treatment) => (
                    <div key={treatment.id} className="bg-white rounded-2xl shadow-md p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-5 h-5 text-primary" />
                                    <span className="font-bold text-lg text-secondary-dark">
                                        {getPatientName(treatment.patientId)}
                                    </span>
                                </div>
                                <div className="ml-7 space-y-1 text-gray-600">
                                    <p><strong>{t('treatment.treatmentType')}:</strong> {treatment.treatmentType}</p>
                                    <p><strong>{t('treatment.date')}:</strong> {format(new Date(treatment.date), 'dd MMM yyyy, HH:mm')}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-600"><strong>{t('treatment.dentist')}:</strong> {treatment.dentist}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <span className="text-gray-600"><strong>{t('treatment.admin')}:</strong> {treatment.admin}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-primary" />
                                    <span className="text-xl font-bold text-primary">
                                        Rp {treatment.amount.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {treatments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-xl">{t('history.noTreatments')}</p>
                </div>
            )}
        </div>
    );
};
