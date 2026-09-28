import React from 'react';
import { ProductCategory } from '../types';
import {
  Smartphone,
  Tv,
  ShoppingBag,
  Shirt,
  Home,
  Sparkles,
  Laptop,
  LayoutGrid,
} from 'lucide-react';

interface CategoryBarProps {
  selectedCategory: ProductCategory | null;
  onSelectCategory: (cat: ProductCategory | null) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories: { name: ProductCategory | 'All'; label: string; icon: React.ReactNode }[] = [
    { name: 'All', label: 'All Deals', icon: <LayoutGrid className="w-4 h-4" /> },
    { name: 'Phones & Tablets', label: 'Phones & Tablets', icon: <Smartphone className="w-4 h-4" /> },
    { name: 'Electronics & Audio', label: 'Electronics', icon: <Tv className="w-4 h-4" /> },
    { name: 'Supermarket & Groceries', label: 'Supermarket', icon: <ShoppingBag className="w-4 h-4" /> },
    { name: 'Fashion & Apparel', label: 'Fashion', icon: <Shirt className="w-4 h-4" /> },
    { name: 'Home & Appliances', label: 'Home Living', icon: <Home className="w-4 h-4" /> },
    { name: 'Health & Beauty', label: 'Health & Beauty', icon: <Sparkles className="w-4 h-4" /> },
    { name: 'Computing & IT', label: 'Computing', icon: <Laptop className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none py-1 mb-6">
      {categories.map((cat) => {
        const isSelected =
          cat.name === 'All' ? selectedCategory === null : selectedCategory === cat.name;

        return (
          <button
            key={cat.name}
            onClick={() => onSelectCategory(cat.name === 'All' ? null : (cat.name as ProductCategory))}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              isSelected
                ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};
