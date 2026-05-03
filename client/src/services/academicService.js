import api from './api';

// ── Handbook ──────────────────────────────────────────────
export const getHandbook     = ()           => api.get('/handbook');
export const uploadHandbook  = (formData)   => api.post('/handbook/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const confirmCourses  = (courses, academicSession) =>
  api.patch('/handbook/confirm', { courses, academicSession });
export const updateCourse    = (index, data) => api.patch(`/handbook/courses/${index}`, data);
export const deleteCourse    = (index)        => api.delete(`/handbook/courses/${index}`);

// ── Quiz ──────────────────────────────────────────────────
export const getTodayQuiz    = ()                        => api.get('/quiz/today');
export const submitAnswer    = (questionIndex, answerIndex) =>
  api.post('/quiz/answer', { questionIndex, answerIndex });
export const getStreak       = ()                        => api.get('/quiz/streak');
export const getFeedGate     = ()                        => api.get('/quiz/feed-gate');
export const getQuizHistory  = ()                        => api.get('/quiz/history');
