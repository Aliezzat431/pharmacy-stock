"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import {
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";
import Cookies from "js-cookie";
import { supabase } from "../lib/supabase";

import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";

import { cn } from "@/lib/utils";

/* ---------------- helpers ---------------- */

const safeArray = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);

const getExpiryStatus = (date) => {
  if (!date) return "none";

  const diff = new Date(date) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 90) return "warning";
  return "ok";
};

/* ---------------- expiry badge ---------------- */

const ExpiryBadge = ({ expiryDate }) => {
  const status = getExpiryStatus(expiryDate);

  if (status === "none") return <span className="text-xs opacity-40">—</span>;

  const days = Math.ceil(
    (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const cls = {
    expired: "text-red-500",
    critical: "text-orange-500",
    warning: "text-yellow-500",
    ok: "text-green-500",
  };

  return (
    <span className={cn("text-xs font-bold", cls[status])}>
      {status} {status !== "ok" && `(${days}d)`}
    </span>
  );
};

/* ---------------- main ---------------- */

const Stock = () => {
  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("all");

  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const [openModal, setOpenModal] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState(null);

  const [batchEntryTarget, setBatchEntryTarget] = useState(null);

  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const [invoiceDetails, setInvoiceDetails] = useState({
    supplier: "",
    invoiceNumber: "",
  });

  const [loading, setLoading] = useState(false);

  /* ---------------- suppliers ---------------- */

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = Cookies.get("token");

        const res = await axios.get("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setSuppliers(safeArray(res.data?.suppliers));
      } catch (e) {
        console.error(e);
        setSuppliers([]);
      }
    };

    fetchSuppliers();
  }, []);

  /* ---------------- fetch products ---------------- */

  const fetchBatches = async (query = "", mode = "all") => {
    try {
      const token = Cookies.get("token");

      const res = await axios.get("/api/search", {
        params: {
          q: query || undefined,
          mode,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const products = safeArray(res.data?.products);

      const normalized = products.map((p) => ({
        ...p,
        batchId: p.batchId || p._id,
        quantity: Number(p.quantity) || 0,
        price: Number(p.price) || 0,
      }));

      setBatches(normalized);
    } catch (e) {
      console.error(e);
      setBatches([]);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBatches(searchTerm, searchMode);
    }, 300);

    return () => clearTimeout(t);
  }, [searchTerm, searchMode]);

  /* ---------------- realtime ---------------- */

  useEffect(() => {
    const channel = supabase
      .channel("stock_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => fetchBatches(searchTerm, searchMode)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [searchTerm, searchMode]);

  /* ---------------- grouping ---------------- */

  const groupedProducts = useMemo(() => {
    const map = {};

    safeArray(batches).forEach((b) => {
      const id = b._id;

      if (!map[id]) {
        map[id] = {
          productId: id,
          name: b.name,
          batches: [],
          totalQuantity: 0,
          lowestPrice: Infinity,
        };
      }

      map[id].batches.push(b);
      map[id].totalQuantity += b.quantity;
      map[id].lowestPrice = Math.min(map[id].lowestPrice, b.price);
    });

    return Object.values(map);
  }, [batches]);

  /* ---------------- update batch ---------------- */

  const updateBatchState = (id, changes) => {
    setBatches((prev) =>
      prev.map((b) => (b.batchId === id ? { ...b, ...changes } : b))
    );
  };

  /* ---------------- toggle ---------------- */

  const toggleProduct = (id) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ---------------- delete ---------------- */

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const token = Cookies.get("token");

      await axios.delete(`/api/products?id=${deleteId.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("تم الحذف");
      fetchBatches(searchTerm, searchMode);
      setDeleteId(null);
    } catch (e) {
      toast.error("فشل الحذف");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6" dir="rtl">

      {/* search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث..."
          />
        </div>

        <Button onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4 ml-2" />
          منتج
        </Button>
      </div>

      {/* table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>السعر</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {groupedProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-6">
                لا يوجد بيانات
              </TableCell>
            </TableRow>
          ) : (
            groupedProducts.map((p) => {
              const open = expandedProducts.has(p.productId);

              return (
                <React.Fragment key={p.productId}>
                  <TableRow onClick={() => toggleProduct(p.productId)}>
                    <TableCell>
                      {open ? <ChevronDown /> : <ChevronRight />} {p.name}
                    </TableCell>
                    <TableCell>{p.totalQuantity}</TableCell>
                    <TableCell>{p.lowestPrice}</TableCell>
                  </TableRow>

                  {open &&
                    p.batches.map((b) => (
                      <TableRow key={b.batchId}>
                        <TableCell>دفعة</TableCell>

                        <TableCell>
                          <Input
                            value={b.quantity}
                            onChange={(e) =>
                              updateBatchState(b.batchId, {
                                quantity: e.target.value,
                              })
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <Input
                            value={b.price}
                            onChange={(e) =>
                              updateBatchState(b.batchId, {
                                price: e.target.value,
                              })
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <ExpiryBadge expiryDate={b.expiryDate} />
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <AlertTriangle className="text-red-500" />
          <p>تأكيد الحذف؟</p>

          <Button onClick={handleDelete}>حذف</Button>
        </DialogContent>
      </Dialog>

      {/* extras محفوظة */}
      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={editingStockProduct}
        setEditingStockProduct={setEditingStockProduct}
        onSuccess={() => fetchBatches(searchTerm, searchMode)}
      />

      <BarcodeScanner onScan={(v) => setSearchTerm(v)} />

      {batchEntryTarget && (
        <BatchEntryDialog
          open={!!batchEntryTarget}
          onClose={() => setBatchEntryTarget(null)}
          productName={batchEntryTarget?.name}
          productId={batchEntryTarget?.productId}
          suppliers={suppliers}
          onSuccess={() => fetchBatches(searchTerm, searchMode)}
        />
      )}
    </div>
  );
};

export default Stock;
