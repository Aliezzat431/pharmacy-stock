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
} from "@mui/material";

export default function SettingsPage() {
  const [maxUsers, setMaxUsers] = useState(0);
  const [allUsers, setAllUsers] = useState([]);
  const [usersToDelete, setUsersToDelete] = useState([]);
  const [requiredToDelete, setRequiredToDelete] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [options, setOptions] = useState({
    showCheckoutConfirm: true,
    showReturnsConfirm: true,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
    const savedOptions = localStorage.getItem("settings-options");
    if (savedOptions) {
      setOptions(JSON.parse(savedOptions));
    }
  }, []);

  const fetchCompanies = async () => {
    try {
      await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      showSnackbar('فشل تحميل الشركات', 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/settings/maxUsers');
      if (res.data.success) {
        setAllUsers(res.data.users);
      }
    } catch {
      showSnackbar('فشل تحميل المستخدمين', 'error');
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOptionChange = (key) => {
    const updated = { ...options, [key]: !options[key] };
    setOptions(updated);
    localStorage.setItem("settings-options", JSON.stringify(updated));
  };

  const handleMaxUsersChange = async () => {
    try {
      const res = await axios.post('/api/settings/maxUsers', { value: maxUsers });
      if (res.data.success) {
        showSnackbar('تم تحديث عدد المستخدمين', 'success');
        fetchUsers();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        const { users = [], toRemove = 0 } = err.response.data;
        setAllUsers(users);
        setRequiredToDelete(toRemove);
        setUsersToDelete([]);
        setDeleteDialogOpen(true);
      } else {
        showSnackbar('حدث خطأ أثناء التحديث', 'error');
      }
    }
  };

  const toggleUserSelection = (id) => {
    setUsersToDelete(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const confirmUserDeletion = async () => {
    try {
      for (const userId of usersToDelete) {
        await axios.delete(`/api/settings/maxUsers?userId=${userId}`);
      }

      setDeleteDialogOpen(false);
      setUsersToDelete([]);
      showSnackbar('تم حذف المستخدمين المحددين', 'success');

      // أعد المحاولة لتحديث الحد بعد الحذف
      await handleMaxUsersChange();
    } catch {
      showSnackbar('فشل حذف المستخدمين', 'error');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, direction: 'rtl' }}>
      <Typography variant="h4" gutterBottom>
        الإعدادات
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" sx={{ mt: 2 }}>
          عدد المستخدمين الحالي: {allUsers.length}
        </Typography>

        <Typography variant="h6">الحد الأقصى للمستخدمين</Typography>
        <TextField
          label="أقصى عدد للمستخدمين"
          type="number"
          fullWidth
          margin="normal"
          value={maxUsers}
          onChange={e => setMaxUsers(parseInt(e.target.value))}
        />
        <Button variant="contained" onClick={handleMaxUsersChange}>
          تحديث العدد
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>خيارات العرض</Typography>
        <List>
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={options.showCheckoutConfirm}
                  onChange={() => handleOptionChange("showCheckoutConfirm")}
                />
              }
              label="عرض تأكيد عند الدفع"
            />
          </ListItem>

          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={options.showReturnsConfirm}
                  onChange={() => handleOptionChange("showReturnsConfirm")}
                />
              }
              label="عرض تأكيد عند المرتجعات"
            />
          </ListItem>
        </List>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>حذف المستخدمين</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom sx={{ mb: 2 }}>
            الرجاء تحديد {requiredToDelete} مستخدم/مستخدمين للحذف:
          </Typography>
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            <List>
              {allUsers.map((user) => (
                <ListItem key={user._id} dense>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={usersToDelete.includes(user._id)}
                        onChange={() => toggleUserSelection(user._id)}
                        disabled={
                          !usersToDelete.includes(user._id) &&
                          usersToDelete.length >= requiredToDelete
                        }
                      />
                    }
                    label={user.username}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={confirmUserDeletion}
            disabled={usersToDelete.length !== requiredToDelete}
          >
            تأكيد الحذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
