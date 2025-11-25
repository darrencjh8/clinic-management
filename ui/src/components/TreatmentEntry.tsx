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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName || !dentist || !admin || !amount || !treatmentType) return;

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
            });

            showToast(t('treatment.success'), 'success');

            // Reset form
            setPatientName('');
            setDentist('');
            setAdmin('');
            setAmount('');
            setTreatmentType('');
        } catch (error) {
            console.error('Failed to add treatment:', error);
            showToast('Failed to add treatment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-secondary-dark mb-8">{t('treatment.title')}</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
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

                {/* Treatment Type with Autocomplete */}
                <Autocomplete
                    value={treatmentType}
                    onChange={setTreatmentType}
                    suggestions={treatmentTypes}
                    placeholder={t('treatment.typePlaceholder')}
                    label={t('treatment.treatmentType')}
                    icon={<Calendar className="w-4 h-4" />}
                    required
                />

                <button
                    type="submit"
                    disabled={isSubmitting}
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
