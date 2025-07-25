'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const BASE_CAPITAL = 100000;

const WinningsPage = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchWinnings = async () => {
      try {
        const res = await axios.get('/api/winnings');
        console.log(res.data);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchWinnings();
  }, []);

  const chartData = {
    labels: data.map((day) => day.date),
    datasets: [
      {
        label: 'Total In',
        data: data.map((day) => day.totalIn),
        backgroundColor: 'green',
      },
      {
        label: 'Total Out',
        data: data.map((day) => day.totalOut),
        backgroundColor: 'red',
      },
      {
        label: 'Suspended',
        data: data.map((day) => day.totalSuspended || 0),
        backgroundColor: 'orange',
      },
    ],
  };

  return (
    <div style={{ minHeight: '100vh' }} className="flex flex-col items-center justify-start bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-2">📊 تقرير الأرباح اليومية</h1>
  {data.length > 0 && (
  <div className="text-lg text-gray-700 mb-6 flex flex-col sm:flex-row gap-2 sm:gap-6 items-start sm:items-center">
    <p>
      💼 <span className="font-semibold text-blue-600">رأس المال الأساسي:</span> {BASE_CAPITAL.toLocaleString()} جنيه
    </p>
    <p>
      💰 <span className="font-semibold text-green-600">رأس المال الحالي:</span> {data[data.length - 1].currentCapital.toLocaleString()} جنيه
    </p>
  </div>
)}


      <div className="w-full max-w-5xl bg-white shadow-md rounded-md p-4 mb-10">
        {console.log(chartData)
        }
        <Bar data={chartData} />
      </div>

      {data.map((day, i) => (
        <div key={i} className="w-full max-w-5xl bg-white rounded shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold mb-2">📅 {day.date}</h2>
          <p className="text-gray-700 mb-4">
            💰 داخل: <span className="text-green-600">{day.totalIn}</span> - 🧾 خارج: <span className="text-red-600">{day.totalOut}</span> - 🟠 معلّق: <span className="text-yellow-600">{day.totalSuspended || 0}</span> - 💼 رأس المال الحالي: <span className="text-blue-600">{day.currentCapital}</span>
          </p>

          {day.orders.map((order, index) => (
            <table key={index} className="w-full mb-4 text-sm text-left rtl:text-right border border-gray-300 shadow-sm rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 border">السبب</th>
                  <th className="px-4 py-2 border">المبلغ</th>
                  <th className="px-4 py-2 border text-center">النوع</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className={`border text-sm ${
                    order.type === 'in'
                      ? 'bg-green-50 hover:bg-green-100'
                      : order.type === 'out'
                      ? 'bg-red-50 hover:bg-red-100'
                      : 'bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <td className="px-4 py-3 border whitespace-nowrap">{order.reason}</td>
                  <td className="px-4 py-3 border text-center">{order.amount}</td>
                  <td className="px-4 py-3 border text-center">
                    <span
                      className={`inline-block min-w-[80px] text-center px-3 py-1 rounded-full font-bold text-xs ${
                        order.type === 'in'
                          ? 'bg-green-600 text-white'
                          : order.type === 'out'
                          ? 'bg-red-600 text-white'
                          : 'bg-yellow-400 text-black'
                      }`}
                    >
                      {console.log(order)
                      }
                      {order.type}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      ))}
    </div>
  );
};

export default WinningsPage;
