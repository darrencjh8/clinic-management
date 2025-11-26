import { useState } from 'react';
import { useStore } from '../store/useStore';
import { User, Plus, Edit2, Save, X } from 'lucide-react';
import type { Patient } from '../types';
import { useTranslation } from 'react-i18next';

export const PatientManager = () => {
    const { patients, addPatient, updatePatient } = useStore();
    const { t } = useTranslation();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        notes: ''
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        await addPatient({
            name: formData.name,
            age: formData.age ? Number(formData.age) : undefined,
            notes: formData.notes
        });
        setFormData({ name: '', age: '', notes: '' });
        setShowAddForm(false);
    };

    const startEdit = (patient: Patient) => {
        setEditingId(patient.id);
        setFormData({
            name: patient.name,
            age: patient.age?.toString() || '',
            notes: patient.notes || ''
        });
    };

    const handleUpdate = async (patient: Patient) => {
        await updatePatient({
            ...patient,
            name: formData.name,
            age: formData.age ? Number(formData.age) : undefined,
            notes: formData.notes
        });
        setEditingId(null);
        setFormData({ name: '', age: '', notes: '' });
    };

    return (
        <div className="max-w-4xl mx-auto p-0 md:p-2">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
                <h1 className="text-3xl font-bold text-secondary-dark">{t('patient.title')}</h1>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-all shadow-md"
                >
                    {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {showAddForm ? t('patient.cancel') : t('patient.addNew')}
                </button>
            </div>

            {showAddForm && (
                <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-lg p-6 mb-6 space-y-4">
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('patient.name')}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                        required
                    />
                    <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        placeholder={`${t('patient.age')} (${t('patient.optional')})`}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                        min="0"
                    />
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder={`${t('patient.notes')} (${t('patient.optional')})`}
                        className="w-full px-4 py-3 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary transition-colors text-lg resize-none"
                        rows={3}
                    />
                    <button
                        type="submit"
                        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-all"
                    >
                        {t('patient.addPatient')}
                    </button>
                </form>
            )}

            <div className="space-y-4">
                {patients.map((patient) => (
                    <div key={patient.id} className="bg-white rounded-2xl shadow-md p-6">
                        {editingId === patient.id ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary"
                                />
                                <input
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    placeholder={t('patient.age')}
                                    className="w-full px-4 py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary"
                                    min="0"
                                />
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder={t('patient.notes')}
                                    className="w-full px-4 py-2 border-2 border-secondary-light rounded-xl focus:outline-none focus:border-primary resize-none"
                                    rows={2}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdate(patient)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold hover:bg-opacity-90"
                                    >
                                        <Save className="w-4 h-4" />
                                        {t('patient.save')}
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-300"
                                    >
                                        <X className="w-4 h-4" />
                                        {t('patient.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <User className="w-6 h-6 text-primary" />
                                        <h3 className="text-xl font-bold text-secondary-dark">{patient.name}</h3>
                                        {patient.age && <span className="text-gray-500 text-sm">({patient.age} {t('patient.age')})</span>}
                                    </div>
                                    {patient.notes && (
                                        <p className="text-gray-600 ml-9 mt-2">{patient.notes}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => startEdit(patient)}
                                    className="flex items-center gap-2 text-primary hover:text-opacity-80 font-semibold"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    {t('patient.edit')}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {patients.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-xl">{t('patient.noPatients')}</p>
                </div>
            )}
        </div>
    );
};
