import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const DEFAULT_CATEGORIES: { name: string; type: "expense" | "income" }[] = [
  { name: "Food", type: "expense" },
  { name: "Transport", type: "expense" },
  { name: "Shopping", type: "expense" },
  { name: "Bills", type: "expense" },
  { name: "Rent", type: "expense" },
  { name: "Entertainment", type: "expense" },
  { name: "Health", type: "expense" },
  { name: "Education", type: "expense" },
  { name: "Travel", type: "expense" },
  { name: "Other", type: "expense" },
  { name: "Salary", type: "income" },
  { name: "Freelance", type: "income" },
  { name: "Business", type: "income" },
  { name: "Rental Income", type: "income" },
  { name: "Interest", type: "income" },
  { name: "Other", type: "income" },
];

/** Seeds a brand-new account with the same starter categories the old handle_new_user() trigger created. */
export async function seedDefaultCategories(uid: string) {
  const batch = writeBatch(db);
  const categoriesRef = collection(db, "users", uid, "categories");
  const now = new Date().toISOString();

  for (const category of DEFAULT_CATEGORIES) {
    const ref = doc(categoriesRef);
    batch.set(ref, {
      user_id: uid,
      name: category.name,
      type: category.type,
      parent_category_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  }

  await batch.commit();
}
