import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  ArrowRightLeft, 
  Download, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  FileDiff, 
  AlertCircle,
  CheckCircle,
  Database,
  BarChart3,
  Search,
  Table,
  Cpu
} from 'lucide-react';

// --- CONSTANTS & DATA (Injected from your files) ---

// From: product_data_attribute_mapping_key - KEY.csv
// Columns: standard, bq_ready, SmartScout, keepa_luxfull
const MASTER_KEY_DATA = [
  { standard: "ASIN", bq: "asin", ss: "ASIN", keepa: "ASIN" },
  { standard: "Title", bq: "title", ss: "Title", keepa: "Title" },
  { standard: "Sales Rank", bq: "sales_rank_current", ss: "Main Category Rank", keepa: "Sales Rank: Current" },
  { standard: "Bullet Point 1", bq: "description_features_feature_1", ss: "", keepa: "Description & Features: Feature 1" },
  { standard: "Bullet Point 2", bq: "description_features_feature_2", ss: "", keepa: "Description & Features: Feature 2" },
  { standard: "Bullet Point 3", bq: "description_features_feature_3", ss: "", keepa: "Description & Features: Feature 3" },
  { standard: "Bullet Point 4", bq: "description_features_feature_4", ss: "", keepa: "Description & Features: Feature 4" },
  { standard: "Bullet Point 5", bq: "description_features_feature_5", ss: "", keepa: "Description & Features: Feature 5" },
  { standard: "UPC", bq: "product_codes_upc", ss: "UPC", keepa: "Product Codes: UPC" },
  { standard: "GTIN", bq: "product_codes_gtin", ss: "", keepa: "Product Codes: GTIN" },
  { standard: "Description", bq: "description_features_description", ss: "", keepa: "Description & Features: Description" },
  { standard: "Locale", bq: "locale", ss: "", keepa: "Locale" },
  { standard: "Root Category", bq: "categories_root", ss: "Main Category Name", keepa: "Categories: Root" },
  { standard: "Sub-Category", bq: "categories_sub", ss: "Primary Subcategory Name", keepa: "Categories: Sub" },
  { standard: "Rating", bq: "reviews_rating", ss: "Rating", keepa: "Reviews: Rating" },
  { standard: "Rating Count", bq: "reviews_rating_count", ss: "Listing Review Count", keepa: "Reviews: Rating Count" },
  { standard: "Main Image", bq: "image", ss: "Product Image", keepa: "Image" },
  { standard: "Short Description", bq: "description_features_short_description", ss: "", keepa: "Description & Features: Short Description" },
  { standard: "Bullet Point 6", bq: "description_features_feature_6", ss: "", keepa: "Description & Features: Feature 6" },
  { standard: "EAN", bq: "product_codes_ean", ss: "", keepa: "Product Codes: EAN" },
  { standard: "Category Tree", bq: "categories_tree", ss: "", keepa: "Categories: Tree" },
  { standard: "Adult Product", bq: "adult_product", ss: "", keepa: "Adult Product" },
  { standard: "Deal Type", bq: "deals_deal_type", ss: "", keepa: "Deals: Deal Type" },
  { standard: "Badge", bq: "deals_badge", ss: "", keepa: "Deals: Badge" },
  { standard: "Subscribe & Save", bq: "buy_box_subscribe_and_save", ss: "", keepa: "Buy Box: Subscribe & Save" },
  { standard: "Is a Variation", bq: "is_variation", ss: "Is Variation", keepa: "" },
  { standard: "SmartScout Page Score", bq: "page_score", ss: "Page Score", keepa: "" },
  { standard: "Amazon In-Stock Rate", bq: "amazon_instock_rate", ss: "Amazon In-Stock Rate", keepa: "" },
  { standard: "Is Buy Box Suppressed", bq: "buy_box_suppression", ss: "Buy Box Suppression", keepa: "" }
];

