"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Building2, Briefcase, Pencil, Trash2, CheckCircle2 } from "lucide-react";

export function AgentsCompaniesPage() {
  const lang = useAppStore((s) => s.lang);
  const agents = useAppStore((s) => s.agents);
  const companies = useAppStore((s) => s.transportCompanies);
  const addAgent = useAppStore((s) => s.addAgent);
  const updateAgent = useAppStore((s) => s.updateAgent);
  const deleteAgent = useAppStore((s) => s.deleteAgent);
  const addTransportCompany = useAppStore((s) => s.addTransportCompany);
  const updateTransportCompany = useAppStore((s) => s.updateTransportCompany);
  const deleteTransportCompany = useAppStore((s) => s.deleteTransportCompany);

  const [tab, setTab] = useState("agents");

  // Agent dialog
  const [openAgent, setOpenAgent] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState({ officeName: "", agentNumber: "", serviceType: "" });

  // Company dialog
  const [openComp, setOpenComp] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [deleteCompId, setDeleteCompId] = useState<string | null>(null);
  const [compForm, setCompForm] = useState({ companyName: "", companyNumber: "", address: "" });

  const openCreateAgent = () => {
    setAgentForm({ officeName: "", agentNumber: "", serviceType: "" });
    setEditingAgentId(null);
    setOpenAgent(true);
  };
  const openEditAgent = (a: typeof agents[0]) => {
    setAgentForm({ officeName: a.officeName, agentNumber: a.agentNumber, serviceType: a.serviceType });
    setEditingAgentId(a.id);
    setOpenAgent(true);
  };
  const saveAgent = () => {
    if (!agentForm.officeName.trim()) {
      toast.error(lang === "ar" ? "أدخل اسم المكتب" : "Enter office name");
      return;
    }
    if (editingAgentId) {
      updateAgent(editingAgentId, agentForm);
      toast.success(lang === "ar" ? "تم تحديث الوكيل فوراً" : "Agent updated immediately");
    } else {
      addAgent(agentForm);
      toast.success(lang === "ar" ? "تم اعتماد الوكيل فوراً وأصبح متاحاً في الخدمات" : "Agent approved immediately and available in services");
    }
    setOpenAgent(false);
    setAgentForm({ officeName: "", agentNumber: "", serviceType: "" });
    setEditingAgentId(null);
  };
  const confirmDeleteAgent = () => {
    if (!deleteAgentId) return;
    deleteAgent(deleteAgentId);
    setDeleteAgentId(null);
    toast.success(lang === "ar" ? "تم حذف الوكيل" : "Agent deleted");
  };

  const openCreateComp = () => {
    setCompForm({ companyName: "", companyNumber: "", address: "" });
    setEditingCompId(null);
    setOpenComp(true);
  };
  const openEditComp = (c: typeof companies[0]) => {
    setCompForm({ companyName: c.companyName, companyNumber: c.companyNumber, address: c.address });
    setEditingCompId(c.id);
    setOpenComp(true);
  };
  const saveComp = () => {
    if (!compForm.companyName.trim()) {
      toast.error(lang === "ar" ? "أدخل اسم الشركة" : "Enter company name");
      return;
    }
    if (editingCompId) {
      updateTransportCompany(editingCompId, compForm);
      toast.success(lang === "ar" ? "تم تحديث الشركة فوراً" : "Company updated immediately");
    } else {
      addTransportCompany(compForm);
      toast.success(lang === "ar" ? "تم اعتماد الشركة فوراً وأصبحت متاحة في الخدمات" : "Company approved immediately and available in services");
    }
    setOpenComp(false);
    setCompForm({ companyName: "", companyNumber: "", address: "" });
    setEditingCompId(null);
  };
  const confirmDeleteComp = () => {
    if (!deleteCompId) return;
    deleteTransportCompany(deleteCompId);
    setDeleteCompId(null);
    toast.success(lang === "ar" ? "تم حذف الشركة" : "Company deleted");
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_agents_companies")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "ar" ? "إدارة الوكلاء وشركات النقل — تعتمد الإضافات والتعديلات فوراً" : "Manage agents & transport companies — additions and edits are immediate"}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/60">
          <TabsTrigger value="agents" className="gap-2">
            <Briefcase className="w-4 h-4" />
            {lang === "ar" ? "وكلاء السفر" : "Travel Agents"}
            <span className="text-[10px] text-muted-foreground num">({agents.length})</span>
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" />
            {lang === "ar" ? "شركات النقل" : "Transport Companies"}
            <span className="text-[10px] text-muted-foreground num">({companies.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2" onClick={openCreateAgent}>
              <Plus className="w-4 h-4" />
              {tr(lang, "add")}
            </Button>
          </div>
          <Card className="border-border card-shadow">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">{lang === "ar" ? "اسم مكتب الوكيل" : "Office Name"}</TableHead>
                      <TableHead className="text-xs font-semibold">{lang === "ar" ? "الرقم" : "No."}</TableHead>
                      <TableHead className="text-xs font-semibold">{lang === "ar" ? "نوع الخدمة" : "Service Type"}</TableHead>
                      <TableHead className="text-xs font-semibold">{tr(lang, "status")}</TableHead>
                      <TableHead className="text-xs font-semibold text-end">{tr(lang, "actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                          {tr(lang, "empty_agents")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      agents.map((a) => (
                        <TableRow key={a.id} className="hover:bg-accent/30">
                          <TableCell className="font-medium text-foreground text-sm">{a.officeName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground num">{a.agentNumber}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.serviceType}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={a.isActive ? "bg-pastel-mint text-pastel-mint" : "bg-muted text-muted-foreground"}>
                              {a.isActive ? tr(lang, "active") : tr(lang, "inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title={tr(lang, "delete_agent")} onClick={() => setDeleteAgentId(a.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={tr(lang, "edit_agent")} onClick={() => openEditAgent(a)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2" onClick={openCreateComp}>
              <Plus className="w-4 h-4" />
              {tr(lang, "add")}
            </Button>
          </div>
          <Card className="border-border card-shadow">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">{lang === "ar" ? "اسم الشركة" : "Company Name"}</TableHead>
                      <TableHead className="text-xs font-semibold">{lang === "ar" ? "رقم الشركة" : "Company No."}</TableHead>
                      <TableHead className="text-xs font-semibold">{lang === "ar" ? "العنوان" : "Address"}</TableHead>
                      <TableHead className="text-xs font-semibold">{tr(lang, "status")}</TableHead>
                      <TableHead className="text-xs font-semibold text-end">{tr(lang, "actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                          {tr(lang, "empty_companies")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((c) => (
                        <TableRow key={c.id} className="hover:bg-accent/30">
                          <TableCell className="font-medium text-foreground text-sm">{c.companyName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground num">{c.companyNumber}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.address}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={c.isActive ? "bg-pastel-mint text-pastel-mint" : "bg-muted text-muted-foreground"}>
                              {c.isActive ? tr(lang, "active") : tr(lang, "inactive")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title={tr(lang, "delete_company")} onClick={() => setDeleteCompId(c.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={tr(lang, "edit_company")} onClick={() => openEditComp(c)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent dialog */}
      <Dialog open={openAgent} onOpenChange={setOpenAgent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {editingAgentId ? tr(lang, "edit_agent") : tr(lang, "add")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label className="text-xs">{lang === "ar" ? "اسم مكتب الوكيل" : "Office Name"} *</Label>
              <Input value={agentForm.officeName} onChange={(e) => setAgentForm({ ...agentForm, officeName: e.target.value })} className="bg-background mt-1" />
            </div>
            <div>
              <Label className="text-xs">{lang === "ar" ? "الرقم" : "No."}</Label>
              <Input value={agentForm.agentNumber} onChange={(e) => setAgentForm({ ...agentForm, agentNumber: e.target.value })} className="bg-background mt-1" />
            </div>
            <div>
              <Label className="text-xs">{lang === "ar" ? "نوع الخدمة" : "Service Type"}</Label>
              <Input value={agentForm.serviceType} onChange={(e) => setAgentForm({ ...agentForm, serviceType: e.target.value })} className="bg-background mt-1" placeholder={lang === "ar" ? "حج وعمرة، تأشيرات..." : "Hajj, visas..."} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpenAgent(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={saveAgent} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company dialog */}
      <Dialog open={openComp} onOpenChange={setOpenComp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingCompId ? tr(lang, "edit_company") : tr(lang, "add")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label className="text-xs">{lang === "ar" ? "اسم الشركة" : "Company Name"} *</Label>
              <Input value={compForm.companyName} onChange={(e) => setCompForm({ ...compForm, companyName: e.target.value })} className="bg-background mt-1" />
            </div>
            <div>
              <Label className="text-xs">{lang === "ar" ? "رقم الشركة" : "Company No."}</Label>
              <Input value={compForm.companyNumber} onChange={(e) => setCompForm({ ...compForm, companyNumber: e.target.value })} className="bg-background mt-1" />
            </div>
            <div>
              <Label className="text-xs">{lang === "ar" ? "العنوان" : "Address"}</Label>
              <Input value={compForm.address} onChange={(e) => setCompForm({ ...compForm, address: e.target.value })} className="bg-background mt-1" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpenComp(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={saveComp} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteAgentId} onOpenChange={(o) => !o && setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(lang, "delete_agent")}</AlertDialogTitle>
            <AlertDialogDescription>{tr(lang, "confirm_delete_agent")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr(lang, "cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tr(lang, "action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCompId} onOpenChange={(o) => !o && setDeleteCompId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(lang, "delete_company")}</AlertDialogTitle>
            <AlertDialogDescription>{tr(lang, "confirm_delete_company")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr(lang, "cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteComp} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tr(lang, "action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
