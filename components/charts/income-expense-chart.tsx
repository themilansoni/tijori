"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { fmtCurrency } from "@/lib/calculations";
import type { IncomeExpensePoint } from "@/lib/calculations";

export function IncomeExpenseChart({ data }: { data: IncomeExpensePoint[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-2)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "var(--color-foreground)" }}
            formatter={(value, name) => [fmtCurrency(Number(value)), name === "income" ? "Income" : "Expense"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted)" }}
            formatter={(value) => (value === "income" ? "Income" : "Expense")}
          />
          <Bar dataKey="income" fill="var(--color-success)" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expense" fill="var(--color-accent)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
