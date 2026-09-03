import { createClient } from "@/lib/supabase/server";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/forms/category-form";
import { CategoryRow } from "./category-row";
import type { Category } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("type")
    .order("name");

  const expenseCategories = (categories ?? []).filter((c) => c.type === "expense") as Category[];
  const incomeCategories = (categories ?? []).filter((c) => c.type === "income") as Category[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Modal trigger={<Button>+ Add category</Button>} title="Add category">
          <CategoryForm />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Manage your own categories — nothing here is hardcoded. Deactivating keeps history intact;
        deleting is only allowed when a category has no transactions.
      </p>

      <CategoryGroup title="Expense categories" categories={expenseCategories} />
      <CategoryGroup title="Income categories" categories={incomeCategories} />
    </div>
  );
}

function CategoryGroup({ title, categories }: { title: string; categories: Category[] }) {
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
            <CategoryRow key={c.id} category={c} />
          ))}
          {inactive.length > 0 && (
            <>
              <div className="px-4 py-2 text-[11.5px] font-medium uppercase tracking-wide text-muted">
                Inactive
              </div>
              {inactive.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
