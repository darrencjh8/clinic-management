import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Calendar, DollarSign, User, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const TreatmentHistory = () => {
    const { treatments, patients, currentMonth, loadMonth, syncData, userRole } = useStore();
    const { t } = useTranslation();

    useEffect(() => {
        syncData();
    }, [syncData]);

    const getPatientName = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        return patient?.name || 'Unknown Patient';
    };

    const totalRevenue = treatments.reduce((sum, t) => sum + t.amount, 0);

    // Sort treatments by date descending (newest first)
    const sortedTreatments = [...treatments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="max-w-5xl mx-auto p-3 md:px-4 md:py-2 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 md:mb-1 lg:mb-8 px-0">
                <h1 className="text-xl md:text-xl lg:text-3xl font-bold text-secondary-dark">{t('history.title')}</h1>
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

            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-4 lg:p-6 mb-3 md:mb-3 lg:mb-6 mx-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h2 className="text-lg md:text-lg lg:text-xl font-semibold text-secondary-dark">{t('history.totalRevenue')}</h2>
                    <span className="text-2xl md:text-2xl lg:text-3xl font-bold text-primary break-all">
                        Rp {totalRevenue.toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            <div className="space-y-3 md:space-y-2 lg:space-y-4 px-0">
                {sortedTreatments.map((treatment) => (
                    <div key={treatment.id} className="bg-white rounded-2xl shadow-md p-4 md:p-4 lg:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-3 lg:gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-5 h-5 text-primary flex-shrink-0" />
                                    <span className="font-bold text-lg lg:text-xl text-secondary-dark truncate">
                                        {getPatientName(treatment.patientId)}
                                    </span>
                                </div>
                                <div className="ml-0 md:ml-7 space-y-1 text-gray-600 text-sm md:text-sm lg:text-xl">
                                    <p className="flex flex-col md:flex-row md:gap-1">
                                        <strong>{t('treatment.treatmentType')}:</strong>
                                        <span>{treatment.treatmentType}</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span>{format(new Date(treatment.date), 'dd MMM yyyy, HH:mm')}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                                <div className="flex items-center gap-2 text-sm md:text-sm lg:text-xl">
                                    <Stethoscope className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                                    <span className="text-gray-600">{treatment.dentist}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm md:text-sm lg:text-xl">
                                    <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                                    <span className="text-gray-600">{treatment.admin}</span>
                                </div>

                                {/* Braces Included Status - Visible to All */}
                                {treatment.treatmentType === 'Orthodontik' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs md:text-sm px-2 py-1 rounded-full bg-secondary-light/50 text-secondary-dark font-medium border border-secondary-dark/10">
                                            {t('treatment.bracesIncluded')}: {treatment.bracesPrice && treatment.bracesPrice > 0 ? t('common.yes') : t('common.no')}
                                        </span>
                                    </div>
                                )}

                                {/* Financial Details */}
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                    {/* Gross Total - Visible to All */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                                            <span className="text-gray-600 font-medium text-sm md:text-sm lg:text-xl">
                                                {userRole === 'admin' ? t('history.grossTotal') : t('treatment.amount')}:
                                            </span>
                                        </div>
                                        <span className="text-lg lg:text-2xl font-bold text-primary">
                                            Rp {treatment.amount.toLocaleString('id-ID')}
                                        </span>
                                    </div>

                                    {/* Admin Only Details */}
                                    {userRole === 'admin' && (
                                        <>
                                            {treatment.bracesPrice !== undefined && treatment.bracesPrice > 0 && (
                                                <div className="flex justify-between text-gray-500 text-xs md:text-sm lg:text-lg pl-6 md:pl-7">
                                                    <span>{t('history.cost')}:</span>
                                                    <span>- Rp {treatment.bracesPrice.toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            {treatment.nettTotal !== undefined && (
                                                <div className="flex justify-between font-bold text-secondary-dark text-base lg:text-xl pl-6 md:pl-7 pt-1 border-t border-dashed border-gray-200">
                                                    <span>{t('history.nettTotal')}:</span>
                                                    <span>Rp {treatment.nettTotal.toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
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
