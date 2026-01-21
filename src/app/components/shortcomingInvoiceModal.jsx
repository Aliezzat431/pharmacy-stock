"use client";
import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Divider,
    IconButton,
    Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";

const ShortcomingInvoiceModal = ({ open, onClose, items, pharmacyInfo, companyName }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: '20px', minHeight: '80vh' }
            }}
        >
            <style>
                {`
                    @media print {
                        @page {
                            size: portrait;
                            margin: 5mm;
                        }
                        body * { visibility: hidden; }
                        #invoice-printable, #invoice-printable * { visibility: visible; }
                        #invoice-printable {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            direction: rtl;
                        }
                        .no-print-action { display: none !important; }
                    }
                `}
            </style>

            <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'var(--primary)', color: 'white' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>معاينة فاتورة النواقص</Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent id="invoice-printable" sx={{ p: 1.5, direction: 'rtl' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, borderBottom: '2px solid #eee', pb: 1 }}>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--primary)', mb: 0.5 }}>
                            {pharmacyInfo.name || "صيدليتك"}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{pharmacyInfo.address}</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{pharmacyInfo.phone}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>طلب شراء / نواقص</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>التاريخ: {new Date().toLocaleDateString("ar-EG")}</Typography>
                        {companyName !== "all" && (
                            <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800, color: 'var(--primary)' }}>الشركة: {companyName}</Typography>
                        )}
                    </Box>
                </Box>

                <Typography variant="body1" sx={{ mb: 1.5, fontStyle: 'italic', textAlign: 'center', display: 'block', fontWeight: 600 }}>
                    {pharmacyInfo.receiptHeader || "قائمة المنتجات المطلوب توفيرها"}
                </Typography>

                {/* Table */}
                <Table size="small" sx={{ border: '2px solid #eee' }}>
                    <TableHead sx={{ bgcolor: '#f0f0f0' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 900, border: '1px solid #ccc', py: 0.5, fontSize: '1.1rem' }}>م</TableCell>
                            <TableCell sx={{ fontWeight: 900, border: '1px solid #ccc', py: 0.5, fontSize: '1.1rem' }}>اسم المنتج</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, border: '1px solid #ccc', py: 0.5, fontSize: '1.1rem' }}>الكمية</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, border: '1px solid #ccc', py: 0.5, fontSize: '1.1rem' }}>الوحدة</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, border: '1px solid #ccc', py: 0.5, fontSize: '1.1rem' }}>الشركة</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, border: '1px solid #ccc', py: 0.5, fontSize: '1.1rem' }}>ملاحظات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell sx={{ border: '1px solid #eee', py: 0.3, fontSize: '1rem', fontWeight: 600 }}>{index + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 800, border: '1px solid #eee', py: 0.3, fontSize: '1.1rem' }}>{item.name}</TableCell>
                                <TableCell align="center" sx={{ border: '1px solid #eee', py: 0.3, fontSize: '1.1rem', fontWeight: 800 }}>{item.quantity}</TableCell>
                                <TableCell align="center" sx={{ border: '1px solid #eee', py: 0.3, fontSize: '1rem', fontWeight: 600 }}>{typeof item.unit === 'object' ? item.unit.label : item.unit}</TableCell>
                                <TableCell align="center" sx={{ border: '1px solid #eee', py: 0.3, fontSize: '1rem', fontWeight: 600 }}>{item.company || "—"}</TableCell>
                                <TableCell align="center" sx={{ border: '1px solid #eee', py: 0.3, width: '100px' }}></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Footer and Signatures */}
                <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                            إجمالي عدد الأصناف المطلوبة: {items.length} صنف
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 2, borderStyle: 'solid', borderWidth: '1px' }} />

                    <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                        <Grid item xs={4}>
                            <Typography variant="body1" sx={{ fontWeight: 900, mb: 4, display: 'block' }}>توقيع الصيدلي المسؤول</Typography>
                            <Box sx={{ borderBottom: '1.5px solid #000', width: '80%', mx: 'auto' }} />
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="body1" sx={{ fontWeight: 900, mb: 4, display: 'block' }}>توقيع المدير المسؤول</Typography>
                            <Box sx={{ borderBottom: '1.5px solid #000', width: '80%', mx: 'auto' }} />
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="body1" sx={{ fontWeight: 900, mb: 4, display: 'block' }}>توقيع المستلم / المندوب</Typography>
                            <Box sx={{ borderBottom: '1.5px solid #000', width: '80%', mx: 'auto' }} />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Box sx={{
                            border: '1.5px solid #bbb',
                            width: '90px',
                            height: '90px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            opacity: 0.5
                        }}>
                            <Typography variant="body2" sx={{ fontWeight: 900, color: '#999' }}>ختم الصيدلية</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                        <Typography variant="body1" sx={{ fontStyle: 'italic', fontWeight: 600, display: 'block' }}>{pharmacyInfo.receiptFooter || "نتمنى لكم الشفاء العاجل"}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8, fontSize: '11px', fontWeight: 700 }}>
                            تحريراً في: {new Date().toLocaleDateString("ar-EG")} | نظام إدارة الصيدلية الرقمي
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions className="no-print-action" sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{ borderRadius: '10px', px: 4, py: 1, fontWeight: 700 }}
                >
                    تأكيد والطباعة
                </Button>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px' }}>إغلاق المعاينة</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ShortcomingInvoiceModal;
