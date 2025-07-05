import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const LOGO_URL = 'https://raw.githubusercontent.com/Giri787/bluwheelz-assets/main/bluwheelz%20logo%20png.png';
const BRAND_COLOR = '#0071BC';

const BLUWHEELZ_ADDRESS = 'AltF Coworking - Suncity Success Tower, Golf Course Ext Rd, Sector 65, Gurugram, Haryana 122005';

const vehicleTypes = [
  {
    name: 'TATA Ace EV',
    monthlyCharge: 60000,
    fixedKm: 2600,
    extraKmRate: 8,
    overtimeHr: 80,
    loaderCharges: 18000,
    payload: 1000,
    cft: 210,
    referCharges: 15000,
    operationalHours: 12,
    operationDays: 26,
  },
  {
    name: 'Eicher EV',
    monthlyCharge: 90000,
    fixedKm: 2600,
    extraKmRate: 10,
    overtimeHr: 100,
    loaderCharges: 18000,
    payload: 1700,
    cft: 395,
    referCharges: 0,
    operationalHours: 12,
    operationDays: 26,
  },
];

const standardRemarks = [
  'Access: EVs are permitted entry and exit without restrictions, unless specified by local authorities.',
  'Tolls & Taxes: Toll and municipal charges are additional and billed at actuals.',
  "Deployment: Operations are within city limits or as per the client's agreed operational needs.",
  'GST: Monthly rates are exclusive of GST, which will be charged additionally as applicable.'
];

function getVehicleDefaults(typeName) {
  const found = vehicleTypes.find(v => v.name === typeName);
  return found
    ? {
        monthlyCharge: found.monthlyCharge.toString(),
        fixedKm: found.fixedKm.toString(),
        extraKmRate: found.extraKmRate.toString(),
        overtimeHr: found.overtimeHr.toString(),
        loaderCharges: found.loaderCharges.toString(),
        payload: found.payload.toString(),
        cft: found.cft.toString(),
        referCharges: found.referCharges ? found.referCharges.toString() : '',
        operationalHours: found.operationalHours ? found.operationalHours.toString() : '12',
        operationDays: found.operationDays ? found.operationDays.toString() : '26',
      }
    : { monthlyCharge: '', fixedKm: '', extraKmRate: '', overtimeHr: '', loaderCharges: '', payload: '', cft: '', referCharges: '', operationalHours: '12', operationDays: '26' };
}

function formatCustomerName(name) {
  // Remove extra spaces, capitalize each word, remove non-word chars for file name
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '');
}

