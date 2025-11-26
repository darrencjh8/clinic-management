import { useState } from 'react';
import { useStore } from '../store/useStore';
import { User, Calendar, DollarSign, Stethoscope } from 'lucide-react';
import { type Dentist, type Admin } from '../types';
import { Autocomplete } from './Autocomplete';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { Loader2 } from 'lucide-react';

export const TreatmentEntry = () => {
    const { patients, addTreatment, addPatient, syncData, treatmentTypes, dentists, admins } = useStore();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [patientName, setPatientName] = useState('');
    const [dentist, setDentist] = useState<Dentist | ''>('');
    const [admin, setAdmin] = useState<Admin | ''>('');
    const [amount, setAmount] = useState('');
    const [treatmentType, setTreatmentType] = useState('');
    const [bracesIncluded, setBracesIncluded] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName || !dentist || !admin || !amount || !treatmentType) return;
        if (treatmentType === 'Orthodontik' && bracesIncluded === null) return;

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
                treatmentType,
                date: new Date().toISOString()
            }, bracesIncluded || false);

            showToast(t('treatment.success'), 'success');

            // Reset form
            setPatientName('');
            setDentist('');
            setAdmin('');
            setAmount('');
            setTreatmentType('');
            setBracesIncluded(null);
        } catch (error) {
            console.error('Failed to add treatment:', error);
            showToast('Failed to add treatment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-dark mb-6">{t('treatment.title')}</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-4 md:p-8 space-y-5">
                {/* Patient Input with Autocomplete */}
                <Autocomplete
                    value={patientName}
                    onChange={setPatientName}
                    suggestions={patients.map(p => p.name)}
                    placeholder={t('treatment.enterPatientName')}
                    label={t('treatment.patient')}
                    icon={<User className="w-4 h-4" />}
                    required
                />

                {/* Dentist Selection */}
                <div>
                    <label className="block text-sm font-semibold text-secondary-dark mb-2">
                        <Stethoscope className="inline w-4 h-4 mr-1" />
                        {t('treatment.dentist')}
                    </label>
                    <select
                        value={dentist}
                        onChange={(e) => setDentist(e.target.value as Dentist)}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
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
                    <label className="block text-sm font-semibold text-secondary-dark mb-2">
                        <User className="inline w-4 h-4 mr-1" />
                        {t('treatment.admin')}
                    </label>
                    <select
                        value={admin}
                        onChange={(e) => setAdmin(e.target.value as Admin)}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                        required
                    >
                        <option value="">{t('treatment.selectAdmin')}</option>
                        {admins.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-semibold text-secondary-dark mb-2">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        {t('treatment.amount')}
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                        required
                        min="0"
                    />
                </div>

                {/* Treatment Type Dropdown */}
                <div>
                    <label className="block text-sm font-semibold text-secondary-dark mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        {t('treatment.treatmentType')}
                    </label>
                    <select
                        value={treatmentType}
                        onChange={(e) => {
                            setTreatmentType(e.target.value);
                            setBracesIncluded(null);
                        }}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                        required
                    >
                        <option value="">{t('treatment.typePlaceholder')}</option>
                        {treatmentTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Braces Included Radio */}
                {treatmentType === 'Orthodontik' && (
                    <div className="bg-secondary-light/30 p-4 rounded-xl border border-primary/20">
                        <label className="block text-sm font-semibold text-secondary-dark mb-3">
                            {t('treatment.bracesIncluded')}
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="bracesIncluded"
                                    checked={bracesIncluded === true}
                                    onChange={() => setBracesIncluded(true)}
                                    className="w-5 h-5 text-primary focus:ring-primary"
                                />
                                <span className="text-lg">{t('common.yes')}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="bracesIncluded"
                                    checked={bracesIncluded === false}
                                    onChange={() => setBracesIncluded(false)}
                                    className="w-5 h-5 text-primary focus:ring-primary"
                                />
                                <span className="text-lg">{t('common.no')}</span>
                            </label>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || (treatmentType === 'Orthodontik' && bracesIncluded === null)}
                    className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-all transform active:scale-98 shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
