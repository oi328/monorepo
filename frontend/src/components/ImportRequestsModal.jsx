import { useCallback, useMemo, useState } from 'react';
import { useTheme } from '../shared/context/ThemeProvider';

export default function ImportRequestsModal({ open, onClose, onImport, isRTL = false, currentUser = 'admin' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [files, setFiles] = useState([]);
  const [rows, setRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const dir = isRTL ? 'rtl' : 'ltr';

  const columns = useMemo(
    () => ['id','customerName','propertyUnit','status','priority','type','description','assignedTo','createdAt','updatedAt'],
    []
  );

  const appendLog = useCallback((message, level = 'info') => {
    setLogs((prev) => [{ ts: new Date().toISOString(), level, message, user: currentUser }, ...prev]);
  }, [setLogs, currentUser]);

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(',').map((h) => h.trim());
    const data = lines.slice(1).map((l) => {
      const vals = l.split(',');
      const obj = {};
      header.forEach((h, i) => { obj[h] = vals[i]; });
      return obj;
    });
    return data;
  };

  const handleFiles = async (fileList) => {
    const arr = Array.from(fileList || []);
    setFiles(arr);
    for (const f of arr) {
      try {
        const ext = f.name.toLowerCase().split('.').pop();
        if (ext === 'csv') {
          const text = await f.text();
          const data = parseCSV(text);
          setRows(data);
          appendLog(`CSV parsed: ${f.name} (${data.length} rows)`, 'success');
        } else if (ext === 'xlsx' || ext === 'xls') {
          const XLSX = (await import('xlsx')).default;
          const ab = await f.arrayBuffer();
          const wb = XLSX.read(ab, { type: 'array' });
          const wsName = wb.SheetNames[0];
          const ws = wb.Sheets[wsName];
          const data = XLSX.utils.sheet_to_json(ws);
          setRows(data);
          appendLog(`XLSX parsed: ${f.name} (${data.length} rows)`, 'success');
        } else {
          appendLog(`Unsupported file type: ${f.name}`, 'error');
        }
      } catch (e) {
        console.error(e);
        appendLog(`Failed to parse ${f.name}: ${e.message}`, 'error');
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const handleImport = () => {
    if (!rows.length) {
      appendLog('No rows to import', 'error');
      alert('No rows to import');
      return;
    }
    onImport?.(rows);
    appendLog(`Imported ${rows.length} row(s)`, 'success');
    alert(`Imported ${rows.length} row(s)`);
    onClose?.();
  };

  const downloadTemplate = async (type) => {
    const content = [columns.join(','), ''].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'xlsx' ? 'requests_template.csv' : 'requests_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    appendLog(`Template downloaded (${type})`, 'info');
  };

  if (!open) return null;

  return (
    <div dir={dir} className="fixed inset-0 z-[2000] flex items-start justify-center pt-20 bg-black/50">
      <div 
        className="relative max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-colors duration-200" 
        style={{ 
          backgroundColor: isDark ? '#172554' : 'white', 
          borderColor: isDark ? '#1e3a8a' : '#e5e7eb', 
          color: isDark ? 'white' : '#111827' 
        }} 
      >
        <div 
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b transition-colors duration-200"
          style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
        >
          <h2 className="text-lg font-bold" style={{ color: isDark ? 'white' : '#111827' }}>Import Requests</h2>
          <button 
            onClick={onClose} 
            className="btn btn-sm btn-circle btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="border-2 border-dashed rounded-2xl p-6 text-center transition-colors duration-300"
            style={{
              backgroundColor: isDark ? 'rgba(30, 58, 138, 0.2)' : 'rgba(255, 255, 255, 0.7)',
              borderColor: isDark ? '#3b82f6' : '#93c5fd',
              color: isDark ? '#d1d5db' : '#374151'
            }}
          >
            <p>Drag & drop CSV/XLSX files here, or click to select</p>
            <input type="file" multiple accept=".csv,.xlsx,.xls" onChange={(e) => handleFiles(e.target.files)} className="mt-3" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => downloadTemplate('csv')} className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none">Download CSV Template</button>
            <button onClick={() => downloadTemplate('xlsx')} className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none">Download XLSX Template</button>
          </div>

          <div className="overflow-auto max-h-60 border rounded" style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}>
            <table className="min-w-full text-sm">
              <thead style={{ backgroundColor: isDark ? 'rgba(30, 58, 138, 0.4)' : '#f9fafb' }}>
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-2 py-1 text-left border-b" style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#374151' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, idx) => (
                  <tr key={idx} className="transition-colors" style={{ backgroundColor: idx % 2 === 0 ? (isDark ? 'transparent' : 'white') : (isDark ? 'rgba(30, 58, 138, 0.1)' : '#f9fafb') }}>
                    {columns.map((c) => (
                      <td key={c} className="px-2 py-1 border-b" style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb', color: isDark ? '#e5e7eb' : '#1f2937' }}>{r[c]}</td>
                    ))}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={columns.length} className="px-2 py-6 text-center" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No data preview</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-xs max-h-28 overflow-auto border rounded p-2 w-1/2" style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb', backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'white' }}>
              {logs.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${l.level === 'success' ? 'bg-green-100 text-green-800' : l.level === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{l.level}</span>
                  <span style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>{l.ts}</span>
                  <span style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>{l.user}</span>
                  <span style={{ color: isDark ? 'white' : '#111827' }}>{l.message}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleImport} className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none">Import</button>
              <button onClick={onClose} className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}