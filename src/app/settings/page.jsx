"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Paper,
  List,
  ListItem,
  Container,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Divider,
  Grid,
} from "@mui/material";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Download as DownloadIcon,
  Business as BusinessIcon,
  DisplaySettings as DisplayIcon,
  Group as GroupIcon
} from "@mui/icons-material";

export default function SettingsPage() {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [pharmacyInfo, setPharmacyInfo] = useState({
    name: "Smart Pharma",
    address: "",
    phone: "",
    currency: "ج.م",
    receiptHeader: "نعتني بصحتكم",
    receiptFooter: "نتمنى لكم الشفاء العاجل",
    lowStockThreshold: 5,
    baseCapital: 100000
  });

  const [options, setOptions] = useState({
    showCheckoutConfirm: true,
    showReturnsConfirm: true,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    loadAllSettings();

    // Load theme
    const savedTheme = localStorage.getItem("theme");
    const initialDarkMode = savedTheme === 'dark';
    setIsDarkMode(initialDarkMode);
    if (initialDarkMode) document.documentElement.classList.add('dark');

    // Load initial options from localStorage for responsiveness
    const savedOptions = localStorage.getItem("settings-options");
    if (savedOptions) setOptions(JSON.parse(savedOptions));
  }, []);

  const loadAllSettings = async () => {
    try {
      const res = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.settings) {
        setPharmacyInfo(prev => ({ ...prev, ...res.data.settings }));

        // Sync options from DB
        const dbOptions = {
          showCheckoutConfirm: res.data.settings.showCheckoutConfirm !== undefined ? (res.data.settings.showCheckoutConfirm === 'true' || res.data.settings.showCheckoutConfirm === true) : options.showCheckoutConfirm,
          showReturnsConfirm: res.data.settings.showReturnsConfirm !== undefined ? (res.data.settings.showReturnsConfirm === 'true' || res.data.settings.showReturnsConfirm === true) : options.showReturnsConfirm,
        };
        setOptions(dbOptions);

        // Sync local storage for redundancy
        localStorage.setItem("pharmacy-info", JSON.stringify(res.data.settings));
        localStorage.setItem("settings-options", JSON.stringify(dbOptions));
      } else {
        // Fallback to local storage if API fails
        const savedInfo = localStorage.getItem("pharmacy-info");
        if (savedInfo) setPharmacyInfo(prev => ({ ...prev, ...JSON.parse(savedInfo) }));
        const savedOptions = localStorage.getItem("settings-options");
        if (savedOptions) setOptions(prev => ({ ...prev, ...JSON.parse(savedOptions) }));
      }
    } catch {
      const savedInfo = localStorage.getItem("pharmacy-info");
      if (savedInfo) setPharmacyInfo(prev => ({ ...prev, ...JSON.parse(savedInfo) }));
      const savedOptions = localStorage.getItem("settings-options");
      if (savedOptions) setOptions(prev => ({ ...prev, ...JSON.parse(savedOptions) }));
    }
  };

  const saveSettingToDB = async (key, value) => {
    try {
      await axios.post('/api/settings', { key, value }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to save setting to DB", err);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleThemeChange = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? 'dark' : 'light');
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleInfoChange = (field, value) => {
    const updated = { ...pharmacyInfo, [field]: value };
    setPharmacyInfo(updated);
    localStorage.setItem("pharmacy-info", JSON.stringify(updated));
    saveSettingToDB(field, value);
    // Trigger a storage event for other components (like sidebar)
    window.dispatchEvent(new Event('storage'));
  };

  const handleOptionChange = (key) => {
    const newValue = !options[key];
    const updated = { ...options, [key]: newValue };
    setOptions(updated);
    localStorage.setItem("settings-options", JSON.stringify(updated));
    saveSettingToDB(key, newValue);
  };

  const exportData = async () => {
    try {
      const [productsRes, winningsRes] = await Promise.all([
        axios.get('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/winnings?full=true', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const backup = {
        date: new Date().toISOString(),
        pharmacy: pharmacyInfo,
        products: productsRes.data,
        winnings: winningsRes.data
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pharmacy-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      showSnackbar('تم تصدير نسخة احتياطية بنجاح', 'success');
    } catch {
      showSnackbar('فشل تصدير البيانات', 'error');
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.products || !data.winnings) {
          throw new Error("تنسيق ملف غير صالح");
        }

        const res = await axios.post('/api/settings/import', data, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          showSnackbar(res.data.message, 'success');
          if (data.pharmacy) {
            handleInfoChange('name', data.pharmacy.name || pharmacyInfo.name);
          }
        }
      } catch (err) {
        showSnackbar('فشل استيراد الملف: تأكد من صحة التنسيق', 'error');
      }
    };
    reader.readAsText(file);
  };

  const wipeData = async () => {
    try {
      const res = await axios.post('/api/settings/wipe', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showSnackbar(res.data.message, 'success');
        setWipeDialogOpen(false);
      }
    } catch {
      showSnackbar('فشل تصفير البيانات', 'error');
    }
  };

  const confirmUserDeletion = async () => {
    // Removed
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction: 'rtl' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, color: 'var(--primary)' }}>
        ⚙️ الإعدادات العامة
      </Typography>

      <Grid container spacing={3}>
        {/* Pharmacy Profile */}
        <Grid item xs={12} md={7}>
          <Paper className="glass-card" sx={{ p: 4, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BusinessIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>بيانات الصيدلية</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="اسم الصيدلية"
                  value={pharmacyInfo.name}
                  onChange={(e) => handleInfoChange('name', e.target.value)}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="العنوان"
                  value={pharmacyInfo.address}
                  onChange={(e) => handleInfoChange('address', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="رقم الهاتف"
                  value={pharmacyInfo.phone}
                  onChange={(e) => handleInfoChange('phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="العملة"
                  value={pharmacyInfo.currency}
                  onChange={(e) => handleInfoChange('currency', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="حد التذكير بنقص المخزون"
                  type="number"
                  value={pharmacyInfo.lowStockThreshold}
                  onChange={(e) => handleInfoChange('lowStockThreshold', parseInt(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="رأس المال الابتدائي"
                  type="number"
                  value={pharmacyInfo.baseCapital || 100000}
                  onChange={(e) => handleInfoChange('baseCapital', parseInt(e.target.value))}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Receipt Settings */}
          <Paper className="glass-card" sx={{ p: 4, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <DownloadIcon sx={{ transform: 'rotate(180deg)' }} color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>تخصيص الفاتورة</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ترويسة الفاتورة (Header)"
                  value={pharmacyInfo.receiptHeader}
                  onChange={(e) => handleInfoChange('receiptHeader', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="خاتمة الفاتورة (Footer)"
                  value={pharmacyInfo.receiptFooter}
                  onChange={(e) => handleInfoChange('receiptFooter', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Receipt Settings section continues */}
        </Grid>

        {/* Display and Actions */}
        <Grid item xs={12} md={5}>
          <Paper className="glass-card" sx={{ p: 4, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <DisplayIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>التفضيلات</Typography>
            </Box>

            <FormControlLabel
              control={<Switch checked={isDarkMode} onChange={handleThemeChange} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isDarkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>الوضع الليلي (Dark Mode)</Typography>
                </Box>
              }
              sx={{ mb: 2, display: 'flex' }}
            />

            <Divider sx={{ my: 2 }} />

            <List sx={{ p: 0 }}>
              <ListItem sx={{ px: 0 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={options.showCheckoutConfirm}
                      onChange={() => handleOptionChange("showCheckoutConfirm")}
                    />
                  }
                  label="تأكيد البيع"
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={options.showReturnsConfirm}
                      onChange={() => handleOptionChange("showReturnsConfirm")}
                    />
                  }
                  label="تأكيد المرتجع"
                />
              </ListItem>
            </List>
          </Paper>

          <Paper className="glass-card" sx={{ p: 4, bgcolor: 'rgba(0,137,123,0.05)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>📦 إدارة البيانات</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportData}
                sx={{ borderRadius: '12px', py: 1.5, borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                تصدير نسخة احتياطية (JSON)
              </Button>

              <Button
                component="label"
                variant="outlined"
                startIcon={<DownloadIcon sx={{ transform: 'rotate(180deg)' }} />}
                sx={{ borderRadius: '12px', py: 1.5, borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
              >
                استيراد واستعادة البيانات
                <input type="file" hidden accept=".json" onChange={importData} />
              </Button>

              <Divider sx={{ my: 1 }} />

              <Button
                variant="contained"
                color="error"
                onClick={() => setWipeDialogOpen(true)}
                sx={{ borderRadius: '12px', py: 1.5, fontWeight: 700 }}
              >
                تصفير قاعدة البيانات
              </Button>
            </Box>

            <Typography variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
              ⚠️ تحذير: الاستيراد أو التصفير سيؤدي لفقدان البيانات الحالية.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialogs */}

      <Dialog open={wipeDialogOpen} onClose={() => setWipeDialogOpen(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>⚠️ تأكيد تصفير البيانات</DialogTitle>
        <DialogContent dividers>
          <Typography>
            هل أنت متأكد من رغبتك في حذف <strong>جميع المنتجات وجميع سجلات المبيعات والأرباح</strong>؟
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: 800, color: 'error.main' }}>
            لا يمكن تراجع عن هذه العملية! يرجى تحميل نسخة احتياطية أولاً.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWipeDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={wipeData}>
            نعم، احذف كل شيء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
