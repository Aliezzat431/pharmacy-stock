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
} from '@mui/material';
import { Save, Edit, Add, Delete } from '@mui/icons-material';

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
      showSnackbar('Error loading companies', 'error');
    } finally {
      setIsLoading(false);
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
      showSnackbar('Company added successfully');
    } catch (error) {
      console.error('Failed to add company:', error);
      showSnackbar('Error adding company', 'error');
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
      showSnackbar('Company updated');
    } catch (error) {
      console.error('Failed to update company:', error);
      showSnackbar('Error updating company', 'error');
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
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        إدارة الشركات
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2}>
          <TextField
            label="اسم الشركة الجديدة"
            fullWidth
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            disabled={isAdding}
          />
          <IconButton
            color="primary"
            onClick={handleAddCompany}
            aria-label="add company"
            sx={{ alignSelf: 'center' }}
            disabled={isAdding}
          >
            {isAdding ? <CircularProgress size={24} /> : <Add />}
          </IconButton>
        </Box>
      </Paper>

      <Paper>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {companies.map((company) => (
              <React.Fragment key={company._id}>
                <ListItem>
                  {editingCompanyId === company._id ? (
                    <>
                      <TextField
                        fullWidth
                        value={editedCompanyName}
                        onChange={(e) => setEditedCompanyName(e.target.value)}
                        variant="standard"
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          color="primary"
                          aria-label="save company"
                          onClick={() => handleSaveEdit(company._id)}
                          disabled={savingCompanyId === company._id}
                        >
                          {savingCompanyId === company._id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Save />
                          )}
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  ) : (
                    <>
                      <ListItemText primary={company.name} />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          color="secondary"
                          aria-label="edit company"
                          onClick={() => handleEditCompany(company._id, company.name)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          edge="end"
                          color="error"
                          aria-label="delete company"
                          onClick={() => handleDeleteCompany(company._id)}
                          disabled={deletingCompanyId === company._id}
                        >
                          {deletingCompanyId === company._id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Delete />
                          )}
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
