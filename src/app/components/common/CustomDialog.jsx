import React from 'react';
import {
    Dialog,
    Paper,
    Typography,
    Box,
    Button
} from '@mui/material';

const CustomDialog = ({ open, onClose, title, message, type = 'error', onConfirm }) => {
    const isError = type === 'error';
    const bgColor = isError ? '#fff0f0' : '#f0f9ff';
    const titleColor = isError ? 'error' : 'primary';
    const buttonColor = isError ? 'error' : 'primary';

    return (
        <Dialog open={open} onClose={onClose}>
            <Paper
                elevation={4}
                sx={{
                    padding: 4,
                    borderRadius: 3,
                    textAlign: "center",
                    backgroundColor: bgColor,
                    maxWidth: 400,
                    minWidth: 300,
                    margin: "0 auto",
                }}
            >
                <Typography variant="h5" fontWeight="bold" color={titleColor}>
                    {title}
                </Typography>
                <Typography sx={{ mt: 2 }} color={isError ? "error" : "textPrimary"} fontSize="1rem">
                    {/* Allow HTML-like simple rendering if needed or just text */}
                    {typeof message === 'string' ? message : message}
                </Typography>
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button
                        variant="contained"
                        color={buttonColor}
                        onClick={onConfirm || onClose}
                    >
                        {onConfirm ? 'نعم' : 'حسناً'}
                    </Button>
                    {onConfirm && (
                        <Button
                            variant="outlined"
                            color={buttonColor}
                            onClick={onClose}
                        >
                            إلغاء
                        </Button>
                    )}
                </Box>
            </Paper>
        </Dialog>
    );
};

export default CustomDialog;
