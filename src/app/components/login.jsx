'use client';

import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Alert,
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('/api/login', {
        username,
        password,
      });

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setMessage('تم تسجيل الدخول بنجاح');
  window.location.reload();
      } else {
        setMessage('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      console.error(error);
      setMessage('حدث خطأ أثناء تسجيل الدخول');
    }
  };

  return (
    <Container maxWidth="sm" dir="rtl" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          تسجيل الدخول
        </Typography>

        <Box component="form" onSubmit={handleLogin} noValidate>
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

          {message && (
            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
              {message}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            color="primary"
          >
            دخول
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
