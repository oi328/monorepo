import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../shared/context/ThemeProvider';
import { FaBuilding, FaTimes, FaSave } from 'react-icons/fa';
import { projectsData } from '../data/projectsData';
import { getUnitsForProject } from '../data/unitsData';

const SmartAmountInput = ({ 
  label, 
  value, 
  baseAmount, 
  onChange, 
  showToggle = true, 
  placeholder, 
  isRTL, 
  isLight,
  inputClass, 
  labelClass 
}) => {
  const [mode, setMode] = useState('amount'); // 'amount' or 'percent'

  const handleAmountChange = (e) => {
    onChange(e.target.value);
  };

  const handlePercentChange = (e) => {
    const percent = parseFloat(e.target.value);
    if (!isNaN(percent) && baseAmount) {
      const calculated = (parseFloat(baseAmount) * percent) / 100;
      onChange(calculated.toFixed(2));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className={labelClass}>{label}</label>
        {showToggle && (
          <select 
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={`text-xs border rounded px-2 py-0.5 outline-none transition-colors cursor-pointer ${
              isLight 
                ? 'bg-white border-gray-300 text-gray-700 focus:border-blue-500' 
                : 'bg-slate-800 border-slate-600 text-gray-300 focus:border-blue-500'
            }`}
          >
            <option value="amount">{isRTL ? 'قيمة' : 'Amount'}</option>
            <option value="percent">{isRTL ? 'نسبة' : 'Percentage'}</option>
          </select>
        )}
      </div>
      {mode === 'amount' ? (
        <input
          type="number"
          className={inputClass}
          value={value}
          onChange={handleAmountChange}
          placeholder={placeholder}
        />
      ) : (
        <div className="relative">
          <input
            type="number"
            className={inputClass}
            placeholder={isRTL ? "النسبة المئوية" : "Percentage"}
            onChange={handlePercentChange}
          />
          <span className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-gray-400 pointer-events-none`}>%</span>
        </div>
      )}
    </div>
  );
};

const PaymentPlanModal = ({ isOpen, onClose, onSave, lead }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isRTL = i18n.dir() === 'rtl';

  const inputClass = `w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
    isLight 
      ? 'bg-white border-gray-300 text-gray-900 focus:border-blue-500' 
      : 'bg-slate-800 border-slate-600 text-white focus:border-blue-500'
  }`;
  
  const labelClass = `block text-sm font-medium mb-1 ${
    isLight ? 'text-gray-700' : 'text-gray-300'
  }`;

  const [formData, setFormData] = useState({
    projectName: '',
    unitNo: '',
    totalAmount: '',
    downPayment: '',
    receiptAmount: '',
    installmentAmount: '',
    noOfMonths: '',
    extraInstallments: '',
    garageAmount: '',
    maintenanceAmount: '',
    netAmount: ''
  });

  const [projectUnits, setProjectUnits] = useState([]);

  // Auto-calculate Net Amount based on Total + Garage + Maintenance
  useEffect(() => {
    const total = parseFloat(formData.totalAmount) || 0;
    const garage = parseFloat(formData.garageAmount) || 0;
    const maintenance = parseFloat(formData.maintenanceAmount) || 0;
    const calculatedNet = total + garage + maintenance;
    
    // Only update if value is different to avoid infinite loops
    // and only if at least one value is set
    if (formData.totalAmount || formData.garageAmount || formData.maintenanceAmount) {
       setFormData(prev => {
         // Avoid update if value hasn't effectively changed
         if (parseFloat(prev.netAmount) === calculatedNet) return prev;
         return { ...prev, netAmount: calculatedNet }
       });
    }
  }, [formData.totalAmount, formData.garageAmount, formData.maintenanceAmount]);

  // Auto-calculate Extra Installments
  useEffect(() => {
    const net = parseFloat(formData.netAmount) || 0;
    const dp = parseFloat(formData.downPayment) || 0;
    const receipt = parseFloat(formData.receiptAmount) || 0;
    const inst = parseFloat(formData.installmentAmount) || 0;
    const months = parseFloat(formData.noOfMonths) || 0;
    
    // Only run if we have a net amount to work with
    if (net > 0) {
        const totalRegular = inst * months;
        const calculatedExtra = net - dp - receipt - totalRegular;
        
        // Update if different
        setFormData(prev => {
            // Round to 2 decimal places to avoid floating point jitter
            const roundedExtra = Math.round(calculatedExtra * 100) / 100;
            if (parseFloat(prev.extraInstallments) === roundedExtra) return prev;
            return { ...prev, extraInstallments: roundedExtra > 0 ? roundedExtra : 0 };
        });
    }
  }, [formData.netAmount, formData.downPayment, formData.receiptAmount, formData.installmentAmount, formData.noOfMonths]);

  useEffect(() => {
    if (lead?.paymentPlan) {
      setFormData(lead.paymentPlan);
      if (lead.paymentPlan.projectName) {
        setProjectUnits(getUnitsForProject(lead.paymentPlan.projectName));
      }
    }
  }, [lead]);

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setFormData(prev => {
      const newData = { ...prev, [field]: val };
      
      // Handle project change to update units
      if (field === 'projectName') {
        setProjectUnits(getUnitsForProject(val));
        newData.unitNo = ''; // Reset unit when project changes
      }
      
      return newData;
    });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl transform transition-all ${isLight ? 'bg-white' : 'bg-slate-900 border border-slate-700'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isLight ? 'border-gray-100' : 'border-slate-800'}`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
            <FaBuilding className="text-blue-500" />
            {isRTL 
              ? (lead?.paymentPlan ? 'تعديل خطة الدفع' : 'إضافة خطة دفع') 
              : (lead?.paymentPlan ? 'Edit Payment Plan' : 'Add Payment Plan')}
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Project & Unit Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{isRTL ? 'اسم المشروع' : 'Project Name'}</label>
              <select 
                className={inputClass} 
                value={formData.projectName} 
                onChange={handleChange('projectName')}
              >
                <option value="">{isRTL ? 'اختر المشروع' : 'Select Project'}</option>
                {projectsData.map((project, idx) => (
                  <option key={idx} value={project.name}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{isRTL ? 'رقم الوحدة' : 'Unit No.'}</label>
              <select 
                className={inputClass} 
                value={formData.unitNo} 
                onChange={handleChange('unitNo')}
                disabled={!formData.projectName}
              >
                <option value="">{isRTL ? 'اختر الوحدة' : 'Select Unit'}</option>
                {projectUnits.map((unit, idx) => (
                  <option key={idx} value={unit.unitNo}>
                    {unit.unitNo} - {unit.type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`h-px w-full ${isLight ? 'bg-gray-100' : 'bg-slate-800'}`}></div>

          {/* Financials */}
          <div className="space-y-4">
            {/* Total Amount */}
            <div>
              <SmartAmountInput 
                isLight={isLight}
                label={isRTL ? 'السعر الإجمالي' : 'Total Amount'}
                value={formData.totalAmount} 
                onChange={(val) => setFormData(prev => ({ ...prev, totalAmount: val }))}
                showToggle={false}
                placeholder="0.00"
                isRTL={isRTL}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            </div>

            {/* Down Payment & Receipt Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <SmartAmountInput 
                  isLight={isLight}
                  label={isRTL ? 'المقدم' : 'Down Payment'}
                  value={formData.downPayment} 
                  baseAmount={formData.totalAmount}
                  onChange={(val) => setFormData(prev => ({ ...prev, downPayment: val }))}
                  placeholder="0.00"
                  isRTL={isRTL}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              </div>
              <div>
                <SmartAmountInput 
                  isLight={isLight}
                  label={isRTL ? 'قيمة الإيصال' : 'Receipt Amount'}
                  value={formData.receiptAmount} 
                  baseAmount={formData.totalAmount}
                  onChange={(val) => setFormData(prev => ({ ...prev, receiptAmount: val }))}
                  placeholder="0.00"
                  isRTL={isRTL}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              </div>
            </div>

            {/* Installments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <SmartAmountInput 
                  isLight={isLight}
                  label={isRTL ? 'قيمة القسط' : 'Installment Amount'}
                  value={formData.installmentAmount} 
                  baseAmount={formData.totalAmount}
                  onChange={(val) => setFormData(prev => ({ ...prev, installmentAmount: val }))}
                  placeholder="0.00"
                  isRTL={isRTL}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              </div>
              <div>
                <label className={labelClass}>{isRTL ? 'عدد الأشهر' : 'No. of Months'}</label>
                <input 
                  type="number" 
                  className={inputClass} 
                  value={formData.noOfMonths} 
                  onChange={handleChange('noOfMonths')}
                  placeholder="12"
                />
              </div>
            </div>

            {/* Extra Installments */}
            <div>
              <SmartAmountInput 
                isLight={isLight}
                label={isRTL ? 'أقساط إضافية' : 'Extra Installments'}
                value={formData.extraInstallments} 
                baseAmount={formData.totalAmount}
                onChange={(val) => setFormData(prev => ({ ...prev, extraInstallments: val }))}
                placeholder="0.00"
                isRTL={isRTL}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            </div>

            {/* Garage & Maintenance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <SmartAmountInput 
                  isLight={isLight}
                  label={isRTL ? 'قيمة الجراج' : 'Garage Amount'}
                  value={formData.garageAmount} 
                  onChange={(val) => setFormData(prev => ({ ...prev, garageAmount: val }))}
                  showToggle={false}
                  placeholder="0.00"
                  isRTL={isRTL}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              </div>
              <div>
                <SmartAmountInput 
                  isLight={isLight}
                  label={isRTL ? 'قيمة الصيانة' : 'Maintenance Amount'}
                  value={formData.maintenanceAmount} 
                  baseAmount={formData.totalAmount}
                  onChange={(val) => setFormData(prev => ({ ...prev, maintenanceAmount: val }))}
                  placeholder="0.00"
                  isRTL={isRTL}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              </div>
            </div>

            {/* Net Amount */}
            <div>
              <SmartAmountInput 
                isLight={isLight}
                label={isRTL ? 'الصافي' : 'Net Amount'}
                value={formData.netAmount} 
                onChange={(val) => setFormData(prev => ({ ...prev, netAmount: val }))}
                showToggle={false}
                placeholder="0.00"
                isRTL={isRTL}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 gap-3">
            <button 
              onClick={onClose}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaSave />
              {isRTL ? 'حفظ' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentPlanModal;
