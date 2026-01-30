'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import axios from 'axios';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pharmacyId, setPharmacyId] = useState('1');
  const [popup, setPopup] = useState({ open: false, type: 'info', message: '' });
  const [loading, setLoading] = useState(false);
  const [registerBlocked, setRegisterBlocked] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("Smart Pharma");
  const [masterPin, setMasterPin] = useState('');
  const [isMasterRequested, setIsMasterRequested] = useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("pharmacy-info");
    if (saved) {
      const info = JSON.parse(saved);
      if (info.name) setPharmacyName(info.name);
    }
  }, []);

  const showPopup = (type, message) => {
    setPopup({ open: true, type, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showPopup('error', 'الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const payload = isRegister
      ? { username, password, pharmacyId, masterPin }
      : { username, password, pharmacyId };
    console.log(payload);

    setLoading(true);
    try {
      const res = await axios.post(endpoint, payload);

      if (res.data.success) {
        // Redux/Cookie handles auth status now, no need to save token manually
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
      <Paper elevation={4} sx={{
        p: 4,
        borderRadius: '24px',
        textAlign: 'center',
        bgcolor: 'var(--glass-bg)',

        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)'
      }}>
        <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>

          <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--primary)' }}>
            {pharmacyName}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
            نظام إدارة الصيدلية المتكامل
          </Typography>
        </Box>

        <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
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

            <TextField
              select
              label="اختر الصيدلية"
              value={pharmacyId}
              onChange={(e) => setPharmacyId(e.target.value)}
              SelectProps={{ native: true }}
              fullWidth
              margin="normal"
              sx={{ mb: 2 }}
            >
              <option value="1">صيدلية 1 (الرئيسية)</option>
              <option value="2">صيدلية 2 (الفرعية)</option>
            </TextField>
            {isRegister && (
              <Box sx={{ mt: 1, textAlign: 'right' }}>
                {isMasterRequested && (
                  <TextField
                    label="رقم الماستر السري"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    helperText="أدخل الكود السري للحصول على كامل الصلاحيات"
                  />
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isMasterRequested}
                      onChange={(e) => setIsMasterRequested(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="التسجيل كمسؤول للمجال (Master)"
                />

              </Box>
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