export default function QuotationGenerator() {
  const exportRef = useRef();
  const [customerName, setCustomerName] = useState('');
  const [clientContactName, setClientContactName] = useState('');
  const [clientContactPhone, setClientContactPhone] = useState('');
  const [clientLocation, setClientLocation] = useState('');
  const [chargingByClient, setChargingByClient] = useState(false);
  const [parkingByClient, setParkingByClient] = useState(false);
  const [includeLoaderCharges, setIncludeLoaderCharges] = useState(true);
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [vehicles, setVehicles] = useState([
    {
      type: 'TATA Ace EV',
      ...getVehicleDefaults('TATA Ace EV'),
      refer: false,
    },
  ]);
  const [customRows, setCustomRows] = useState([]); // [{ label: '', values: ['', '', ...] }]
  const [errors, setErrors] = useState({});

  // Sort vehicle types alphabetically
  const sortedVehicleTypes = [...vehicleTypes].sort((a, b) => a.name.localeCompare(b.name));

  // Handle customer name input (auto-capitalize)
  const handleCustomerName = e => {
    let value = e.target.value;
    value = value.replace(/\b\w/g, l => l.toUpperCase());
    setCustomerName(value);
  };

  // Add new vehicle
  const handleAddVehicle = () => {
    const type = sortedVehicleTypes[0].name;
    setVehicles([
      ...vehicles,
      {
        type,
        ...getVehicleDefaults(type),
        refer: false,
      },
    ]);
    // Add empty value for each custom row for the new vehicle
    setCustomRows(rows => rows.map(row => ({ ...row, values: [...row.values, ''] })));
  };

  // Remove vehicle
  const handleRemoveVehicle = idx => {
    setVehicles(vehicles.filter((_, i) => i !== idx));
    setCustomRows(rows => rows.map(row => ({ ...row, values: row.values.filter((_, i) => i !== idx) })));
  };

  // Handle vehicle field change
  const handleVehicleChange = (idx, field, value) => {
    setVehicles(vehicles =>
      vehicles.map((v, i) => {
        if (i !== idx) return v;
        // If vehicle type changes, autofill all fields
        if (field === 'type') {
          const defaults = getVehicleDefaults(value);
          return { ...v, type: value, ...defaults, refer: false };
        }
        // For refer toggle, clear referCharges if false, autofill if true and default exists
        if (field === 'refer') {
          const referCharges = value
            ? getVehicleDefaults(v.type).referCharges || ''
            : '';
          return { ...v, refer: value, referCharges };
        }
        // For number fields, only allow positive numbers
        if ([
          'monthlyCharge',
          'fixedKm',
          'extraKmRate',
          'overtimeHr',
          'loaderCharges',
          'payload',
          'cft',
          'referCharges',
          'operationalHours',
          'operationDays',
        ].includes(field)) {
          value = value.replace(/[^\d]/g, '');
        }
        return { ...v, [field]: value };
      })
    );
  };

  // Custom row handlers
  const handleAddCustomRow = () => {
    setCustomRows([
      ...customRows,
      { label: '', values: Array(vehicles.length).fill('') },
    ]);
  };
  const handleCustomRowLabel = (idx, value) => {
    setCustomRows(rows =>
      rows.map((row, i) => (i === idx ? { ...row, label: value } : row))
    );
  };
  const handleCustomRowValue = (rowIdx, vehicleIdx, value) => {
    setCustomRows(rows =>
      rows.map((row, i) =>
        i === rowIdx
          ? { ...row, values: row.values.map((v, j) => (j === vehicleIdx ? value : v)) }
          : row
      )
    );
  };
  const handleRemoveCustomRow = idx => {
    setCustomRows(rows => rows.filter((_, i) => i !== idx));
  };

  // Validation
  const validate = () => {
    const errs = {};
    if (!customerName.trim()) errs.customerName = 'Customer name is required.';
    vehicles.forEach((v, idx) => {
      const vErr = {};
      [
        ['monthlyCharge', 'Monthly charge'],
        ['fixedKm', 'Fixed km'],
        ['extraKmRate', 'Extra km rate'],
        ['overtimeHr', 'Overtime/hr'],
        ...(includeLoaderCharges ? [['loaderCharges', 'Loader charges']] : []),
        ['payload', 'Payload'],
        ['cft', 'CFT'],
        ['operationalHours', 'Operational Hours'],
        ['operationDays', 'Operation Days'],
      ].forEach(([field, label]) => {
        if (!v[field] || Number(v[field]) <= 0) vErr[field] = `${label} required`;
      });
      if (v.refer && (!v.referCharges || Number(v.referCharges) <= 0)) {
        vErr.referCharges = 'Refer charges required';
      }
      if (Object.keys(vErr).length) errs[`vehicle${idx}`] = vErr;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!validate()) return;
    const input = exportRef.current;
    // Ensure logo is loaded with crossOrigin for html2canvas
    const logoImg = input.querySelector('img[data-logo]');
    if (logoImg) logoImg.crossOrigin = 'anonymous';
    await new Promise(res => setTimeout(res, 100)); // Give time for crossOrigin to take effect
    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true, backgroundColor: '#F0F6FB', imageTimeout: 15000 });
    const imgData = canvas.toDataURL('image/jpeg', 0.7);
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;
    const x = (pdfWidth - imgWidth) / 2;
    const y = 32;
    const fileName = `${formatCustomerName(customerName) || 'Quotation'}_Quotation.pdf`;
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');
    pdf.save(fileName);
  };

  // PNG Export
  const handleExportPNG = async () => {
    if (!validate()) return;
    const input = exportRef.current;
    // Ensure logo is loaded with crossOrigin for html2canvas
    const logoImg = input.querySelector('img[data-logo]');
    if (logoImg) logoImg.crossOrigin = 'anonymous';
    await new Promise(res => setTimeout(res, 100));
    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true, backgroundColor: '#F0F6FB', imageTimeout: 15000 });
    const fileName = `${formatCustomerName(customerName) || 'Quotation'}_Quotation.png`;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png', 0.7);
    link.click();
  };

  // Dynamic includes line for remarks (remove 'phone')
  const getIncludesLine = () => {
    let parts = ['driver', 'maintenance'];
    if (!chargingByClient) parts.splice(1, 0, 'charging'); // after driver
    if (!parkingByClient) parts.push('parking');
    return `Monthly charge includes ${parts.join(', ')}.`;
  };

  // Should show 0° Refer row?
  const showReferRow = vehicles.some(v => v.refer);

  // Quotation heading for header
  const getQuotationHeading = () => {
    const name = formatCustomerName(customerName);
    return name ? `${name}_Quotation` : 'Quotation';
  };

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-2 flex flex-col items-center">
      {/* Export Buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleExportPDF}
          className="bg-[#0071BC] text-white px-4 py-2 rounded-xl shadow text-sm hover:bg-blue-800 transition"
        >
          Export as PDF
        </button>
        <button
          onClick={handleExportPNG}
          className="bg-white border border-blue-200 text-[#0071BC] px-4 py-2 rounded-xl shadow text-sm hover:bg-blue-50 transition"
        >
          Download as PNG
        </button>
      </div>
      {/* Form Section */}
      <div className="bg-white rounded-xl shadow border border-blue-100 max-w-3xl w-full p-6 mb-6">
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#0071BC] mb-1">Customer Name</label>
          <input
            type="text"
            className="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071BC]"
            value={customerName}
            onChange={handleCustomerName}
            placeholder="Enter customer name"
            autoCapitalize="words"
          />
          {errors.customerName && <div className="text-xs text-red-500 mt-1">{errors.customerName}</div>}
        </div>
        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#0071BC] mb-1">Client Contact Name (optional)</label>
            <input
              type="text"
              className="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071BC]"
              value={clientContactName}
              onChange={e => setClientContactName(e.target.value)}
              placeholder="Contact person name"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#0071BC] mb-1">Client Contact Phone (optional)</label>
            <input
              type="text"
              className="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071BC]"
              value={clientContactPhone}
              onChange={e => setClientContactPhone(e.target.value)}
              placeholder="Contact phone number"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#0071BC] mb-1">Client Location (optional)</label>
          <input
            type="text"
            className="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071BC]"
            value={clientLocation}
            onChange={e => setClientLocation(e.target.value)}
            placeholder="Client location"
          />
        </div>
        <div className="mb-4 flex gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="chargingByClient"
              checked={chargingByClient}
              onChange={e => setChargingByClient(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="chargingByClient" className="text-xs font-semibold text-[#0071BC]">Charging provided by client</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="parkingByClient"
              checked={parkingByClient}
              onChange={e => setParkingByClient(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="parkingByClient" className="text-xs font-semibold text-[#0071BC]">Parking provided by client</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeLoaderCharges"
              checked={includeLoaderCharges}
              onChange={e => setIncludeLoaderCharges(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="includeLoaderCharges" className="text-xs font-semibold text-[#0071BC]">Include Loader Charges</label>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#0071BC] mb-1">Additional Remarks (optional)</label>
          <textarea
            className="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071BC] resize-none"
            rows={2}
            value={additionalRemarks}
            onChange={e => setAdditionalRemarks(e.target.value)}
            placeholder="Add any extra information for the quotation..."
          />
        </div>
        {/* Additional Parameters Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-[#0071BC]">Additional Parameters (optional)</div>
            <button
              type="button"
              onClick={handleAddCustomRow}
              className="bg-blue-50 border border-blue-200 text-[#0071BC] px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-100"
            >
              + Add More
            </button>
          </div>
          {customRows.length > 0 && (
            <div className="space-y-2">
              {customRows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex flex-wrap gap-2 items-end bg-blue-50 rounded-lg p-2 border border-blue-100 relative">
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomRow(rowIdx)}
                    className="absolute top-2 right-2 text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                  <div>
                    <label className="block text-xs font-medium mb-1">Parameter</label>
                    <input
                      type="text"
                      className="border border-blue-100 rounded px-2 py-1 text-sm w-32"
                      value={row.label}
                      onChange={e => handleCustomRowLabel(rowIdx, e.target.value)}
                      placeholder="e.g. Range"
                    />
                  </div>
                  {vehicles.map((v, vIdx) => (
                    <div key={vIdx}>
                      <label className="block text-xs font-medium mb-1">{v.type}</label>
                      <input
                        type="text"
                        className="border border-blue-100 rounded px-2 py-1 text-sm w-24"
                        value={row.values[vIdx] || ''}
                        onChange={e => handleCustomRowValue(rowIdx, vIdx, e.target.value)}
                        placeholder="Value"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold text-[#0071BC]">Vehicles</div>
            <button
              type="button"
              onClick={handleAddVehicle}
              className="bg-blue-50 border border-blue-200 text-[#0071BC] px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-100"
            >
              + Add Vehicle
            </button>
          </div>
          <div className="space-y-4">
            {vehicles.map((v, idx) => (
              <div key={idx} className="bg-blue-50 rounded-lg p-4 flex flex-wrap gap-4 items-end relative border border-blue-100">
                {vehicles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVehicle(idx)}
                    className="absolute top-2 right-2 text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    className="border border-blue-100 rounded px-2 py-1 text-sm"
                    value={v.type}
                    onChange={e => handleVehicleChange(idx, 'type', e.target.value)}
                  >
                    {sortedVehicleTypes.map((vt, i) => (
                      <option key={i} value={vt.name}>{vt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Monthly Charge</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-24"
                    value={v.monthlyCharge}
                    onChange={e => handleVehicleChange(idx, 'monthlyCharge', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.monthlyCharge && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].monthlyCharge}</div>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Fixed KM</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-20"
                    value={v.fixedKm}
                    onChange={e => handleVehicleChange(idx, 'fixedKm', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.fixedKm && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].fixedKm}</div>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Extra KM Rate</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-20"
                    value={v.extraKmRate}
                    onChange={e => handleVehicleChange(idx, 'extraKmRate', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.extraKmRate && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].extraKmRate}</div>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Overtime/hr</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-20"
                    value={v.overtimeHr}
                    onChange={e => handleVehicleChange(idx, 'overtimeHr', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.overtimeHr && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].overtimeHr}</div>}
                </div>
                {includeLoaderCharges && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Loader Charges</label>
                    <input
                      type="text"
                      className="border border-blue-100 rounded px-2 py-1 text-sm w-24"
                      value={v.loaderCharges}
                      onChange={e => handleVehicleChange(idx, 'loaderCharges', e.target.value)}
                    />
                    {errors[`vehicle${idx}`]?.loaderCharges && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].loaderCharges}</div>}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1">Payload (kg)</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-20"
                    value={v.payload}
                    onChange={e => handleVehicleChange(idx, 'payload', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.payload && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].payload}</div>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Volumetric Space (CFT)</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-24"
                    value={v.cft}
                    onChange={e => handleVehicleChange(idx, 'cft', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.cft && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].cft}</div>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Operational Hours</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-24"
                    value={v.operationalHours}
                    onChange={e => handleVehicleChange(idx, 'operationalHours', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.operationalHours && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].operationalHours}</div>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Operation Days</label>
                  <input
                    type="text"
                    className="border border-blue-100 rounded px-2 py-1 text-sm w-24"
                    value={v.operationDays}
                    onChange={e => handleVehicleChange(idx, 'operationDays', e.target.value)}
                  />
                  {errors[`vehicle${idx}`]?.operationDays && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].operationDays}</div>}
                </div>
                {showReferRow && (
                  <div>
                    <label className="block text-xs font-medium mb-1">0° Refer</label>
                    <input
                      type="checkbox"
                      className="ml-2"
                      checked={v.refer}
                      onChange={e => handleVehicleChange(idx, 'refer', e.target.checked)}
                    />
                  </div>
                )}
                {v.refer && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Refer Charges</label>
                    <input
                      type="text"
                      className="border border-blue-100 rounded px-2 py-1 text-sm w-24"
                      value={v.referCharges}
                      onChange={e => handleVehicleChange(idx, 'referCharges', e.target.value)}
                    />
                    {errors[`vehicle${idx}`]?.referCharges && <div className="text-xs text-red-500">{errors[`vehicle${idx}`].referCharges}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Quotation Area (exportable) */}
      <div
        ref={exportRef}
        className="bg-white rounded-xl shadow-lg border border-blue-100 max-w-3xl w-full p-8 relative"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Letterhead */}
        <div className="flex items-center gap-4 mb-6 border-b pb-4 border-blue-100">
          <img src={LOGO_URL} alt="Bluwheelz Logo" className="h-16 w-auto" data-logo crossOrigin="anonymous" />
          <div>
            <h1 className="text-2xl font-bold text-[#0071BC] tracking-wide">{getQuotationHeading()}</h1>
            <div className="text-sm text-gray-700 font-medium mt-1">{customerName || <span className="italic text-gray-400">Customer Name</span>}</div>
            {(clientContactName || clientContactPhone || clientLocation) && (
              <div className="text-xs text-gray-500 mt-1">
                {clientContactName && <span>{clientContactName}</span>}
                {clientContactName && clientContactPhone && <span> &middot; </span>}
                {clientContactPhone && <span>{clientContactPhone}</span>}
                {(clientContactName || clientContactPhone) && clientLocation && <span> &middot; </span>}
                {clientLocation && <span>{clientLocation}</span>}
              </div>
            )}
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-blue-100 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-blue-50 text-[#0071BC]">
                <th className="py-2 px-3 font-semibold text-left">Parameter</th>
                {vehicles.map((v, i) => (
                  <th key={i} className="py-2 px-3 font-semibold text-left">{v.type}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Monthly Charge', v => v.monthlyCharge ? `₹${Number(v.monthlyCharge).toLocaleString()}` : '-'],
                ['Fixed KM', v => v.fixedKm || '-'],
                ['Extra KM Rate', v => v.extraKmRate ? `₹${v.extraKmRate}` : '-'],
                ['Overtime/hr', v => v.overtimeHr ? `₹${v.overtimeHr}` : '-'],
                ...(includeLoaderCharges ? [['Loader Charges', v => v.loaderCharges ? `₹${v.loaderCharges}` : '-']] : []),
                ['Payload (kg)', v => v.payload || '-'],
                ['Volumetric Space (CFT)', v => v.cft || '-'],
                ['Operational Hours', v => v.operationalHours || '-'],
                ['Operation Days', v => v.operationDays || '-'],
              ].map(([label, fn], idx) => (
                <tr key={label} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                  <td className="py-2 px-3 font-medium text-gray-700 border-b border-blue-100">{label}</td>
                  {vehicles.map((v, i) => (
                    <td key={i} className="py-2 px-3 border-b border-blue-100">{fn(v)}</td>
                  ))}
                </tr>
              ))}
              {/* 0° Refer row only if at least one vehicle has refer selected */}
              {showReferRow && (
                <tr className={(7) % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                  <td className="py-2 px-3 font-medium text-gray-700 border-b border-blue-100">0° Refer</td>
                  {vehicles.map((v, i) => (
                    <td key={i} className="py-2 px-3 border-b border-blue-100">{v.refer ? 'Yes' : 'No'}</td>
                  ))}
                </tr>
              )}
              {/* Custom rows */}
              {customRows.filter(row => row.label.trim()).map((row, idx) => (
                <tr key={row.label + idx} className={(8 + idx) % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                  <td className="py-2 px-3 font-medium text-gray-700 border-b border-blue-100">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className="py-2 px-3 border-b border-blue-100">{val || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Remarks */}
        <div className="mt-6">
          <div className="font-semibold text-[#0071BC] mb-2">Remarks</div>
          <ul className="list-disc pl-5 text-xs text-gray-700 space-y-1">
            <li className="font-bold">{getIncludesLine()}</li>
            {standardRemarks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
            {/* Refer charges remark */}
            {vehicles.filter(v => v.refer && v.referCharges > 0).map((v, i) => (
              <li key={i + 'refer'}>₹{Number(v.referCharges).toLocaleString()} additional for 0° Refer {v.type}</li>
            ))}
            {/* Additional Remarks (only if present) */}
            {additionalRemarks.trim() && (
              <li className="font-semibold">{additionalRemarks}</li>
            )}
          </ul>
        </div>
        {/* Footer with address and BluWheelz */}
        <div className="mt-8 pt-4 border-t border-blue-100 text-xs text-gray-400 text-center">
          <div className="font-bold" style={{ color: BRAND_COLOR, fontSize: '1rem' }}>BluWheelz</div>
          <div>{BLUWHEELZ_ADDRESS}</div>
        </div>
      </div>
    </div>
  );
} 