"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/forms/category-form";
import { CategoryRow } from "./category-row";
import type { Category } from "@/lib/types";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const snap = await getDocs(collection(db, "users", user.uid, "categories"));
    setCategories(
      mapDocs<Category>(snap).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Modal trigger={<Button>+ Add category</Button>} title="Add category">
          <CategoryForm onSuccess={load} />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Manage your own categories — nothing here is hardcoded. Deactivating keeps history intact;
        deleting is only allowed when a category has no transactions.
      </p>

      <CategoryGroup title="Expense categories" categories={expenseCategories} onChanged={load} />
      <CategoryGroup title="Income categories" categories={incomeCategories} onChanged={load} />
    </div>
  );
}

function CategoryGroup({
  title,
  categories,
  onChanged,
}: {
  title: string;
  categories: Category[];
  onChanged: () => void;
}) {
  const active = categories.filter((c) => c.is_active);
  const inactive = categories.filter((c) => !c.is_active);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>

      {categories.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No categories yet.
        </div>
      ) : (
        <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
          {active.map((c) => (
            <CategoryRow key={c.id} category={c} onChanged={onChanged} />
          ))}
          {inactive.length > 0 && (
            <>
              <div className="px-4 py-2 text-[11.5px] font-medium uppercase tracking-wide text-muted">
                Inactive
              </div>
              {inactive.map((c) => (
                <CategoryRow key={c.id} category={c} onChanged={onChanged} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
