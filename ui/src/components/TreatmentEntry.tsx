import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, Calendar, DollarSign, Stethoscope, Check } from 'lucide-react';
import { type Dentist, type Admin, type Treatment } from '../types';
import { Autocomplete } from './Autocomplete';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { isOrthodontic, formatThousands, parseIDRCurrency } from '../utils/constants';

const DEFAULT_ADMIN_FEE = '10.000';
const DEFAULT_ADMIN_FEE_VALUE = 10000;

interface TreatmentEntryProps {
    editingTreatment?: Treatment | null;
    onEditComplete?: () => void;
}

export const TreatmentEntry = ({ editingTreatment, onEditComplete }: TreatmentEntryProps) => {
    const { patients, addTreatment, updateTreatment, addPatient, syncData, treatmentTypes, dentists, admins, bracesTypes, userRole } = useStore();
    const { t } = useTranslation();
    const { showToast } = useToast();

    const isEditMode = !!editingTreatment;

    // Get patient name for edit mode
    const getPatientNameById = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        return patient?.name || patientId;
    };

    // Parse comma-separated treatment types for checkboxes
    const parseSelectedTypes = (typeString: string): string[] => {
        if (!typeString) return [];
        return typeString.split(',').map(t => t.trim()).filter(Boolean);
    };

    // Initialize form state
    const [patientName, setPatientName] = useState('');
    const [dentist, setDentist] = useState<Dentist | ''>('');
    const [admin, setAdmin] = useState<Admin | ''>('');
    const [amount, setAmount] = useState('');
    const [adminFee, setAdminFee] = useState(DEFAULT_ADMIN_FEE);
    const [adminFeeWasCleared, setAdminFeeWasCleared] = useState(false);
    const [discount, setDiscount] = useState('');
    const [selectedTreatmentTypes, setSelectedTreatmentTypes] = useState<string[]>([]);
    const [bracesType, setBracesType] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editingTreatment) {
            setPatientName(getPatientNameById(editingTreatment.patientId));
            setDentist(editingTreatment.dentist as Dentist);
            setAdmin(editingTreatment.admin as Admin);
            setAmount(formatThousands(editingTreatment.amount));
            setAdminFee(editingTreatment.adminFee ? formatThousands(editingTreatment.adminFee) : DEFAULT_ADMIN_FEE);
            setAdminFeeWasCleared(false);
            setDiscount(editingTreatment.discount ? formatThousands(editingTreatment.discount) : '');
            setSelectedTreatmentTypes(parseSelectedTypes(editingTreatment.treatmentType));
            setBracesType(editingTreatment.bracesType || '');
            // Parse date from ISO string
            const treatmentDate = new Date(editingTreatment.date);
            setSelectedDate(format(treatmentDate, 'yyyy-MM-dd'));
        }
    }, [editingTreatment, patients]);

    // Check if any selected type is orthodontic
    const hasOrthodonticType = selectedTreatmentTypes.some(type => isOrthodontic(type));

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        setAmount(formatThousands(raw));
    };

    const handleAdminFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        setAdminFee(formatThousands(raw));
    };

    const handleAdminFeeFocus = () => {
        // Clear if it's the default value and hasn't been manually edited
        if (adminFee === DEFAULT_ADMIN_FEE && !adminFeeWasCleared) {
            setAdminFee('');
            setAdminFeeWasCleared(true);
        }
    };

    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        setDiscount(formatThousands(raw));
    };

    const handleTreatmentTypeToggle = (type: string) => {
        setSelectedTreatmentTypes(prev => {
            if (prev.includes(type)) {
                // Removing - also clear braces type if no ortho types left
                const newTypes = prev.filter(t => t !== type);
                if (!newTypes.some(t => isOrthodontic(t))) {
                    setBracesType('');
                }
                return newTypes;
            } else {
                return [...prev, type];
            }
        });
    };

    const resetForm = () => {
        setPatientName('');
        setDentist('');
        setAdmin('');
        setAmount('');
        setAdminFee(DEFAULT_ADMIN_FEE);
        setAdminFeeWasCleared(false);
        setDiscount('');
        setSelectedTreatmentTypes([]);
        setBracesType('');
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName || !dentist || !admin || !amount || selectedTreatmentTypes.length === 0) return;
        if (hasOrthodonticType && !bracesType) return;

        setIsSubmitting(true);
        try {
            // Find existing patient by name (case-insensitive)
            const existingPatient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
            let patientId: string;

            if (isEditMode && editingTreatment) {
                patientId = editingTreatment.patientId;
            } else if (existingPatient) {
                patientId = existingPatient.id;
            } else {
                const newId = await addPatient({
                    name: patientName,
                    age: undefined,
                    notes: ''
                });
                await syncData();
                patientId = newId || patientName;
            }

            // Parse formatted strings back to numbers
            const rawAmount = parseIDRCurrency(amount);
            // If admin fee is empty, use default value
            const rawAdminFee = adminFee ? parseIDRCurrency(adminFee) : DEFAULT_ADMIN_FEE_VALUE;
            const rawDiscount = discount ? parseIDRCurrency(discount) : 0;

            // Combine treatment types as comma-separated string
            const treatmentTypeString = selectedTreatmentTypes.join(',');

            // Create date from selected date at current time
            const dateObj = new Date(selectedDate);
            const now = new Date();
            dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

            if (isEditMode && editingTreatment) {
                // Update existing treatment
                await updateTreatment({
                    ...editingTreatment,
                    patientId,
                    dentist,
                    admin,
                    amount: rawAmount,
                    adminFee: rawAdminFee,
                    discount: rawDiscount,
                    treatmentType: treatmentTypeString,
                    bracesType: bracesType || undefined,
                    date: dateObj.toISOString()
                });
                showToast(t('treatment.updateSuccess') || 'Treatment updated!', 'success');
                onEditComplete?.();
            } else {
                // Add new treatment
                await addTreatment({
                    patientId,
                    dentist,
                    admin,
                    amount: rawAmount,
                    adminFee: rawAdminFee,
                    discount: rawDiscount,
                    treatmentType: treatmentTypeString,
                    date: dateObj.toISOString()
                }, bracesType);
                showToast(t('treatment.success'), 'success');
            }

            resetForm();
        } catch (error) {
            console.error('Failed to save treatment:', error);
            showToast(isEditMode ? 'Failed to update treatment' : 'Failed to add treatment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between h-12 mb-4 md:mb-3 lg:mb-6">
                <h1 className="text-xl md:text-xl lg:text-3xl font-bold text-secondary-dark">
                    {isEditMode ? (t('treatment.editTitle') || 'Edit Treatment') : t('treatment.title')}
                </h1>
                {isEditMode && onEditComplete && (
                    <button
                        type="button"
                        onClick={onEditComplete}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        {t('common.cancel') || 'Cancel'}
                    </button>
                )}
            </div>
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-4 md:p-4 lg:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                {/* Date Picker */}
                <div className="md:col-span-2">
                    <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        {t('treatment.date') || 'Date'}
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-sm lg:text-xl"
                        required
                    />
                </div>

                {/* Patient Input with Autocomplete */}
                <div className="md:col-span-2">
                    <Autocomplete
                        value={patientName}
                        onChange={setPatientName}
                        suggestions={patients.map(p => p.name)}
                        placeholder={t('treatment.enterPatientName')}
                        label={t('treatment.patient')}
                        icon={<User className="w-4 h-4" />}
                        required
                        className="w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-sm lg:text-xl"
                    />
                </div>

                {/* Dentist Selection */}
                <div>
                    <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                        <Stethoscope className="inline w-4 h-4 mr-1" />
                        {t('treatment.dentist')}
                    </label>
                    <select
                        value={dentist}
                        onChange={(e) => setDentist(e.target.value as Dentist)}
                        className="w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-sm lg:text-xl"
                        required
                    >
                        <option value="">{t('treatment.selectDentist')}</option>
                        {dentists.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                {/* Admin Selection */}
                <div>
                    <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                        <User className="inline w-4 h-4 mr-1" />
                        {t('treatment.admin')}
                    </label>
                    <select
                        value={admin}
                        onChange={(e) => setAdmin(e.target.value as Admin)}
                        className="w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-sm lg:text-xl"
                        required
                    >
                        <option value="">{t('treatment.selectAdmin')}</option>
                        {admins.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                {/* Treatment Type Checkboxes */}
                <div className="md:col-span-2">
                    <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                        <Stethoscope className="inline w-4 h-4 mr-1" />
                        {t('treatment.treatmentType')}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {treatmentTypes.map(type => (
                            <label
                                key={type}
                                className={`flex items-center gap-2 px-3 py-2 border-2 rounded-xl cursor-pointer transition-all ${selectedTreatmentTypes.includes(type)
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-secondary-light bg-white text-secondary-dark hover:border-primary/50'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedTreatmentTypes.includes(type)}
                                    onChange={() => handleTreatmentTypeToggle(type)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedTreatmentTypes.includes(type)
                                        ? 'border-primary bg-primary'
                                        : 'border-gray-300 bg-white'
                                    }`}>
                                    {selectedTreatmentTypes.includes(type) && (
                                        <Check className="w-3 h-3 text-white" />
                                    )}
                                </div>
                                <span className="text-sm lg:text-base truncate">{type}</span>
                            </label>
                        ))}
                    </div>
                    {selectedTreatmentTypes.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">{t('treatment.selectAtLeastOne') || 'Select at least one treatment type'}</p>
                    )}
                </div>

                {/* Braces Type Selection */}
                {hasOrthodonticType && (
                    <div className="md:col-span-2">
                        <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                            {t('treatment.bracesType')}
                        </label>
                        <select
                            value={bracesType}
                            onChange={(e) => setBracesType(e.target.value)}
                            className="w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-sm lg:text-xl"
                            required
                        >
                            <option value="">{t('treatment.selectBracesType')}</option>
                            <option value={t('treatment.controlOnly')}>
                                {t('treatment.controlOnly')} {userRole === 'admin' ? '(Rp 0)' : ''}
                            </option>
                            {bracesTypes.map(b => (
                                <option key={b.type} value={b.type}>
                                    {b.type} {userRole === 'admin' ? `(Rp ${b.price.toLocaleString('id-ID')})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Amount */}
                <div className="md:col-span-2">
                    <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        {t('treatment.amount')}
                    </label>
                    <div className="flex items-center w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus-within:border-primary transition-colors bg-white">
                        <span className="text-secondary-dark/50 text-sm lg:text-xl font-medium select-none mr-1">Rp</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0"
                            className="flex-1 outline-none bg-transparent text-sm lg:text-xl text-right"
                            required
                        />
                    </div>
                </div>

                {/* Admin Fee and Discount */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                    {/* Admin Fee */}
                    <div>
                        <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                            {t('treatment.adminFee') || 'Admin Fee'}
                        </label>
                        <div className="flex items-center w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus-within:border-primary transition-colors bg-white">
                            <span className="text-secondary-dark/50 text-sm lg:text-xl font-medium select-none mr-1">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={adminFee}
                                onChange={handleAdminFeeChange}
                                onFocus={handleAdminFeeFocus}
                                placeholder="0"
                                className="flex-1 outline-none bg-transparent text-sm lg:text-xl text-right"
                            />
                        </div>
                    </div>

                    {/* Discount */}
                    <div>
                        <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                            {t('treatment.discount') || 'Discount'}
                        </label>
                        <div className="flex items-center w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus-within:border-primary transition-colors bg-white">
                            <span className="text-secondary-dark/50 text-sm lg:text-xl font-medium select-none mr-1">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={discount}
                                onChange={handleDiscountChange}
                                placeholder="0"
                                className="flex-1 outline-none bg-transparent text-sm lg:text-xl text-right"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || (hasOrthodonticType && !bracesType) || selectedTreatmentTypes.length === 0}
                    className="w-full bg-primary text-white py-4 md:py-3 lg:py-4 rounded-xl font-semibold text-sm lg:text-xl hover:bg-opacity-90 transition-all transform active:scale-98 shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:col-span-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('treatment.loading')}
                        </>
                    ) : (
                        isEditMode ? (t('treatment.updateTreatment') || 'Update Treatment') : t('treatment.addTreatment')
                    )}
                </button>
            </form>
        </div>
    );
};
