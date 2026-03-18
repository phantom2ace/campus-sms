'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

type Segment = {
  id: string;
  name: string;
} | null;

type Ministry = {
  id: string;
  name: string;
} | null;

type Contact = {
  id: string;
  name: string | null;
  fullName: string | null;
  phone: string;
  rawPhone: string | null;
  level: string | null;
  hostel: string | null;
  isActive: boolean;
  dateOfBirth: Date | string | null;
  createdAt: Date | string;
  segment?: Segment;
  ministries?: Ministry[];
};

export default function ContactTable({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; fullName: string; phone: string; level: string; hostel: string; dateOfBirth: string }>({ name: '', fullName: '', phone: '', level: '', hostel: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState<{ name: string; fullName: string; phone: string; level: string; hostel: string; dateOfBirth: string }>({ name: '', fullName: '', phone: '', level: '', hostel: '', dateOfBirth: '' });

  const filteredContacts = contacts.filter((contact) => {
    const nameMatch = (contact.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const phoneMatch = contact.phone.includes(searchTerm);
    const ministriesMatch = (contact.ministries?.some(m => m?.name.toLowerCase().includes(searchTerm.toLowerCase())) || false);
    const matchesSearch = nameMatch || phoneMatch || ministriesMatch;
    const matchesLevel = filterLevel ? contact.level === filterLevel : true;
    return matchesSearch && matchesLevel;
  });

  const handleExport = () => {
    const exportData = filteredContacts.map(contact => ({
      'Full Name': contact.fullName || contact.name || '',
      'Phone': contact.phone,
      'Level': contact.level || '',
      'Hostel': contact.hostel || '',
      'Ministry': contact.ministries?.map(m => m?.name).join(', ') || 'General',
      'Date of Birth': contact.dateOfBirth ? new Date(contact.dateOfBirth).toLocaleDateString('en-GB') : '',
      'Created At': new Date(contact.createdAt).toLocaleDateString('en-GB'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
    XLSX.writeFile(workbook, `church_members_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAddContact = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to add contact');
        return;
      }

      setShowAddForm(false);
      setNewContact({ name: '', fullName: '', phone: '', level: '', dateOfBirth: '' });
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setEditForm({
      name: contact.name || '',
      fullName: contact.fullName || '',
      phone: contact.rawPhone || contact.phone,
      level: contact.level || '',
      hostel: contact.hostel || '',
      dateOfBirth: contact.dateOfBirth ? new Date(contact.dateOfBirth).toISOString().split('T')[0] : ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', fullName: '', phone: '', level: '', hostel: '', dateOfBirth: '' });
  };

  const handleSave = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to update contact');
        return;
      }

      setEditingId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to delete contact');
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!contacts.length) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <p className="text-sm text-slate-400">
          No members found. Upload an Excel file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b border-white/10">
        <div className="flex gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
          >
            <option value="">All Levels</option>
            <option value="100">Level 100</option>
            <option value="200">Level 200</option>
            <option value="300">Level 300</option>
            <option value="400">Level 400</option>
            <option value="500">Level 500</option>
          </select>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-2 px-4 rounded-lg border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Add New Member</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value, fullName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
              <input
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="024xxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Level</label>
              <select
                value={newContact.level}
                onChange={(e) => setNewContact({ ...newContact, level: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Level</option>
                <option value="100">Level 100</option>
                <option value="200">Level 200</option>
                <option value="300">Level 300</option>
                <option value="400">Level 400</option>
                <option value="500">Level 500</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Hostel</label>
              <input
                type="text"
                value={newContact.hostel}
                onChange={(e) => setNewContact({ ...newContact, hostel: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Name of Hostel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Date of Birth</label>
              <input
                type="date"
                value={newContact.dateOfBirth}
                onChange={(e) => setNewContact({ ...newContact, dateOfBirth: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={loading || !newContact.phone || !newContact.name}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs uppercase tracking-wide text-slate-400 border-b border-white/10">
            <tr>
              <th className="py-2 pr-4 font-medium text-center">Full Name</th>
              <th className="py-2 pr-4 font-medium">Phone</th>
              <th className="py-2 pr-4 font-medium">Level</th>
              <th className="py-2 pr-4 font-medium">Hostel</th>
              <th className="py-2 pr-4 font-medium">Ministry</th>
              <th className="py-2 pr-4 font-medium">Date of Birth</th>
              <th className="py-2 pr-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No members match your search.
                </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-white/5 last:border-0 text-slate-200 group hover:bg-white/5 transition-colors"
                >
                  {editingId === contact.id ? (
                  <>
                    <td className="py-2 pr-4 text-center">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value, fullName: e.target.value })}
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-blue-500 text-center"
                        placeholder="Name"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="Phone"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={editForm.level}
                        onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-blue-500"
                        placeholder="Level"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={editForm.hostel}
                        onChange={(e) => setEditForm({ ...editForm, hostel: e.target.value })}
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-blue-500"
                        placeholder="Hostel"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      {/* Ministry is read-only in table edit for now as it's usually set on upload/add */}
                      <div className="flex flex-wrap gap-1">
                        {contact.ministries && contact.ministries.length > 0 ? (
                          contact.ministries.map(m => (
                            <span key={m?.id} className="text-slate-500 text-[10px] italic">
                              {m?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[10px] italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="date"
                        value={editForm.dateOfBirth}
                        onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="py-2 pr-4 text-right space-x-2">
                      <button
                        onClick={() => handleSave(contact.id)}
                        disabled={loading}
                        className="text-green-400 hover:text-green-300 disabled:opacity-50 text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={loading}
                        className="text-slate-400 hover:text-slate-300 disabled:opacity-50 text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-4 font-medium text-white text-center">
                      <div>{contact.fullName || contact.name || '-'}</div>
                      {contact.fullName && contact.name && contact.name !== contact.fullName && (
                        <div className="text-xs text-slate-400">{contact.name}</div>
                      )}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {contact.phone}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">
                      {contact.level || '-'}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">
                      {contact.hostel || '-'}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.ministries && contact.ministries.length > 0 ? (
                          contact.ministries.map(m => (
                            <span
                              key={m?.id}
                              className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-medium uppercase tracking-wider"
                            >
                              {m?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 italic text-xs">General</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-slate-400">
                      {contact.dateOfBirth
                        ? new Date(contact.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
                        : '-'}
                    </td>
                    <td className="py-2 pr-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(contact)}
                        className="text-blue-400 hover:text-blue-300 mr-3 text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </>
                )}
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

