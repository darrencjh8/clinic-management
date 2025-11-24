import { useState } from 'react';
import { useStore } from '../store/useStore';
import { User, Calendar, DollarSign, Stethoscope } from 'lucide-react';
import { DENTISTS, ADMINS, type Dentist, type Admin } from '../types';
import { Autocomplete } from './Autocomplete';

export const TreatmentEntry = () => {
    const { patients, addTreatment, addPatient, syncData, treatmentTypes } = useStore();
    const [patientName, setPatientName] = useState('');
    const [dentist, setDentist] = useState<Dentist | ''>('');
    const [admin, setAdmin] = useState<Admin | ''>('');
    const [amount, setAmount] = useState('');
    const [treatmentType, setTreatmentType] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName || !dentist || !admin || !amount || !treatmentType) return;

        // Find existing patient by name (case-insensitive)
        let existingPatient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());

        // If patient doesn't exist, create a new one
        if (!existingPatient) {
            await addPatient({
                name: patientName,
                age: undefined,
                notes: ''
            });
            // Refetch to get the new patient ID
            await syncData();
            existingPatient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        }

        const patientId = existingPatient?.id || patientName;

        await addTreatment({
            patientId,
            dentist,
            admin,
            amount: Number(amount),
            treatmentType,
            date: new Date().toISOString()
        });

        // Reset form
        setPatientName('');
        setDentist('');
        setAdmin('');
        setAmount('');
        setTreatmentType('');
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-secondary-dark mb-8">New Treatment Entry</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
                {/* Patient Input with Autocomplete */}
                <Autocomplete
                    value={patientName}
                    onChange={setPatientName}
                    suggestions={patients.map(p => p.name)}
                    placeholder="Enter patient name"
                    label="Patient Name"
                    icon={<User className="w-4 h-4" />}
                    required
                />

                {/* Dentist Selection */}
                <div>
                    <label className="block text-sm font-semibold text-secondary-dark mb-2">
                        <Stethoscope className="inline w-4 h-4 mr-1" />
                        Dentist
                    </label>
                    <select
                        value={dentist}
                        onChange={(e) => setDentist(e.target.value as Dentist)}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                        required
                    >
                        <option value="">-- Select Dentist --</option>
                        {DENTISTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                {/* Admin Selection */}
                <div>
                    <label className="block text-sm font-semibold text-secondary-dark mb-2">
                        <User className="inline w-4 h-4 mr-1" />
                        Admin
                    </label>
                    <select
                        value={admin}
                        onChange={(e) => setAdmin(e.target.value as Admin)}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                        required
                    >
                        <option value="">-- Select Admin --</option>
                        {ADMINS.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-semibold text-secondary-dark mb-2">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        Amount (Rp)
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
                    placeholder="e.g., Cleaning, Filling"
                    label="Treatment"
                    icon={<Calendar className="w-4 h-4" />}
                    required
                />

                <button
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-all transform active:scale-98 shadow-md"
                >
                    Submit
                </button>
            </form>
        </div>
    );
};
