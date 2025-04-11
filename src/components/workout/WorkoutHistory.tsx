import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Exercise } from '../../types/workout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface WorkoutHistoryProps {
  exercise: Exercise;
}

interface PerformanceData {
  date: Date;
  weight: number;
  sets: number;
  reps: number;
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ exercise }) => {
  const { userData } = useAuth();
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personalRecord, setPersonalRecord] = useState<number | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!userData?.uid) return;

      try {
        setLoading(true);
        setError(null);

        const sessionsRef = collection(db, 'workoutSessions');
        const q = query(
          sessionsRef,
          where('userId', '==', userData.uid),
          where('performances', 'array-contains', { exerciseId: exercise.id }),
          orderBy('date', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const data: PerformanceData[] = [];

        querySnapshot.forEach((doc) => {
          const session = doc.data();
          const performance = session.performances.find(
            (p: any) => p.exerciseId === exercise.id
          );

          if (performance) {
            data.push({
              date: performance.date.toDate(),
              weight: performance.weight || 0,
              sets: performance.sets || 0,
              reps: performance.reps || 0,
            });
          }
        });

        setPerformanceData(data);

        // Calculate personal record
        if (data.length > 0) {
          const maxWeight = Math.max(...data.map((d) => d.weight));
          setPersonalRecord(maxWeight);
        }
      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError('שגיאה בטעינת נתוני ביצוע');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [userData?.uid, exercise.id]);

  const chartData = {
    labels: performanceData.map((d) =>
      d.date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'משקל (ק"ג)',
        data: performanceData.map((d) => d.weight),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'התקדמות משקל לאורך זמן',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'משקל (ק"ג)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'תאריך',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (performanceData.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-sm text-gray-500">אין נתוני ביצוע עבור תרגיל זה</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{exercise.name}</h2>
        {personalRecord !== null && (
          <div className="flex items-center">
            <span className="text-sm text-gray-500 ml-2">שיא אישי:</span>
            <span className="font-bold text-primary">{personalRecord} ק"ג</span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                תאריך
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                משקל
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                סטים
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                חזרות
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {performanceData.map((data, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.date.toLocaleDateString('he-IL')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {data.weight} ק"ג
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.sets}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.reps}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkoutHistory; 