import React, { useState, useRef } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { Upload, Phone, FileText, CheckCircle, AlertCircle } from 'lucide-react';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { tasks: [], errors: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const tasks = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
    if (cols.length === 0 || !cols[0]) continue;

    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });

    const recipient = row.recipient || row.phone || row.number || cols[0];
    if (!recipient || recipient.length < 10) {
      errors.push(`Row ${i + 1}: invalid number "${recipient}"`);
      continue;
    }
    tasks.push({
      recipient: recipient.replace(/\s+/g, ''),
      message: row.message || '',
      clientId: row.clientid || row.client_id || '',
      priority: parseInt(row.priority) || 0,
    });
  }
  return { tasks, errors };
}

function parsePhoneNumbers(text) {
  const raw = text.split(/[\n,;\s]+/).map(n => n.trim()).filter(Boolean);
  const valid = [];
  const invalid = [];

  raw.forEach(n => {
    let cleaned = n.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+91') && cleaned.length === 13) valid.push(cleaned);
    else if (cleaned.startsWith('91') && cleaned.length === 12) valid.push('+' + cleaned);
    else if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) valid.push('+91' + cleaned);
    else if (cleaned.length > 0) invalid.push(n);
  });

  return { valid: [...new Set(valid)], invalid };
}

const TABS = [
  { id: 'csv', label: 'CSV/Excel Upload', icon: Upload },
  { id: 'paste', label: 'Paste Numbers', icon: Phone },
  { id: 'json', label: 'JSON Upload', icon: FileText },
];

