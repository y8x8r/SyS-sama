"use client";

import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const pieColors = ["#7C3AED", "#F97316", "#10B981", "#EC4899", "#3B82F6", "#EAB308"];

export function StatisticsPage() {
  const lang = useAppStore((s) => s.lang);
  const services = useAppStore((s) => s.services);
  const customers = useAppStore((s) => s.customers);
  const employees = useAppStore((s) => s.employees);

  // Top services
  const topServicesMap = new Map<string, { count: number; revenue: number }>();
  services.forEach((s) => {
    const cur = topServicesMap.get(s.serviceType) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    const rate = s.currency === "SAR" ? 0.27 : s.currency === "YER" ? 0.0004 : 1;
    cur.revenue += s.paid * rate;
    topServicesMap.set(s.serviceType, cur);
  });
  const topServices = Array.from(topServicesMap.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Top customers
  const customerMap = new Map<string, number>();
  services.forEach((s) => {
    customerMap.set(s.customerId, (customerMap.get(s.customerId) ?? 0) + 1);
  });
  const topCustomers = Array.from(customerMap.entries())
    .map(([id, count]) => ({
      customer: customers.find((c) => c.id === id),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Employee performance
  const empPerf = employees.map((e) => ({
    name: e.fullName,
    count: services.filter((s) => s.handledByEmployeeId === e.id).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_statistics")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "ar" ? "مؤشرات الأداء والإحصائيات التفصيلية" : "KPIs and detailed statistics"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top services pie */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{tr(lang, "widget_top_services")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={topServices.map((s) => ({ name: tr(lang, `nav_${s.type}`), value: s.count }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry) => `${entry.value}`}
                  labelLine={false}
                  dataKey="value"
                >
                  {topServices.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1F2937", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top services revenue bar */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{lang === "ar" ? "الإيراد حسب الخدمة" : "Revenue by Service"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topServices.map((s) => ({ name: tr(lang, `nav_${s.type}`), revenue: Math.round(s.revenue) }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={130} />
                <Tooltip
                  contentStyle={{ background: "#1F2937", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                  cursor={{ fill: "#F3E8FF" }}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {topServices.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top customers */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{lang === "ar" ? "أفضل العملاء" : "Top Customers"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">{tr(lang, "customer_name")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "customer_number")}</TableHead>
                  <TableHead className="text-xs font-semibold text-end">{lang === "ar" ? "عدد المعاملات" : "Transactions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c) => (
                  <TableRow key={c.customer?.id} className="hover:bg-accent/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#EDE9FE] flex items-center justify-center text-[#6D28D9] font-bold text-xs">
                          {c.customer?.fullName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{c.customer?.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground num">{c.customer?.customerNumber}</TableCell>
                    <TableCell className="text-end">
                      <Badge variant="secondary" className="bg-[#F3E8FF] text-[#6D28D9] num">{c.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Employee performance */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{lang === "ar" ? "أداء الموظفين" : "Employee Performance"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={empPerf} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: "#1F2937", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                  cursor={{ fill: "#F3E8FF" }}
                />
                <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
