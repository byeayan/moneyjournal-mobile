export type GoalStatus = 'active' | 'completed';

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  status: GoalStatus;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export type LiabilityType = 'debt' | 'emi' | 'rent';

export interface LiabilityItem {
  id: string;
  title: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  type: LiabilityType;
  createdAt: string;
  updatedAt: string;
}

export interface GoalSavingsEntry {
  id: string;
  goalId: string;
  amount: number;
  kind: 'deposit' | 'withdrawal';
  createdAt: string;
}

export interface LiabilityPaymentEntry {
  id: string;
  liabilityId: string;
  amount: number;
  monthKey: string; // YYYY-MM
  createdAt: string;
}
