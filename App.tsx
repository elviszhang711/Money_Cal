import React, { useState, useMemo, useEffect } from 'react';
import { BankStateBase, SinoPacState, CapitalState } from './types';
import MoneyInput from './components/MoneyInput';
import SummaryCard from './components/SummaryCard';
import { db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app we might show a UI notification here
}

// Icons
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);

const initialSinoPac: SinoPacState = {
  balance: 0,
  t1: 0,
  t2: 0,
  subscription: 0,
  loanLimit: 0,
  loanAvailable: 0,
  usdRate: 32.5,
  usdT1: 0,
  usdT2: 0,
};

const initialCapital: CapitalState = {
  balance: 0,
  t1: 0,
  t2: 0,
  subscription: 0,
  loanLimit: 0,
  loanAvailable: 0,
};

const App: React.FC = () => {
  const [sinoPac, setSinoPac] = useState<SinoPacState>(initialSinoPac);
  const [capital, setCapital] = useState<CapitalState>(initialCapital);
  const [showSaved, setShowSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<'Elvis' | 'Hanna'>('Elvis');
  const [isLoading, setIsLoading] = useState(false);

  // Load from Firestore whenever currentUser changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const docPath = `settlements/${currentUser}`;
      try {
        const docRef = doc(db, 'settlements', currentUser);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSinoPac(data.sinoPac || initialSinoPac);
          setCapital(data.capital || initialCapital);
        } else {
          // If no cloud data, try localStorage fallback or reset to initial
          const saved = localStorage.getItem(`settlement_calc_data_${currentUser}`);
          if (saved) {
            const { sinoPac: savedSinoPac, capital: savedCapital } = JSON.parse(saved);
            setSinoPac(savedSinoPac || initialSinoPac);
            setCapital(savedCapital || initialCapital);
          } else {
            setSinoPac(initialSinoPac);
            setCapital(initialCapital);
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, docPath);
        // Fallback to localStorage on error
        const saved = localStorage.getItem(`settlement_calc_data_${currentUser}`);
        if (saved) {
          try {
            const { sinoPac: savedSinoPac, capital: savedCapital } = JSON.parse(saved);
            setSinoPac(savedSinoPac || initialSinoPac);
            setCapital(savedCapital || initialCapital);
          } catch (err) {
            setSinoPac(initialSinoPac);
            setCapital(initialCapital);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Handlers for SinoPac
  const updateSinoPac = (field: keyof SinoPacState, value: number) => {
    setSinoPac(prev => ({ ...prev, [field]: value }));
  };

  // Handlers for Capital
  const updateCapital = (field: keyof CapitalState, value: number) => {
    setCapital(prev => ({ ...prev, [field]: value }));
  };

  const resetAll = async () => {
    if(window.confirm(`確定要清空 ${currentUser} 的所有資料嗎？`)) {
      setSinoPac(initialSinoPac);
      setCapital(initialCapital);
      localStorage.removeItem(`settlement_calc_data_${currentUser}`);
      
      const docPath = `settlements/${currentUser}`;
      try {
        await setDoc(doc(db, 'settlements', currentUser), {
          sinoPac: initialSinoPac,
          capital: initialCapital,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, docPath);
      }
    }
  };

  const saveData = async () => {
    setIsLoading(true);
    const docPath = `settlements/${currentUser}`;
    try {
      // Save to localStorage
      localStorage.setItem(`settlement_calc_data_${currentUser}`, JSON.stringify({ sinoPac, capital }));
      
      // Save to Firestore
      await setDoc(doc(db, 'settlements', currentUser), {
        sinoPac,
        capital,
        updatedAt: serverTimestamp()
      });
      
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docPath);
      alert('儲存至雲端失敗，請檢查網路連線。已儲存至本機。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Calculations ---

  // SinoPac Calculations
  const sinoPacUsdT1InTwd = Math.round(sinoPac.usdT1 * sinoPac.usdRate);
  const sinoPacUsdT2InTwd = Math.round(sinoPac.usdT2 * sinoPac.usdRate);
  
  // Revised Formula: Balance + Subscription + T1 + T2 + LoanLimit + LoanAvailable + (USD parts)
  const sinoPacProjected = useMemo(() => {
    const twdPart = sinoPac.balance + sinoPac.subscription + sinoPac.t1 + sinoPac.t2 + sinoPac.loanLimit + sinoPac.loanAvailable;
    const usdPart = sinoPacUsdT1InTwd + sinoPacUsdT2InTwd;
    return twdPart + usdPart;
  }, [sinoPac, sinoPacUsdT1InTwd, sinoPacUsdT2InTwd]);

  // Capital Calculations: Balance + Subscription + T1 + T2 + LoanLimit + LoanAvailable
  const capitalProjected = useMemo(() => {
    return capital.balance + capital.subscription + capital.t1 + capital.t2 + capital.loanLimit + capital.loanAvailable;
  }, [capital]);

  // Grand Totals
  const totalProjected = sinoPacProjected + capitalProjected;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              $
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">交割款計算機 (永豐 & 新光)</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select 
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value as 'Elvis' | 'Hanna')}
                className="block w-24 pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="Elvis">Elvis</option>
                <option value="Hanna">Hanna</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <button 
              onClick={saveData}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                showSaved 
                ? 'bg-green-600 text-white shadow-sm' 
                : isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              {isLoading && !showSaved ? (
                <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : <SaveIcon />}
              {showSaved ? '已儲存' : isLoading ? '儲存中...' : '儲存資料'}
            </button>
            <button 
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <TrashIcon /> 清空重置
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Global Summary */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
             總資產概況
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <SummaryCard 
              title="預估總可用餘額" 
              amount={totalProjected} 
              subtext="含交割、申購及借貸額度"
              color={totalProjected >= 0 ? 'green' : 'red'}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Bank 1: SinoPac */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">永豐銀行 (SinoPac)</span>
                <span className="text-xs bg-red-800 bg-opacity-50 px-2 py-0.5 rounded text-red-100">含美金交割</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-100 opacity-80">預估可用</div>
                <div className="font-bold text-xl">{new Intl.NumberFormat('zh-TW').format(sinoPacProjected)}</div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* TWD Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                  <span className="w-1.5 h-5 bg-red-600 rounded-full"></span>
                  <h3 className="font-semibold text-gray-800">台幣項目 (TWD)</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MoneyInput 
                    label="即時餘額" 
                    value={sinoPac.balance} 
                    onChange={(v) => updateSinoPac('balance', v)} 
                    placeholder="目前帳戶餘額"
                  />
                  <MoneyInput 
                    label="已扣申購款" 
                    value={sinoPac.subscription} 
                    onChange={(v) => updateSinoPac('subscription', v)} 
                    placeholder="輸入金額"
                    note="加計至預估餘額"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MoneyInput 
                    label="T+1 交割款" 
                    value={sinoPac.t1} 
                    onChange={(v) => updateSinoPac('t1', v)} 
                    note="負數 = 買進需付款 (綠)"
                    useStockColor={true}
                  />
                  <MoneyInput 
                    label="T+2 交割款" 
                    value={sinoPac.t2} 
                    onChange={(v) => updateSinoPac('t2', v)}
                    note="正數 = 賣出會入帳 (紅)" 
                    useStockColor={true}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-200">
                  <MoneyInput 
                    label="借貸可申請額度" 
                    value={sinoPac.loanLimit} 
                    onChange={(v) => updateSinoPac('loanLimit', v)} 
                    note="會加計至預估可用餘額"
                  />
                  <MoneyInput 
                    label="借貸可動用金額" 
                    value={sinoPac.loanAvailable} 
                    onChange={(v) => updateSinoPac('loanAvailable', v)} 
                    note="會加計至預估可用餘額"
                  />
                </div>
              </div>

              {/* USD Section */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-green-600 rounded-full"></span>
                    <h3 className="font-semibold text-gray-800">美金項目 (USD)</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500">即時匯率</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={sinoPac.usdRate} 
                      onChange={(e) => updateSinoPac('usdRate', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <MoneyInput 
                      label="美金 T+1 交割" 
                      value={sinoPac.usdT1} 
                      onChange={(v) => updateSinoPac('usdT1', v)} 
                      currency="USD"
                      useStockColor={true}
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                       ≈ NT$ {new Intl.NumberFormat('zh-TW').format(sinoPacUsdT1InTwd)}
                    </div>
                  </div>
                  <div>
                    <MoneyInput 
                      label="美金 T+2 交割" 
                      value={sinoPac.usdT2} 
                      onChange={(v) => updateSinoPac('usdT2', v)} 
                      currency="USD"
                      useStockColor={true}
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                       ≈ NT$ {new Intl.NumberFormat('zh-TW').format(sinoPacUsdT2InTwd)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank 2: Shin Kong */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit">
             <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">新光證券 (Shin Kong)</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-orange-100 opacity-80">預估可用</div>
                <div className="font-bold text-xl">{new Intl.NumberFormat('zh-TW').format(capitalProjected)}</div>
              </div>
            </div>

            <div className="p-6 space-y-4">
               <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                  <span className="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                  <h3 className="font-semibold text-gray-800">台幣項目 (TWD)</h3>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MoneyInput 
                  label="即時餘額" 
                  value={capital.balance} 
                  onChange={(v) => updateCapital('balance', v)} 
                  placeholder="目前帳戶餘額"
                />
                <MoneyInput 
                  label="已扣申購款" 
                  value={capital.subscription} 
                  onChange={(v) => updateCapital('subscription', v)} 
                  placeholder="輸入金額"
                  note="加計至預估餘額"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MoneyInput 
                  label="T+1 交割款" 
                  value={capital.t1} 
                  onChange={(v) => updateCapital('t1', v)} 
                  note="負數 = 買進需付款 (綠)"
                  useStockColor={true}
                />
                <MoneyInput 
                  label="T+2 交割款" 
                  value={capital.t2} 
                  onChange={(v) => updateCapital('t2', v)} 
                  note="正數 = 賣出會入帳 (紅)"
                  useStockColor={true}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-200">
                <MoneyInput 
                  label="借貸可申請額度" 
                  value={capital.loanLimit} 
                  onChange={(v) => updateCapital('loanLimit', v)} 
                   note="會加計至預估可用餘額"
                />
                <MoneyInput 
                  label="借貸可動用金額" 
                  value={capital.loanAvailable} 
                  onChange={(v) => updateCapital('loanAvailable', v)} 
                  note="會加計至預估可用餘額"
                />
              </div>
            </div>
          </div>

        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          <p>計算邏輯：即時餘額 + 已扣申購款 + 交割款(T+1/T+2) + 借貸可申請額度 + 借貸可動用金額</p>
          <p className="mt-1">永豐美金部分依手動輸入匯率即時換算為台幣並計入總額</p>
        </div>
      </main>
    </div>
  );
};

export default App;