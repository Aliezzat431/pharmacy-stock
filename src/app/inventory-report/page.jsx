"use client";
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
    Box,
    Container,
    Typography,
    Paper,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    CircularProgress,
    IconButton,
    Tooltip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Divider,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import BusinessIcon from '@mui/icons-material/Business';
import ShortcomingInvoiceModal from "@/app/components/shortcomingInvoiceModal";

const InventoryReport = () => {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        shortcomings: [],
        expiringSoon: [],
        expired: [],
        threshold: 5
    });
    const [companies, setCompanies] = useState([]);
    const [filteredCompany, setFilteredCompany] = useState("all");
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [pharmacyInfo, setPharmacyInfo] = useState({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [reportRes, companiesRes, settingsRes] = await Promise.all([
                axios.get("/api/reports/inventory", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("/api/companies", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("/api/settings", {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (reportRes.data.success) {
                setReportData(reportRes.data.data);
            }
            setCompanies(companiesRes.data || []);
            if (settingsRes.data.success) {
                setPharmacyInfo(settingsRes.data.settings);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activeList = useMemo(() => {
        const list = tab === 0 ? reportData.shortcomings : tab === 1 ? reportData.expiringSoon : reportData.expired;
        if (filteredCompany === "all") return list;
        return list.filter(p => p.company === filteredCompany);
    }, [tab, reportData, filteredCompany]);

    const handleExport = (data, filename) => {
        const headers = ["الاسم", "الكمية", "الوحدة", "تاريخ الانتهاء", "الشركة"];
        const csvContent = [
            headers.join(","),
            ...data.map(p => [
                p.name,
                p.quantity,
                p.unit,
                p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("ar-EG") : "-",
                p.company || "-"
            ].join(","))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
    };

    const handlePrint = () => {
        setInvoiceOpen(true);
    };

    const renderTable = (data, type) => (
        <TableContainer className="glass-card" sx={{ mt: 2, border: '1px solid var(--glass-border)' }}>
            <Table className="modern-table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>المنتج</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية المتبقية</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>الحالة</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>تاريخ الانتهاء</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>الشركة</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((p) => (
                        <TableRow key={p._id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                            <TableCell align="center">
                                <Typography sx={{ fontWeight: 800, color: type === 'short' ? 'error.main' : 'inherit' }}>
                                    {p.quantity} {p.unit}
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                {type === 'short' ? (
                                    <Chip label="نقص مخزون" size="small" color="error" sx={{ fontWeight: 700 }} />
                                ) : type === 'expired' ? (
                                    <Chip label="منتهي" size="small" color="error" variant="filled" sx={{ fontWeight: 700 }} />
                                ) : (
                                    <Chip label="ينتهي قريباً" size="small" color="warning" sx={{ fontWeight: 700 }} />
                                )}
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("ar-EG") : "—"}
                                </Typography>
                            </TableCell>
                            <TableCell align="center">{p.company || "—"}</TableCell>
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 8, opacity: 0.6 }}>
                                لا توجد بيانات لعرضها في هذا القسم
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <Container maxWidth="lg" sx={{ py: 4, direction: 'rtl' }}>
            <Box className="no-print" sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--primary)' }}>
                        📊 تقارير المخزون والنواقص
                    </Typography>
                    <Typography variant="body2" color="text.secondary">متابعة المنتجات التي تحتاج طلبية أو شارفت على الانتهاء</Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap">
                    <IconButton onClick={fetchData} className="glass-card"><RefreshIcon /></IconButton>
                    <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                        sx={{ borderRadius: '12px', fontWeight: 700, borderWidth: 2 }}
                    >
                        طباعة فاتورة (PDF)
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => handleExport(activeList, "inventory_report")}
                        sx={{ borderRadius: '12px', fontWeight: 700 }}
                    >
                        تصدير (CSV)
                    </Button>
                </Stack>
            </Box>

            <Box className="no-print glass-card" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <BusinessIcon color="primary" />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>فلترة حسب الشركة</InputLabel>
                    <Select
                        label="فلترة حسب الشركة"
                        value={filteredCompany}
                        onChange={(e) => setFilteredCompany(e.target.value)}
                        sx={{ borderRadius: '10px' }}
                    >
                        <MenuItem value="all">كل الشركات</MenuItem>
                        {companies.map(c => <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    عدد النتائج المفلترة: {activeList.length}
                </Typography>
            </Box>

            <Box className="no-print glass-card" sx={{ bgcolor: 'var(--glass-bg)', p: 1, borderRadius: '16px', mb: 3 }}>
                <Tabs
                    value={tab}
                    onChange={(e, v) => setTab(v)}
                    variant="fullWidth"
                    sx={{ '& .MuiTabs-indicator': { height: 3, borderRadius: '3px' } }}
                >
                    <Tab
                        icon={<WarningAmberIcon />}
                        iconPosition="start"
                        label={`النواقص (${reportData.shortcomings.length})`}
                        sx={{ fontWeight: 700, minHeight: 60 }}
                    />
                    <Tab
                        icon={<EventBusyIcon />}
                        iconPosition="start"
                        label={`توشك على الانتهاء (${reportData.expiringSoon.length})`}
                        sx={{ fontWeight: 700, minHeight: 60 }}
                    />
                    <Tab
                        icon={<EventBusyIcon />}
                        iconPosition="start"
                        label={`منتهية الصلاحية (${reportData.expired.length})`}
                        sx={{ fontWeight: 700, minHeight: 60 }}
                    />
                </Tabs>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
            ) : (
                <Box sx={{ animation: 'fadeIn 0.5s ease' }}>
                    {tab === 0 && renderTable(activeList, 'short')}
                    {tab === 1 && renderTable(activeList, 'soon')}
                    {tab === 2 && renderTable(activeList, 'expired')}
                </Box>
            )}

            <ShortcomingInvoiceModal
                open={invoiceOpen}
                onClose={() => setInvoiceOpen(false)}
                items={activeList}
                pharmacyInfo={pharmacyInfo}
                companyName={filteredCompany}
            />
        </Container>
    );
};

export default InventoryReport;
