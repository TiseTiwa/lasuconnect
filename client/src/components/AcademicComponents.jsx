import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LCIcon from './LCIcon';
import { getTodayQuiz, submitAnswer, getStreak } from '../services/academicService';

// ═══════════════════════════════════════════════════════════
//  STREAK WIDGET — shown in sidebar / feed header
// ═══════════════════════════════════════════════════════════
export const StreakWidget = ({ compact = false }) => {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    getStreak().then(res => setStreak(res.data.data.streak)).catch(() => {});
  }, []);

  if (!streak) return null;

  const days = ['M','T','W','T','F','S','S'];
  const last7 = streak.history?.slice(-7) || [];

  if (compact) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: streak.currentStreak > 0 ? 'var(--reward-light)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', border: '0.5px solid var(--border)' }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: streak.currentStreak > 0 ? 'var(--reward-mid)' : 'var(--text-tertiary)' }}>
        {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}
      </span>
    </div>
  );

  return (
    <div className="lc-card" style={{ padding: '16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>🔥</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: streak.currentStreak > 0 ? 'var(--reward)' : 'var(--text-tertiary)', lineHeight: 1 }}>
            {streak.currentStreak} day streak
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Best: {streak.longestStreak} days · {streak.totalQuizzesDone} quizzes done
          </div>
        </div>
      </div>

      {/* 7-day history dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const entry = last7[i];
          const filled = entry?.completed;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: filled ? 'var(--reward)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, transition: 'background var(--duration-base)',
              }}>
                {filled ? '✓' : ''}
              </div>
              <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 600 }}>{days[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  DAILY QUIZ MODAL — full screen quiz experience
// ═══════════════════════════════════════════════════════════
export const DailyQuizModal = ({ onComplete, onClose }) => {
  const navigate = useNavigate();
  const [quiz, setQuiz]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [currentQ, setCurrentQ]       = useState(0);
  const [selected, setSelected]       = useState(null);
  const [result, setResult]           = useState(null); // { isCorrect, correctIndex, explanation }
  const [submitting, setSubmitting]   = useState(false);
  const [completed, setCompleted]     = useState(false);
  const [finalScore, setFinalScore]   = useState(0);

  useEffect(() => {
    getTodayQuiz()
      .then(res => {
        const q = res.data.data.quiz;
        setQuiz(q);
        if (q?.status === 'completed') { setCompleted(true); setFinalScore(q.score); }
        // Resume from where they left off
        if (q) {
          const firstUnanswered = q.questions.findIndex(qq => qq.answeredIndex === null);
          setCurrentQ(firstUnanswered >= 0 ? firstUnanswered : 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (optionIndex) => {
    if (result || submitting) return;
    setSelected(optionIndex);
  };

  const handleSubmit = async () => {
    if (selected === null || submitting || result) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(currentQ, selected);
      const data = res.data.data;
      setResult({
        isCorrect:    data.isCorrect,
        correctIndex: data.correctIndex,
        explanation:  data.explanation,
      });

      // Update local quiz state
      setQuiz(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.questions = [...updated.questions];
        updated.questions[currentQ] = {
          ...updated.questions[currentQ],
          answeredIndex: selected,
          isCorrect: data.isCorrect,
          correctIndex: data.correctIndex,
        };
        updated.answeredCount = data.answeredCount;
        return updated;
      });

      if (data.status === 'completed') {
        setTimeout(() => {
          setCompleted(true);
          setFinalScore(data.score);
          onComplete?.();
        }, 1800);
      }
    } catch (_) {}
    setSubmitting(false);
  };

  const handleNext = () => {
    setSelected(null);
    setResult(null);
    setCurrentQ(p => p + 1);
  };

  // ── No handbook state ──────────────────────────────────
  if (!loading && !quiz) return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📖</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 10 }}>
            No quiz available yet
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            Upload and confirm your departmental handbook first. We'll generate your daily quiz from your courses.
          </p>
          <button onClick={() => navigate('/handbook')} className="lc-btn lc-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
            <LCIcon name="upload" size={16} color="var(--text-inverse)" />
            Upload Handbook
          </button>
        </div>
      </div>
    </div>
  );

  // ── Loading ────────────────────────────────────────────
  if (loading) return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div className="lc-animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
      </div>
    </div>
  );

  // ── Completed screen ───────────────────────────────────
  if (completed) {
    const emoji = finalScore >= 80 ? '🏆' : finalScore >= 60 ? '🎉' : finalScore >= 40 ? '📚' : '💪';
    const msg   = finalScore >= 80 ? 'Excellent! You\'re crushing it!' : finalScore >= 60 ? 'Good work! Keep it up!' : finalScore >= 40 ? 'Not bad — review those courses!' : 'Keep practising — you\'ll get there!';
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 16, animation: 'lc-fade-up 0.4s ease-out' }}>{emoji}</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--text-primary)', marginBottom: 6 }}>
              Quiz Complete!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>{msg}</p>

            {/* Score ring */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
              background: `conic-gradient(var(--reward) ${finalScore * 3.6}deg, var(--border) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--reward)', lineHeight: 1 }}>{finalScore}</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>score</span>
              </div>
            </div>

            <div style={{ background: 'var(--brand-light)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>🔓 Social feed unlocked for today!</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>You've earned your scroll time. Come back tomorrow!</div>
            </div>

            <button onClick={onClose} className="lc-btn lc-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
              Go to Feed →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q         = quiz?.questions?.[currentQ];
  const progress  = quiz ? (quiz.answeredCount / quiz.totalQuestions) * 100 : 0;
  const isLast    = currentQ >= (quiz?.totalQuestions || 1) - 1;

  if (!q) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--brand)' }}>
                Daily Quiz
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Question {currentQ + 1} of {quiz?.totalQuestions} · {q.courseCode}
              </div>
            </div>
            <StreakWidget compact />
          </div>
          <div className="lc-progress" style={{ marginBottom: 16 }}>
            <div className="lc-progress-fill lc-progress-fill--reward" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 6 }}>
            <span className="lc-pill lc-pill--academic" style={{ fontSize: 10 }}>{q.courseTitle}</span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            {q.question}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.options?.map((option, i) => {
              let bg     = 'var(--bg-elevated)';
              let border = 'var(--border)';
              let color  = 'var(--text-primary)';

              if (result) {
                if (i === result.correctIndex)    { bg = 'var(--success-light)'; border = 'var(--success)'; color = 'var(--success)'; }
                else if (i === selected && !result.isCorrect) { bg = 'var(--error-light)'; border = 'var(--error)'; color = 'var(--error)'; }
              } else if (selected === i) {
                bg = 'var(--brand-light)'; border = 'var(--brand)'; color = 'var(--brand)';
              }

              return (
                <button key={i} onClick={() => handleSelect(i)} style={{
                  padding: '13px 16px', borderRadius: 'var(--radius-md)', textAlign: 'left',
                  border: `1.5px solid ${border}`, background: bg, color, cursor: result ? 'default' : 'pointer',
                  fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500,
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, background: selected === i || (result && i === result.correctIndex) ? border : 'transparent', color: selected === i || (result && i === result.correctIndex) ? 'white' : border }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {result && (
            <div style={{
              marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: result.isCorrect ? 'var(--success-light)' : 'var(--error-light)',
              border: `0.5px solid ${result.isCorrect ? 'var(--success)' : 'var(--error)'}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: result.isCorrect ? 'var(--success)' : 'var(--error)', marginBottom: 4 }}>
                {result.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </div>
              {result.explanation && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{result.explanation}</div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ marginTop: 20 }}>
            {!result ? (
              <button onClick={handleSubmit} disabled={selected === null || submitting}
                className="lc-btn lc-btn--primary"
                style={{ width: '100%', justifyContent: 'center', opacity: selected !== null && !submitting ? 1 : 0.5 }}>
                {submitting ? 'Checking…' : 'Submit Answer'}
              </button>
            ) : !isLast ? (
              <button onClick={handleNext} className="lc-btn lc-btn--primary"
                style={{ width: '100%', justifyContent: 'center' }}>
                Next Question →
              </button>
            ) : (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                Processing results…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  FEED GATE — hard lock on social feed
// ═══════════════════════════════════════════════════════════
export const FeedGate = ({ children, feedType }) => {
  const [gateData, setGateData]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showQuiz, setShowQuiz]     = useState(false);

  const checkGate = useCallback(async () => {
    try {
      const res = await import('../services/academicService').then(m => m.getFeedGate());
      setGateData(res.data.data);
    } catch (_) {
      // If check fails, let them through
      setGateData({ unlocked: true });
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkGate(); }, [checkGate]);

  // Academic feed is ALWAYS accessible — only social is gated
  if (feedType === 'academic' || feedType === 'all') return children;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="lc-animate-spin" style={{ width: 28, height: 28, border: '2.5px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
    </div>
  );

  // No handbook = no lock (encourage upload but don't block)
  if (!gateData?.hasHandbook) return children;

  // Quiz done = unlocked
  if (gateData?.unlocked) return children;

  // LOCKED
  return (
    <>
      {showQuiz && (
        <DailyQuizModal
          onComplete={() => { setGateData(p => ({ ...p, unlocked: true })); setShowQuiz(false); }}
          onClose={() => setShowQuiz(false)}
        />
      )}

      <div style={{
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        border: '1.5px solid var(--border-sec)',
        background: 'var(--bg-surface)',
      }}>
        {/* Blurred feed preview */}
        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'blur(6px)', pointerEvents: 'none', opacity: 0.4, maxHeight: 280, overflow: 'hidden' }}>
            {children}
          </div>

          {/* Lock overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(var(--bg-page-raw, 240,247,244), 0) 0%, var(--bg-page) 70%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
            padding: '24px 24px 32px', textAlign: 'center',
          }}>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-3)', border: '0.5px solid var(--border-sec)', maxWidth: 340, width: '100%' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>
                Social Feed Locked
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                Complete today's academic quiz first to unlock the social feed. It only takes 5 minutes!
              </p>

              {/* Quiz progress if in progress */}
              {gateData?.quizStatus === 'in_progress' && (
                <div className="lc-progress" style={{ marginBottom: 14 }}>
                  <div className="lc-progress-fill lc-progress-fill--reward" style={{ width: '40%' }} />
                </div>
              )}

              <button onClick={() => setShowQuiz(true)} className="lc-btn lc-btn--primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}>
                {gateData?.quizStatus === 'in_progress' ? '▶ Resume Quiz' : '🧠 Take Today\'s Quiz'}
              </button>

              <button onClick={() => { window.location.href = '/handbook'; }}
                className="lc-btn lc-btn--outline lc-btn--sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                <LCIcon name="file-text" size={13} color="var(--text-secondary)" />
                View Academic Feed instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Style helpers ──────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 300, padding: 16,
};

const modalStyle = {
  background: 'var(--bg-surface)',
  borderRadius: 'var(--radius-xl)',
  width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: 'var(--shadow-3)',
  border: '0.5px solid var(--border-sec)',
  animation: 'lc-modal-in 0.25s var(--ease-out)',
};
