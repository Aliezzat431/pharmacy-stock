import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ReceiptModal = ({ open, onClose, items, total, pharmacyInfo }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogContent id="receipt-content" sx={{ p: 3, direction: 'rtl' }}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{pharmacyInfo.name || "صيدليتك"}</Typography>
                    <Typography variant="body2">{pharmacyInfo.address}</Typography>
                    <Typography variant="body2">{pharmacyInfo.phone}</Typography>
                </Box>

                <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ display: 'block' }}>التاريخ: {new Date().toLocaleString("ar-EG")}</Typography>
                    {pharmacyInfo.receiptHeader && (
                        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', fontStyle: 'italic' }}>
                            {pharmacyInfo.receiptHeader}
                        </Typography>
                    )}
                </Box>

                <Table size="small" sx={{ mb: 2 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, p: 0.5 }}>الصنف</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, p: 0.5 }}>الكمية</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, p: 0.5 }}>السعر</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell sx={{ p: 0.5 }}>{item.name}</TableCell>
                                <TableCell align="center" sx={{ p: 0.5 }}>{item.quantity} {typeof item.unit === 'object' ? item.unit.label : item.unit}</TableCell>
                                <TableCell align="center" sx={{ p: 0.5 }}>{item.total.toLocaleString()} ج.م</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>الإجمالي:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{total.toLocaleString()} ج.م</Typography>
                </Box>

                {pharmacyInfo.receiptFooter && (
                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                        {pharmacyInfo.receiptFooter}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={onClose} startIcon={<CloseIcon />}>إغلاق</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReceiptModal;