// From: product_data_attribute_mapping_key - templates (1).csv
// Updated to use Standard Values as primary headers where possible to match user request
const RAW_TEMPLATES_CSV = [
  { name: "Attribute Audit", headers: ["ASIN", "Brand", "Title", "UPC", "Manufacturer", "Size", "Bullet Point 1", "Bullet Point 2", "Bullet Point 3", "Bullet Point 4", "Bullet Point 5"] },
  { name: "Suggested vs Live", headers: ["ASIN", "Brand", "Title", "Bullet Point 1", "Bullet Point 2", "Bullet Point 3", "Bullet Point 4", "Bullet Point 5"] },
  { name: "keepa_full", headers: ["ASIN", "Title", "Sales Rank", "Bullet Point 1", "Bullet Point 2", "Bullet Point 3", "Bullet Point 4", "Bullet Point 5", "UPC", "GTIN", "Description", "Locale", "Root Category", "Sub-Category", "Rating", "Rating Count", "Main Image", "Short Description", "Bullet Point 6", "EAN", "Category Tree", "Sales Rank 30d Avg", "Sales Rank 90d Avg", "Sales Rank 365d Avg"] },
  { name: "Sales Overview", headers: ["ASIN", "Title", "Sales Rank", "Buy Box Price", "Units Sold", "Revenue", "Returns"] }, 
  { name: "Customer Service", headers: ["ASIN", "Title", "Return Rate", "Review Count", "Rating", "Feedback"] } 
];

// --- Utility Functions ---

const parseCSV = (text, delimiter = ',') => {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  // Auto-detect delimiter
  if (text.indexOf('\t') > text.indexOf(',') && text.indexOf('\t') > -1) delimiter = '\t';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; 
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      if (char === '\r' && nextChar === '\n') i++;
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }
  return rows;
};

const toCSV = (data) => {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + (row[header] || '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

// Helper: Look up the "Standard" name for any given header (bq, ss, keepa, etc.)
const getStandardName = (header) => {
  if (!header) return '';
  // Case insensitive match against any value in the row
  const match = MASTER_KEY_DATA.find(row => 
    Object.values(row).some(val => val && val.toLowerCase() === header.toLowerCase())
  );
  return match ? match.standard : header;
};

// --- Main Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState('mapper'); 
  
  // -- Mapper State --
  const [sourceData, setSourceData] = useState([]);
  const [sourceHeaders, setSourceHeaders] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(RAW_TEMPLATES_CSV[0]);
  const [mapping, setMapping] = useState({}); 
  const [fileName, setFileName] = useState('');

  // -- Comparator State --
  const [fileA, setFileA] = useState({ name: '', data: [], headers: [] });
  const [fileB, setFileB] = useState({ name: '', data: [], headers: [] });
  const [joinKey, setJoinKey] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);

  // -- Template State --
  const [templates, setTemplates] = useState(RAW_TEMPLATES_CSV);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateHeaders, setNewTemplateHeaders] = useState('');

  // -- Key Dictionary State --
  const [keySearch, setKeySearch] = useState('');

  // --------------------------------------------------------------------------
  // INTELLIGENT AUTO-MAP
  // --------------------------------------------------------------------------

  const intelligentAutoMap = () => {
    const newMapping = { ...mapping };
    
    selectedTemplate.headers.forEach(target => {
      // 1. Exact Match in Source
      const exactMatch = sourceHeaders.find(s => s.toLowerCase() === target.toLowerCase());
      if (exactMatch) {
        newMapping[target] = exactMatch;
        return;
      }

      // 2. Dictionary Lookup (The "Smart" Part)
      // Find the row in MASTER_KEY_DATA where ANY value matches the target
      const keyRow = MASTER_KEY_DATA.find(row => 
        Object.values(row).some(val => val && val.toLowerCase() === target.toLowerCase())
      );

      if (keyRow) {
        // If we found a row definition, check if any of the Source Headers exist in this row definition
        // We check all known synonyms in the keyRow against all available sourceHeaders
        const synonyms = Object.values(keyRow).filter(Boolean).map(s => s.toLowerCase());
        
        const bestSourceMatch = sourceHeaders.find(src => 
          synonyms.includes(src.toLowerCase())
        );

        if (bestSourceMatch) {
          newMapping[target] = bestSourceMatch;
        }
      }
      
      // 3. Fuzzy Fallback (if dictionary failed)
      if (!newMapping[target]) {
        const cleanTarget = target.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        const fuzzyMatch = sourceHeaders.find(source => {
          const cleanSource = source.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
          return cleanSource === cleanTarget || cleanSource.includes(cleanTarget) || cleanTarget.includes(cleanSource);
        });
        if (fuzzyMatch) newMapping[target] = fuzzyMatch;
      }
    });
    
    setMapping(newMapping);
  };

  // --------------------------------------------------------------------------
  // FILE HANDLING
  // --------------------------------------------------------------------------

  const handleFileUpload = (e, setFunc, setHeaderFunc, setNameFunc) => {
    const file = e.target.files[0];
    if (!file) return;
    if (setNameFunc) setNameFunc(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        const headers = parsed[0];
        const rows = parsed.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
        if (setHeaderFunc) setHeaderFunc(headers);
        setFunc(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadMapped = () => {
    const mappedData = sourceData.map(row => {
      const newRow = {};
      selectedTemplate.headers.forEach(header => {
        const sourceKey = mapping[header];
        newRow[header] = sourceKey ? row[sourceKey] : ''; 
      });
      return newRow;
    });

    const csv = toCSV(mappedData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapped_${fileName || 'export'}.csv`;
    a.click();
  };

  // --------------------------------------------------------------------------
  // COMPARISON LOGIC
  // --------------------------------------------------------------------------

  const runComparison = () => {
    if (!fileA.data.length || !fileB.data.length || !joinKey) return;

    const report = [];
    let matches = 0;
    let mismatches = 0;
    
    const fileBMap = new Map();
    fileB.data.forEach(row => {
      if(row[joinKey]) fileBMap.set(row[joinKey], row);
    });

    fileA.data.forEach(rowA => {
      const key = rowA[joinKey];
      if (!key) return;
      const rowB = fileBMap.get(key);
      
      if (rowB) {
        const diffs = {};
        let hasDiff = false;
        fileA.headers.forEach(h => {
          if (rowB[h] !== undefined && rowA[h] !== rowB[h]) {
            diffs[h] = { a: rowA[h], b: rowB[h] };
            hasDiff = true;
          }
        });

        if (hasDiff) {
          mismatches++;
          report.push({ key, status: 'Mismatch', diffs });
        } else {
          matches++;
        }
        fileBMap.delete(key);
      } else {
        report.push({ key, status: 'Missing in File B', diffs: null });
        mismatches++;
      }
    });

    fileBMap.forEach((rowB, key) => {
      report.push({ key, status: 'Missing in File A', diffs: null });
      mismatches++;
    });

    setComparisonResult({
      stats: { matches, mismatches, total: matches + mismatches },
      report
    });
  };

  // --------------------------------------------------------------------------
  // UI COMPONENTS
  // --------------------------------------------------------------------------

  const renderTabButton = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
        activeTab === id 
        ? 'border-indigo-500 text-indigo-400 bg-slate-900/50' 
        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100 tracking-tight">DataWrangler <span className="text-indigo-500">Pro</span></h1>
            </div>
          </div>
          <div className="flex space-x-1">
            {renderTabButton('mapper', 'Map & Transform', <ArrowRightLeft className="w-4 h-4"/>)}
            {renderTabButton('compare', 'Compare', <FileDiff className="w-4 h-4"/>)}
            {renderTabButton('templates', 'Templates', <Settings className="w-4 h-4"/>)}
            {renderTabButton('dictionary', 'Master Key', <Table className="w-4 h-4"/>)}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* --- MAPPER TAB --- */}
        {activeTab === 'mapper' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Controls */}
              <div className="md:col-span-4 space-y-6">
                
                {/* 1. Upload */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-1 shadow-xl">
                  <div className="p-5 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs mr-3 font-bold">1</div>
                      Source Data
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="border border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all group cursor-pointer">
                      <input 
                        type="file" 
                        accept=".csv,.tsv,.txt" 
                        onChange={(e) => handleFileUpload(e, setSourceData, setSourceHeaders, setFileName)} 
                        className="hidden" 
                        id="mapper-upload"
                      />
                      <label htmlFor="mapper-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-300">Upload CSV/TSV</span>
                        <span className="text-xs text-slate-500 mt-1">Keepa, SmartScout, Custom</span>
                      </label>
                    </div>
                    {fileName && (
                      <div className="mt-4 flex items-center justify-between text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                        <div className="flex items-center truncate">
                          <FileSpreadsheet className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{fileName}</span>
                        </div>
                        <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded ml-2">{sourceData.length} rows</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Template Select */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-1 shadow-xl">
                  <div className="p-5 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs mr-3 font-bold">2</div>
                      Target Template
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Select Output Schema</label>
                      <select 
                        value={selectedTemplate.name}
                        onChange={(e) => setSelectedTemplate(templates.find(t => t.name === e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm p-2.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                      >
                        {templates.map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      onClick={intelligentAutoMap}
                      disabled={!sourceData.length}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-500/20"
                    >
                      <Cpu className="w-4 h-4 mr-2" />
                      Auto-Map Columns
                    </button>
                    
                    <div className="p-3 bg-slate-950/50 rounded border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Target Columns</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTemplate.headers.slice(0, 8).map(h => {
                          const stdName = getStandardName(h);
                          return (
                            <span key={h} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700" title={h !== stdName ? `Original: ${h}` : ''}>
                              {stdName}
                            </span>
                          );
                        })}
                        {selectedTemplate.headers.length > 8 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-slate-600">+{selectedTemplate.headers.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Mapping Table */}
              <div className="md:col-span-8">
                {sourceData.length > 0 ? (
                  <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <h3 className="font-semibold text-slate-200 text-sm">Mapping Configuration</h3>
                      <button 
                        onClick={handleDownloadMapped}
                        className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </button>
                    </div>
                    <div className="overflow-auto flex-1">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-6 py-3 font-medium w-1/3">Target (Standard)</th>
                            <th className="px-6 py-3 font-medium w-1/3">Source (Input)</th>
                            <th className="px-6 py-3 font-medium w-1/3">Preview</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {selectedTemplate.headers.map((targetHeader, idx) => {
                            const standardName = getStandardName(targetHeader);
                            return (
                              <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-3 text-slate-300 font-mono text-xs">
                                  <div className="font-medium text-slate-200 text-sm">{standardName}</div>
                                  {standardName !== targetHeader && (
                                     <div className="text-[10px] text-slate-500 mt-0.5 font-normal">
                                      Output as: {targetHeader}
                                     </div>
                                  )}
                                </td>
                                <td className="px-6 py-3">
                                  <div className="relative">
                                    <select 
                                      value={mapping[targetHeader] || ''}
                                      onChange={(e) => setMapping({...mapping, [targetHeader]: e.target.value})}
                                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none appearance-none"
                                    >
                                      <option value="" className="text-slate-600">Unmapped</option>
                                      {sourceHeaders.map(src => (
                                        <option key={src} value={src}>{src}</option>
                                      ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-slate-500 text-xs italic truncate max-w-xs group-hover:text-slate-400">
                                  {mapping[targetHeader] && sourceData[0] 
                                    ? (sourceData[0][mapping[targetHeader]] || <span className="text-slate-700">Empty</span>)
                                    : <span className="text-slate-700">--</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-slate-900 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-500 p-12">
                    <ArrowRightLeft className="w-12 h-12 mb-4 opacity-20" />
                    <p>Upload a file to begin mapping</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- COMPARE TAB --- */}
        {activeTab === 'compare' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* File A */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative group hover:border-indigo-500/30 transition-colors">
                <div className="absolute top-4 right-4 bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wide">Primary</div>
                <h3 className="text-slate-200 font-medium mb-4 flex items-center">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
                  File A
                </h3>
                <input 
                  type="file" 
                  accept=".csv,.tsv" 
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700 cursor-pointer"
                  onChange={(e) => handleFileUpload(e, 
                    (d) => setFileA(prev => ({...prev, data: d})), 
                    (h) => setFileA(prev => ({...prev, headers: h})),
                    (n) => setFileA(prev => ({...prev, name: n}))
                  )}
                />
              </div>

              {/* File B */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative group hover:border-indigo-500/30 transition-colors">
                 <div className="absolute top-4 right-4 bg-orange-500/10 text-orange-400 text-[10px] px-2 py-0.5 rounded border border-orange-500/20 uppercase tracking-wide">Secondary</div>
                <h3 className="text-slate-200 font-medium mb-4 flex items-center">
                   <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
                   File B
                </h3>
                <input 
                  type="file" 
                  accept=".csv,.tsv" 
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-orange-400 hover:file:bg-slate-700 cursor-pointer"
                  onChange={(e) => handleFileUpload(e, 
                    (d) => setFileB(prev => ({...prev, data: d})), 
                    (h) => setFileB(prev => ({...prev, headers: h})),
                    (n) => setFileB(prev => ({...prev, name: n}))
                  )}
                />
              </div>
            </div>

            {/* Run Button */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Join Key (Unique ID)</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm p-2.5 outline-none focus:border-indigo-500 transition-colors"
                  value={joinKey}
                  onChange={(e) => setJoinKey(e.target.value)}
                >
                  <option value="">Select a common column...</option>
                  {fileA.headers.filter(h => fileB.headers.includes(h)).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={runComparison}
                disabled={!fileA.data.length || !fileB.data.length || !joinKey}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed h-[42px] transition-all shadow-lg shadow-indigo-500/20"
              >
                Compare
              </button>
            </div>

            {/* Comparison Results */}
            {comparisonResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 border-l-2 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Matched Rows</p>
                        <h4 className="text-2xl font-bold text-slate-100 mt-1">{comparisonResult.stats.matches}</h4>
                      </div>
                      <CheckCircle className="text-emerald-500/50 w-5 h-5"/>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 border-l-2 border-l-red-500">
                     <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Mismatches</p>
                        <h4 className="text-2xl font-bold text-slate-100 mt-1">{comparisonResult.stats.mismatches}</h4>
                      </div>
                      <AlertCircle className="text-red-500/50 w-5 h-5"/>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 border-l-2 border-l-indigo-500">
                     <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Total Rows</p>
                        <h4 className="text-2xl font-bold text-slate-100 mt-1">{comparisonResult.stats.total}</h4>
                      </div>
                      <BarChart3 className="text-indigo-500/50 w-5 h-5"/>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 sticky top-0 backdrop-blur-md z-10">
                        <tr>
                          <th className="px-6 py-3 font-medium">Key ({joinKey})</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {comparisonResult.report.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-slate-300">{item.key}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                item.status === 'Mismatch' 
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {item.diffs ? (
                                <div className="space-y-1.5">
                                  {Object.keys(item.diffs).map(col => (
                                    <div key={col} className="text-xs flex items-center space-x-2 bg-slate-950/50 p-1.5 rounded border border-slate-800/50">
                                      <span className="font-semibold text-slate-400 min-w-[100px] truncate">{col}:</span> 
                                      <div className="flex items-center space-x-2">
                                        <span className="text-red-400 line-through decoration-red-500/50 opacity-70">{item.diffs[col].a}</span>
                                        <span className="text-slate-600 text-[10px]">➜</span>
                                        <span className="text-emerald-400 font-medium">{item.diffs[col].b}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : <span className="text-slate-600 text-xs italic">Row missing entirely from one file</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TEMPLATES TAB --- */}
        {activeTab === 'templates' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               <div className="lg:col-span-1 bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
                 <h3 className="text-slate-100 font-medium mb-6 flex items-center">
                   <Plus className="w-5 h-5 mr-2 text-indigo-400" />
                   New Template
                 </h3>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                     <input 
                        type="text"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm p-2.5 focus:border-indigo-500 outline-none"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1.5">Headers (Comma Separated)</label>
                     <textarea 
                        rows="6"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm p-2.5 focus:border-indigo-500 outline-none font-mono"
                        value={newTemplateHeaders}
                        onChange={(e) => setNewTemplateHeaders(e.target.value)}
                     />
                   </div>
                   <button 
                     onClick={() => {
                        if(!newTemplateName || !newTemplateHeaders) return;
                        setTemplates([...templates, {name: newTemplateName, headers: newTemplateHeaders.split(',').map(s=>s.trim())}]);
                        setNewTemplateName(''); setNewTemplateHeaders('');
                     }}
                     className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium flex justify-center items-center shadow-lg shadow-indigo-500/20"
                   >
                     <Save className="w-4 h-4 mr-2" />
                     Save
                   </button>
                 </div>
               </div>

               <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                 <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="font-semibold text-slate-200 text-sm">Library</h3>
                 </div>
                 <div className="divide-y divide-slate-800/50">
                   {templates.map((temp, i) => (
                     <div key={i} className="p-4 hover:bg-slate-800/30 transition-colors group">
                       <div className="flex justify-between items-start mb-3">
                         <h4 className="font-medium text-slate-200">{temp.name}</h4>
                         <button 
                            onClick={() => setTemplates(templates.filter(t => t.name !== temp.name))}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       <div className="flex flex-wrap gap-1.5">
                         {temp.headers.slice(0, 12).map((h, j) => (
                           <span key={j} className="px-1.5 py-0.5 bg-slate-950 text-slate-400 text-[10px] rounded border border-slate-800 font-mono">
                             {h}
                           </span>
                         ))}
                         {temp.headers.length > 12 && (
                            <span className="px-1.5 py-0.5 text-slate-600 text-[10px]">+{temp.headers.length - 12} columns</span>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </div>
        )}

        {/* --- DICTIONARY TAB --- */}
        {activeTab === 'dictionary' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                   <h3 className="font-semibold text-slate-200 text-sm">Master Mapping Key</h3>
                   <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search key definitions..." 
                        className="bg-slate-950 border border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-sm text-slate-300 w-64 focus:border-indigo-500 outline-none"
                        onChange={(e) => setKeySearch(e.target.value.toLowerCase())}
                      />
                   </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 sticky top-0 backdrop-blur-md">
                       <tr>
                         <th className="px-6 py-3 font-medium text-indigo-400">Standard (Common)</th>
                         <th className="px-6 py-3 font-medium">BigQuery ID</th>
                         <th className="px-6 py-3 font-medium">SmartScout Header</th>
                         <th className="px-6 py-3 font-medium">Keepa Header</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/50">
                        {MASTER_KEY_DATA
                          .filter(row => !keySearch || Object.values(row).some(v => v.toLowerCase().includes(keySearch)))
                          .map((row, idx) => (
                           <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                             <td className="px-6 py-3 font-medium text-slate-200">{row.standard}</td>
                             <td className="px-6 py-3 font-mono text-xs text-slate-400">{row.bq}</td>
                             <td className="px-6 py-3 text-slate-400">{row.ss || <span className="text-slate-700">-</span>}</td>
                             <td className="px-6 py-3 text-slate-400">{row.keepa || <span className="text-slate-700">-</span>}</td>
                           </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>
           </div>
        )}

      </main>
    </div>
  );
}
