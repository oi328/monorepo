import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const TYPES = ['Inquiry','Maintenance','Booking'];
const PRIORITIES = ['Low','Medium','High'];
const STATUSES = ['Pending','In Progress','Approved','Rejected'];
const PROPERTIES = ['Palm Residency','Green Villas','Blue Towers','Sunset Apartments'];
const UNITS = ['A-01','A-08','A-12','V-7','T-22','S-9'];
const PRODUCTS = ['AC Unit','Water Pump','Light Fixture','Heater'];
const QUANTITIES = ['1','2','3','4','5','6','7','8','9','10'];
const PAYMENT_PLANS = ['Plan A','Plan B','Monthly','Quarterly'];

function DropZone({ onFiles, label }) {
  return (
    <div
      onDrop={(e) => { e.preventDefault(); onFiles(Array.from(e.dataTransfer.files)); }}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded p-4 text-center text-gray-600 dark:text-gray-300"
    >
      <p>{label}</p>
      <input type="file" multiple onChange={(e) => onFiles(Array.from(e.target.files))} className="mt-2" />
    </div>
  );
}

export default function CreateRequestModal({ open, onClose, onSave, initial = {}, isRTL = false }) {
  const [type, setType] = useState(initial.type || TYPES[0]);
  const [customerName, setCustomerName] = useState(initial.customerName || '');
  const [propertyUnit, setPropertyUnit] = useState(initial.propertyUnit || '');
  const [property, setProperty] = useState('');
  const [unit, setUnit] = useState('');
  const [priority, setPriority] = useState(initial.priority || PRIORITIES[1]);
  const [status, setStatus] = useState(initial.status || STATUSES[0]);
  const [description, setDescription] = useState(initial.description || '');
  const [assignedTo, setAssignedTo] = useState(initial.assignedTo || '');
  const [paymentPlan, setPaymentPlan] = useState(initial.paymentPlan || '');
  const [product, setProduct] = useState(initial.product || '');
  const [quantity, setQuantity] = useState(Number(initial.quantity || ''));
  const [attachments, setAttachments] = useState([]);
  const [tab, setTab] = useState('basic');
  const dir = isRTL ? 'rtl' : 'ltr';

  const getInventoryMode = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('systemPrefs') : null;
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs && typeof prefs.inventoryMode === 'string') return prefs.inventoryMode;
      }
    } catch {}
    return 'project';
  };
  const inventoryMode = useMemo(() => getInventoryMode(), []);
  const showPU = inventoryMode === 'project';
  const showPQ = inventoryMode === 'product';

  const canSave = useMemo(() => customerName && type && priority, [customerName, type, priority]);

  const handleSave = () => {
    if (!canSave) {
      try {
        const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', source: 'create-request-modal' } })
        window.dispatchEvent(evt)
      } catch {}
      return;
    }
    const composedPU = property || unit ? `${property}${unit ? ' ' + unit : ''}` : (initial.propertyUnit || propertyUnit || '');
    const payload = {
      id: initial.id || Math.floor(Math.random() * 100000),
      type, customerName, propertyUnit: composedPU, priority, status,
      description, assignedTo, paymentPlan,
      product, quantity: Number.isFinite(Number(quantity)) ? Number(quantity) : undefined,
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments,
    };
    onSave?.(payload);
    onClose?.();
  };

  if (!open) return null;

  return createPortal(
    <div dir={dir} className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 overflow-y-auto p-4">
      <div className="bg-white dark:bg-slate-950 text-[var(--content-text)] border border-[var(--border-color)] rounded-lg shadow-lg w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--content-text)]">{initial.id ? 'Edit Request' : 'Add Request'}</h2>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-red-500"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
          {['basic','attachments','notes'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded transition-colors
                ${tab === t
                  ? 'bg-[var(--btn-primary-bg)] text-white hover:bg-[var(--btn-primary-hover)]'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--btn-ghost-hover)]'}
              `}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm  dark:text-gray-300">Customer Name</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600  dark:bg-gray-800 p-2" placeholder="Customer Name" />
            </div>
            <div>
              <label className="text-sm  dark:text-gray-300">Type</label>
              <div className="relative">
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600  dark:bg-gray-800 p-2 appearance-none">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
              </div>
            </div>
            <div>
              <label className="text-sm  dark:text-gray-300">Priority</label>
              <div className="relative">
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 p-2 appearance-none">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
              </div>
            </div>
            {showPU && (
              <div>
                <label className="text-sm  dark:text-gray-300">Property</label>
                <div className="relative">
                  <select value={property} onChange={(e) => setProperty(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600  dark:bg-gray-800 p-2 appearance-none">
                    <option value="">Select Property</option>
                    {PROPERTIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
                </div>
              </div>
            )}
            {showPU && (
              <div>
                <label className="text-sm  dark:text-gray-300">Unit</label>
                <div className="relative">
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600  dark:bg-gray-800 p-2 appearance-none">
                    <option value="">Select Unit</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
                </div>
              </div>
            )}
            {showPQ && (
              <div>
                <label className="text-sm  dark:text-gray-300">Product</label>
                <div className="relative">
                  <select value={product} onChange={(e) => setProduct(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600  dark:bg-gray-800 p-2 appearance-none">
                    <option value="">Select Product</option>
                    {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
                </div>
              </div>
            )}
            {showPQ && (
              <div>
                <label className="text-sm  dark:text-gray-300">Quantity</label>
                <div className="relative">
                  <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 p-2 appearance-none">
                    <option value="">Select Quantity</option>
                    {QUANTITIES.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                  <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm  dark:text-gray-300">Payment Plan</label>
              <div className="relative">
                <select value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600  dark:bg-gray-800 p-2 appearance-none">
                  <option value="">Select Payment Plan</option>
                  {PAYMENT_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
              </div>
            </div>
            <div>
              <label className="text-sm  dark:text-gray-300">Status</label>
              <div className="relative">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600  dark:bg-gray-800 p-2 appearance-none">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2  dark:text-gray-500 pointer-events-none`} />
              </div>
            </div>
            <div>
              <label className="text-sm dark:text-gray-300">Assigned To</label>
              <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 p-2" placeholder="e.g. John Doe" />
            </div>
          </div>
        )}

        {tab === 'attachments' && (
          <div className="flex flex-col gap-3">
            <DropZone label="Drag & drop attachments or click to upload" onFiles={(fl) => setAttachments((prev) => [...prev, ...fl])} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {attachments.map((f, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded p-2 text-sm flex items-center justify-between">
                  <span className=" dark:text-gray-200">{f.name}</span>
                  <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-600">Remove</button>
                </div>
              ))}
              {!attachments.length && (
                <div className=" dark:text-white text-sm">No attachments</div>
              )}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div>
            <label className="text-sm  dark:text-gray-300">Description / Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 p-2" placeholder="Enter description" />
          </div>
        )}

        <div className={`flex items-center gap-2 justify-end`}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none font-medium"
          >
            {initial.id ? (isRTL ? 'حفظ التعديلات' : 'Save Changes') : (isRTL ? 'إنشاء الطلب' : 'Create Request')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
