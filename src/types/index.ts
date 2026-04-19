export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'expense' | 'income';
  createdAt: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string | null;
  categoryName: string | null;
  title: string | null;
  note: string | null;
  location: string | null;
  withPerson: string | null;
  date: number;
  createdAt: number;
  updatedAt: number;
}