export default function BulkSms() {
  const [activeTab, setActiveTab] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [csvTasks, setCsvTasks] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvDefaultMessage, setCsvDefaultMessage] = useState('');
  const [csvDefaultClientId, setCsvDefaultClientId] = useState('BULK');
  const fileInputRef = useRef(null);

  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  const [pasteClientId, setPasteClientId] = useState('BROADCAST');
  const [pastePriority, setPastePriority] = useState(0);
  const parsedNumbers = parsePhoneNumbers(pasteText);

  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonTasks, setJsonTasks] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { tasks, errors } = parseCSV(ev.target.result);
      setCsvTasks(tasks);
      setCsvErrors(errors);
      if (tasks.length > 0) toast.success(`${tasks.length} rows parsed!`);
    };
    reader.readAsText(file);
  };

  const handleJsonChange = (val) => {
    setJsonInput(val);
    if (!val.trim()) { setJsonError(''); setJsonTasks([]); return; }
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) { setJsonError('Must be a JSON array'); setJsonTasks([]); return; }
      setJsonTasks(parsed);
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON');
      setJsonTasks([]);
    }
  };

  const handleCsvSubmit = async (e) => {
    e.preventDefault();
    if (csvTasks.length === 0) { toast.error('No tasks to submit'); return; }
    const tasks = csvTasks.map(t => ({
      recipient: t.recipient,
      message: t.message || csvDefaultMessage,
      clientId: t.clientId || csvDefaultClientId,
      priority: t.priority || 0,
    }));
    if (tasks.some(t => !t.message)) { toast.error('Some rows have no message. Set a default message.'); return; }
    setLoading(true);
    try {
      const res = await client.post('/api/admin/sms/bulk-create', { tasks });
      setResult({ count: res.data.data.count, tab: 'csv' });
      toast.success(`${res.data.data.count} tasks queued!`);
      setCsvTasks([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tasks');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = async (e) => {
    e.preventDefault();
    if (parsedNumbers.valid.length === 0) { toast.error('No valid numbers found'); return; }
    if (!pasteMessage.trim()) { toast.error('Message is required'); return; }
    setLoading(true);
    try {
      const res = await client.post('/api/admin/sms/bulk-broadcast', {
        recipients: parsedNumbers.valid,
        message: pasteMessage,
        clientId: pasteClientId,
        priority: pastePriority,
      });
      setResult({ count: res.data.data.count, tab: 'paste' });
      toast.success(`${res.data.data.count} tasks queued!`);
      setPasteText('');
      setPasteMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create broadcast');
    } finally {
      setLoading(false);
    }
  };

  const handleJsonSubmit = async (e) => {
    e.preventDefault();
    if (jsonTasks.length === 0 || jsonError) { toast.error('Invalid or empty JSON'); return; }
    setLoading(true);
    try {
      const res = await client.post('/api/admin/sms/bulk-create', { tasks: jsonTasks });
      setResult({ count: res.data.data.count, tab: 'json' });
      toast.success(`${res.data.data.count} tasks queued!`);
      setJsonInput('');
      setJsonTasks([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tasks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Bulk SMS Upload</h2>
        <p className="text-sm text-gray-500 mt-1">Upload thousands of SMS tasks at once. Max 10,000 per batch.</p>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">✅ {result.count.toLocaleString()} SMS tasks queued successfully!</p>
            <p className="text-sm text-green-600">Tasks are being distributed to online devices.</p>
          </div>
          <button onClick={() => setResult(null)} className="ml-auto text-green-600 hover:text-green-800 text-sm">Dismiss</button>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'csv' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            <strong>CSV Format:</strong>
            <code className="block mt-1 bg-blue-100 rounded p-2 text-xs">
              recipient,message,clientId,priority<br/>
              919876543210,Hello World,CLIENT_A,0<br/>
              919876543211,Hello World,CLIENT_A,0
            </code>
            <p className="mt-2">Columns: <code>recipient</code> (required), <code>message</code>, <code>clientId</code>, <code>priority</code> (optional if you set defaults below)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {csvTasks.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">{csvTasks.length.toLocaleString()} rows loaded</span>
              {csvErrors.length > 0 && <span className="text-sm text-amber-600 ml-2">({csvErrors.length} rows skipped)</span>}
            </div>
          )}

          {csvErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 max-h-32 overflow-y-auto">
              {csvErrors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
              {csvErrors.length > 5 && <div>...and {csvErrors.length - 5} more errors</div>}
            </div>
          )}

          {csvTasks.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 rows):</p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>{['Recipient', 'Message', 'Client ID', 'Priority'].map(h => <th key={h} className="px-3 py-2 text-left text-gray-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csvTasks.slice(0, 5).map((t, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-gray-800">{t.recipient}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{t.message || <span className="text-gray-400 italic">using default</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{t.clientId || <span className="text-gray-400 italic">using default</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{t.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <form onSubmit={handleCsvSubmit} className="space-y-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Message <span className="text-gray-400">(if CSV has no message column)</span></label>
                <textarea
                  value={csvDefaultMessage}
                  onChange={e => setCsvDefaultMessage(e.target.value)}
                  placeholder="Enter default message..."
                  rows={3}
                  maxLength={160}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">{csvDefaultMessage.length}/160</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Client ID</label>
                <input
                  type="text"
                  value={csvDefaultClientId}
                  onChange={e => setCsvDefaultClientId(e.target.value)}
                  placeholder="BULK"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || csvTasks.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Queuing tasks...' : `Queue ${csvTasks.length.toLocaleString()} SMS Tasks`}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'paste' && (
        <form onSubmit={handlePasteSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste Phone Numbers
              <span className="ml-2 text-xs text-gray-400">One per line, or comma/space separated. Indian 10-digit and +91 format supported.</span>
            </label>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={"919876543210\n919876543211\n919876543212\n..."}
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-4 mt-1 text-xs">
              <span className="text-green-600">✅ {parsedNumbers.valid.length.toLocaleString()} valid numbers (duplicates removed)</span>
              {parsedNumbers.invalid.length > 0 && <span className="text-red-500">❌ {parsedNumbers.invalid.length} invalid (will be skipped)</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-red-500">*</span></label>
            <textarea
              value={pasteMessage}
              onChange={e => setPasteMessage(e.target.value)}
              placeholder="Your SMS message (max 160 characters)..."
              rows={3}
              maxLength={160}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className={`text-xs mt-1 ${pasteMessage.length > 140 ? 'text-amber-500' : 'text-gray-400'}`}>{pasteMessage.length}/160</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type="text"
                value={pasteClientId}
                onChange={e => setPasteClientId(e.target.value)}
                placeholder="BROADCAST"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={pastePriority}
                onChange={e => setPastePriority(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[0, 1, 2, 3, 4, 5].map(p => (
                  <option key={p} value={p}>Priority {p}{p === 0 ? ' (Normal)' : p >= 4 ? ' (Urgent)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || parsedNumbers.valid.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : `Send to ${parsedNumbers.valid.length.toLocaleString()} Numbers`}
          </button>
        </form>
      )}

      {activeTab === 'json' && (
        <form onSubmit={handleJsonSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-600 whitespace-pre">
            {`[\n  {"recipient": "919876543210", "message": "Hello!", "clientId": "C1", "priority": 0},\n  ...\n]`}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paste JSON Array</label>
            <textarea
              value={jsonInput}
              onChange={e => handleJsonChange(e.target.value)}
              placeholder="Paste your JSON array here..."
              rows={10}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${jsonError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            {jsonError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{jsonError}
              </p>
            )}
            {jsonTasks.length > 0 && !jsonError && (
              <p className="text-xs text-green-600 mt-1">✅ {jsonTasks.length.toLocaleString()} valid tasks</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || jsonTasks.length === 0 || !!jsonError}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Queuing...' : `Queue ${jsonTasks.length.toLocaleString()} Tasks`}
          </button>
        </form>
      )}
    </div>
  );
}
