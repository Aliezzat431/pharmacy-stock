'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  IconButton,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Modal,
  Fade,
  Backdrop,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  Save,
  Edit,
  Add,
  Delete,
  Assessment,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  WarningAmber,
  KeyboardArrowDown,
  Close as CloseIcon
} from '@mui/icons-material';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editedCompanyName, setEditedCompanyName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [savingCompanyId, setSavingCompanyId] = useState(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);

  // Report Modal State
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      showSnackbar('خطأ في تحميل الشركات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReport = async (company) => {
    setSelectedCompany(company);
    setReportOpen(true);
    setIsReportLoading(true);
    try {
      const res = await axios.get(`/api/companies/report?name=${encodeURIComponent(company.name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportData(res.data.products);
    } catch (error) {
      console.error('Report Error:', error);
      showSnackbar('فشل في تحميل التقرير', 'error');
    } finally {
      setIsReportLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    setIsAdding(true);
    try {
      const res = await axios.post(
        '/api/companies',
        { name: newCompanyName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies((prev) => [...prev, res.data]);
      setNewCompanyName('');
      showSnackbar('تمت إضافة الشركة بنجاح');
    } catch (error) {
      console.error('Failed to add company:', error);
      showSnackbar('خطأ في إضافة الشركة', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditCompany = (id, name) => {
    setEditingCompanyId(id);
    setEditedCompanyName(name);
  };

  const handleSaveEdit = async (id) => {
    setSavingCompanyId(id);
    try {
      const res = await axios.patch(
        `/api/companies/${id}`,
        { name: editedCompanyName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies((prev) =>
        prev.map((company) => (company._id === id ? res.data : company))
      );
      setEditingCompanyId(null);
      setEditedCompanyName('');
      showSnackbar('تم تحديث الشركة');
    } catch (error) {
      console.error('Failed to update company:', error);
      showSnackbar('خطأ في تحديث الشركة', 'error');
    } finally {
      setSavingCompanyId(null);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!confirm('هل أنت متأكد أنك تريد حذف هذه الشركة؟')) return;
    setDeletingCompanyId(id);
    try {
      await axios.delete(`/api/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies((prev) => prev.filter((company) => company._id !== id));
      showSnackbar('تم حذف الشركة بنجاح');
    } catch (error) {
      console.error('Failed to delete company:', error);
      showSnackbar('فشل حذف الشركة', 'error');
    } finally {
      setDeletingCompanyId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--primary)', mb: 1 }}>
        🏢 إدارة الشركات والموردين
      </Typography>

      {/* Add Section */}
      <Box className="glass-card" sx={{ p: 3, bgcolor: 'var(--glass-bg)', display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="اسم الشركة الجديدة"
          fullWidth
          size="small"
          value={newCompanyName}
          onChange={(e) => setNewCompanyName(e.target.value)}
          disabled={isAdding}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        <Button
          variant="contained"
          onClick={handleAddCompany}
          disabled={isAdding || !newCompanyName.trim()}
          startIcon={isAdding ? <CircularProgress size={20} color="inherit" /> : <Add />}
          sx={{
            py: 1, px: 4, borderRadius: '12px', bgcolor: 'var(--primary)', fontWeight: 700,
            '&:hover': { bgcolor: 'var(--primary-hover)' }
          }}
        >
          أضف
        </Button>
      </Box>

      {/* List Section */}
      <Box className="glass-card" sx={{ flexGrow: 1, bgcolor: 'var(--glass-bg)', p: 2, overflow: 'auto' }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {companies.map((company) => (
              <ListItem
                key={company._id}
                sx={{
                  borderRadius: '12px',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  mb: 1,
                  transition: '0.2s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'translateX(-4px)' }
                }}
              >
                {editingCompanyId === company._id ? (
                  <Box display="flex" width="100%" gap={2} alignItems="center">
                    <TextField
                      fullWidth
                      size="small"
                      value={editedCompanyName}
                      onChange={(e) => setEditedCompanyName(e.target.value)}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                    <IconButton color="primary" onClick={() => handleSaveEdit(company._id)}>
                      <Save />
                    </IconButton>
                    <IconButton onClick={() => setEditingCompanyId(null)}><CloseIcon /></IconButton>
                  </Box>
                ) : (
                  <>
                    <ListItemText
                      primary={company.name}
                      primaryTypographyProps={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}
                    />
                    <ListItemSecondaryAction sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="تقرير المبيعات والنواقص">
                        <IconButton
                          color="primary"
                          className="glass-card"
                          sx={{ bgcolor: 'rgba(0,137,123,0.1)' }}
                          onClick={() => handleOpenReport(company)}
                        >
                          <KeyboardArrowDown />
                        </IconButton>
                      </Tooltip>
                      <IconButton color="secondary" onClick={() => handleEditCompany(company._id, company.name)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteCompany(company._id)}
                        disabled={deletingCompanyId === company._id}
                      >
                        {deletingCompanyId === company._id ? <CircularProgress size={20} /> : <Delete fontSize="small" />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Report Modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500, sx: { backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.4)' } }}
      >
        <Fade in={reportOpen}>
          <Box className="glass-card" sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '90vw', maxWidth: 900, maxHeight: '85vh',
            bgcolor: 'var(--glass-bg)', p: 4, borderRadius: '24px', overflowY: 'auto',
            border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--primary)' }}>
                  📊 تقرير منتجات {selectedCompany?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">تحليل المبيعات، الطلب، وحالة النواقص</Typography>
              </Box>
              <IconButton onClick={() => setReportOpen(false)}><CloseIcon /></IconButton>
            </Box>

            {isReportLoading ? (
              <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
            ) : (
              <TableContainer className="glass-card" sx={{ border: '1px solid var(--glass-border)' }}>
                <Table className="modern-table">
                  <TableHead>
                    <TableRow>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>اسم الدواء</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>المخزون</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>إجمالي المبيعات (30يوم)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>التوجه (Trend)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.map((prod) => (
                      <TableRow key={prod._id} hover>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{prod.name}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${prod.quantity} ${prod.unit}`}
                            size="small"
                            variant="outlined"
                            color={prod.isShortcoming ? 'error' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{prod.salesCount}</TableCell>
                        <TableCell align="center">
                          {prod.trend === 'increasing' ? <TrendingUp color="success" /> :
                            prod.trend === 'decreasing' ? <TrendingDown color="error" /> :
                              <TrendingFlat color="action" />}
                        </TableCell>
                        <TableCell align="center">
                          {prod.isShortLongTime ? (
                            <Tooltip title="نواقص من فترة طويلة (أكثر من أسبوع)">
                              <Chip
                                icon={<WarningAmber style={{ color: 'white', fontSize: '1rem' }} />}
                                label="نواقص قديمة"
                                size="small"
                                sx={{ bgcolor: '#d32f2f', color: 'white', fontWeight: 700 }}
                              />
                            </Tooltip>
                          ) : prod.isShortcoming ? (
                            <Chip label="نواقص" size="small" sx={{ fontWeight: 600 }} />
                          ) : (
                            <Chip label="متوفر" size="small" color="success" sx={{ fontWeight: 600, opacity: 0.8 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reportData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>لا توجد منتجات مسجلة لهذه الشركة حالياً.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Fade>
      </Modal>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
