export interface BankStateBase {
  balance: number;        // 即時餘額
  t1: number;             // T+1 交割款 (正負皆可)
  t2: number;             // T+2 交割款 (正負皆可)
  subscription: number;   // 已扣申購款 (通常為負項，或輸入正數程式扣除)
  loanLimit: number;      // 借貸可申請額度
  loanAvailable: number;  // 借貸可動用金額
  stockValue: number;     // 股票市值
}

export interface SinoPacState extends BankStateBase {
  usdRate: number;        // 美元匯率
  usdT1: number;          // 美金 T+1 (原幣)
  usdT2: number;          // 美金 T+2 (原幣)
  usdStockValue: number;  // 美金 股票市值 (原幣)
}

export interface CapitalState extends BankStateBase {}

export type CurrencyType = 'TWD' | 'USD';