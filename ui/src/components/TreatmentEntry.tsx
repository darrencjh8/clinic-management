import { useState } from 'react';
import { useStore } from '../store/useStore';
import { User, Calendar, DollarSign, Stethoscope } from 'lucide-react';
import { type Dentist, type Admin } from '../types';
import { Autocomplete } from './Autocomplete';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { Loader2 } from 'lucide-react';

import { isOrthodontic } from '../utils/constants';

export const TreatmentEntry = () => {
    const { patients, addTreatment, addPatient, syncData, treatmentTypes, dentists, admins, bracesTypes, userRole } = useStore();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [patientName, setPatientName] = useState('');
    const [dentist, setDentist] = useState<Dentist | ''>('');
    const [admin, setAdmin] = useState<Admin | ''>('');
    const [amount, setAmount] = useState('');
    const [adminFee, setAdminFee] = useState('');
    const [discount, setDiscount] = useState('');
    const [treatmentType, setTreatmentType] = useState('');
    const [bracesType, setBracesType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName || !dentist || !admin || !amount || !treatmentType) return;
        if (isOrthodontic(treatmentType) && !bracesType) return;

        setIsSubmitting(true);
        try {
            // Find existing patient by name (case-insensitive)
            const existingPatient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
            let patientId: string;

            if (existingPatient) {
                patientId = existingPatient.id;
            } else {
                const newId = await addPatient({
                    name: patientName,
                    age: undefined,
                    notes: ''
                });
                // Refetch to get the new patient ID
                await syncData();
                patientId = newId || patientName;
            }

            await addTreatment({
                patientId,
                dentist,
                admin,
                amount: Number(amount),
                adminFee: adminFee ? Number(adminFee) : undefined,
                discount: discount ? Number(discount) : undefined,
                treatmentType,
                date: new Date().toISOString()
            }, bracesType);

            showToast(t('treatment.success'), 'success');

            // Reset form
            setPatientName('');
            setDentist('');
            setAdmin('');
            setAdmin('');
            setAmount('');
            setAdminFee('');
            setDiscount('');
            setTreatmentType('');
            setBracesType('');
        } catch (error) {
            console.error('Failed to add treatment:', error);
            showToast('Failed to add treatment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-3 md:p-4 lg:p-6">
            <div className="flex items-center h-12 mb-4 md:mb-3 lg:mb-6">
                <h1 className="text-xl md:text-xl lg:text-3xl font-bold text-secondary-dark">{t('treatment.title')}</h1>
            </div>
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-4 md:p-4 lg:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
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

                {/* Treatment Type Dropdown */}
                <div className="md:col-span-2">
                    <label className="block text-sm md:text-sm lg:text-xl font-semibold text-secondary-dark mb-1 md:mb-0.5 lg:mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        {t('treatment.treatmentType')}
                    </label>
                    <select
                        value={treatmentType}
                        onChange={(e) => {
                            setTreatmentType(e.target.value);
                            setBracesType('');
                        }}
                        className="w-full px-4 py-3 md:py-1.5 lg:py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-sm lg:text-xl"
                        required
                    >
                        <option value="">{t('treatment.typePlaceholder')}</option>
                        {treatmentTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Braces Type Selection */}
                {isOrthodontic(treatmentType) && (
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
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="flex-1 outline-none bg-transparent text-sm lg:text-xl text-right"
                            required
                            min="0"
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
                                type="number"
                                value={adminFee}
                                onChange={(e) => setAdminFee(e.target.value)}
                                placeholder="0"
                                className="flex-1 outline-none bg-transparent text-sm lg:text-xl text-right"
                                min="0"
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
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                placeholder="0"
                                className="flex-1 outline-none bg-transparent text-sm lg:text-xl text-right"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || (isOrthodontic(treatmentType) && !bracesType)}
                    className="w-full bg-primary text-white py-4 md:py-3 lg:py-4 rounded-xl font-semibold text-sm lg:text-xl hover:bg-opacity-90 transition-all transform active:scale-98 shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:col-span-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('treatment.loading')}
                        </>
                    ) : (
                        t('treatment.addTreatment')
                    )}
                </button>
            </form>
        </div>
    );
};
