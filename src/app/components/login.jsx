'use client';

import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [paymentPortName, setPaymentPortName] = useState('');
  const [popup, setPopup] = useState({ open: false, type: 'info', message: '' });
  const [loading, setLoading] = useState(false);
  const [registerBlocked, setRegisterBlocked] = useState(false);

  const showPopup = (type, message) => {
    setPopup({ open: true, type, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showPopup('error', 'الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    if (isRegister && !paymentPortName.trim()) {
      showPopup('error', 'الرجاء إدخال اسم بوابة الدفع');
      return;
    }

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const payload = isRegister
      ? { username, password, paymentPortName }
      : { username, password };

    setLoading(true);
    try {
      const res = await axios.post(endpoint, payload);

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        showPopup('success', isRegister ? '✅ تم التسجيل بنجاح' : '✅ تم تسجيل الدخول بنجاح');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const msg = res.data.message || 'حدث خطأ غير معروف';
        if (isRegister && msg.includes('User limit reached')) {
          setRegisterBlocked(true);
          setIsRegister(false);
          showPopup('error', '🚫 لا يمكن إنشاء مستخدمين جدد. الرجاء التواصل مع المسؤول.');
        } else {
          showPopup('error', msg);
        }
      }
    } catch (err) {
      const serverMessage =
        err?.response?.data?.message || 'حدث خطأ أثناء الاتصال بالخادم';
      if (isRegister && serverMessage.includes('User limit reached')) {
        setRegisterBlocked(true);
        setIsRegister(false);
        showPopup('error', '🚫 لا يمكن إنشاء مستخدمين جدد. الرجاء التواصل مع المسؤول.');
      } else {
        showPopup('error', serverMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" dir="rtl" sx={{ mt: 8 }}>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
        </Typography>

        {!registerBlocked && (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="اسم المستخدم"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              label="كلمة المرور"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {isRegister && (
              <TextField
                label="اسم بوابة الدفع"
                variant="outlined"
                fullWidth
                margin="normal"
                value={paymentPortName}
                onChange={(e) => setPaymentPortName(e.target.value)}
                required
              />
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : isRegister ? 'تسجيل' : 'دخول'}
            </Button>
          </Box>
        )}

        {!registerBlocked && (
          <Box mt={2} textAlign="center">
            <Typography
              variant="body2"
              sx={{ cursor: 'pointer', color: 'primary.main' }}
              onClick={() => {
                setIsRegister(!isRegister);
                setPopup({ open: false, message: '' });
              }}
            >
              {isRegister
                ? 'هل لديك حساب؟ تسجيل الدخول'
                : 'ليس لديك حساب؟ إنشاء حساب جديد'}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Popup Dialog */}
      <Dialog
        open={popup.open}
        onClose={() => setPopup({ ...popup, open: false })}
      >
        <DialogTitle>
          {popup.type === 'success'
            ? 'نجاح'
            : popup.type === 'error'
            ? 'خطأ'
            : 'معلومة'}
        </DialogTitle>
        <DialogContent>
          <Typography>{popup.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPopup({ ...popup, open: false })}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Login;
