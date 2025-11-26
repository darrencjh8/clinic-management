import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Calendar, User, Stethoscope } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export const TreatmentHistory = () => {
    const { treatments, patients, currentMonth, loadMonth, syncData, userRole } = useStore();
    const { t } = useTranslation();

    // State for selected date (default to today)
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        return format(now, 'yyyy-MM-dd');
    });

    useEffect(() => {
        syncData();
    }, [syncData]);

    // Update store's currentMonth when selectedDate changes
    useEffect(() => {
        const dateMonth = selectedDate.substring(0, 7); // YYYY-MM
        if (dateMonth !== currentMonth) {
            loadMonth(dateMonth);
        }
    }, [selectedDate, currentMonth, loadMonth]);

    const getPatientName = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        return patient?.name || 'Unknown Patient';
    };

    // Filter treatments for the selected date
    const dailyTreatments = treatments.filter(t => isSameDay(parseISO(t.date), parseISO(selectedDate)));

    // Sort by date descending (newest first)
    const sortedTreatments = [...dailyTreatments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalRevenue = sortedTreatments.reduce((sum, t) => sum + t.amount, 0);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Reset page when date changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDate]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedTreatments.length / itemsPerPage);
    const paginatedTreatments = sortedTreatments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, sortedTreatments.length);

    return (
        <div className="max-w-5xl mx-auto p-3 md:px-4 md:py-2 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 md:mb-1 lg:mb-8 px-0">
                <div>
                    <h1 className="text-xl md:text-xl lg:text-3xl font-bold text-secondary-dark">{t('history.title')}</h1>
                    <p className="text-sm md:text-base text-gray-500 mt-1">
                        {sortedTreatments.length} {t('common.treatments')} {t('common.on')} {format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: id })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
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

            {/* Pagination Info Label */}
            {sortedTreatments.length > 0 && (
                <div className="mb-2 text-sm text-gray-500 px-1">
                    {t('common.showing')} {startItem} - {endItem} {t('common.of')} {sortedTreatments.length} {t('common.treatments')}
                </div>
            )}

            <div className="space-y-3 px-0">
                {paginatedTreatments.map((treatment) => (
                    <div key={treatment.id} className="bg-white rounded-2xl shadow-md p-4 md:p-4 lg:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-3 lg:gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-5 h-5 text-primary flex-shrink-0" />
                                    <span className="font-bold text-lg lg:text-xl text-secondary-dark truncate">
                                        {getPatientName(treatment.patientId)}
                                    </span>
                                </div>
                                <div className="ml-0 md:ml-7 space-y-1 text-gray-600">
                                    <p className="flex flex-col md:flex-row md:gap-1 text-base md:text-base lg:text-lg font-medium">
                                        <strong>{t('treatment.treatmentType')}:</strong>
                                        <span>{treatment.treatmentType}</span>
                                    </p>
                                    <p className="flex items-center gap-2 text-xs md:text-xs lg:text-sm text-gray-400">
                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                        <span>{format(new Date(treatment.date), 'dd MMM yyyy HH:mm')}</span>
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

                                {/* Braces Included Status */}
                                {treatment.treatmentType === 'Orthodontik' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs md:text-sm px-2 py-1 rounded-full bg-secondary-light/50 text-secondary-dark font-medium border border-secondary-dark/10">
                                            {t('treatment.bracesIncluded')}: {treatment.bracesPrice && treatment.bracesPrice > 0 ? t('common.yes') : t('common.no')}
                                        </span>
                                    </div>
                                )}

                                {/* Financial Details */}
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                    {/* Gross Total (Primary Emphasis for Admin) */}
                                    {userRole === 'admin' && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-gray-600 font-bold text-base md:text-lg lg:text-xl">
                                                {t('history.grossTotal')}:
                                            </span>
                                            <span className="text-xl lg:text-3xl font-bold text-primary">
                                                Rp {treatment.amount.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Amount (Primary Emphasis for Non-Admin) */}
                                    {userRole !== 'admin' && (
                                        <div className="flex justify-between items-center text-gray-400 text-xs md:text-sm lg:text-base">
                                            <span>{t('treatment.amount')}:</span>
                                            <span>Rp {treatment.amount.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}

                                    {/* Nett Total (Secondary for Admin) */}
                                    {userRole === 'admin' && treatment.nettTotal !== undefined && treatment.bracesPrice !== undefined && treatment.bracesPrice > 0 && (
                                        <div className="flex justify-between items-center text-gray-400 text-xs md:text-sm lg:text-base">
                                            <span>{t('history.nettTotal')}:</span>
                                            <span>Rp {treatment.nettTotal.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}

                                    {/* Cost (Admin Only) */}
                                    {userRole === 'admin' && treatment.bracesPrice !== undefined && treatment.bracesPrice > 0 && (
                                        <div className="flex justify-between text-gray-400 text-xs md:text-sm lg:text-base">
                                            <span>{t('history.cost')}:</span>
                                            <span>- Rp {treatment.bracesPrice.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                        <button
                            onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg bg-white border border-secondary-light text-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-light/50 transition-colors"
                        >
                            {t('common.previous')}
                        </button>
                        <span className="text-secondary-dark font-medium">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-lg bg-white border border-secondary-light text-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-light/50 transition-colors"
                        >
                            {t('common.next')}
                        </button>
                    </div>
                )}
            </div>

            {sortedTreatments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-xl">{t('history.noTreatments')}</p>
                </div>
            )}
        </div>
    );
};
