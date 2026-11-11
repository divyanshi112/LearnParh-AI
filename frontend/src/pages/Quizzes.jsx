import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  LoaderCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { getStudyPlanData } from '../services/studyPlanService.js';
import { generateQuiz, getQuizHistory, submitQuiz } from '../services/quizService.js';

const QUESTION_COUNTS = [5, 10, 15];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const formatDate = (value) => new Date(value).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function Alert({ children, success = false }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
      success
        ? 'border-emerald-900/70 bg-emerald-950/30 text-emerald-200'
        : 'border-rose-900/70 bg-rose-950/30 text-rose-200'
    }`}>
      {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

function AnswerReview({ answers }) {
  return (
    <div className="mt-5 space-y-3">
      {answers.map((answer, index) => {
        const options = answer.options || [];
        return (
          <article key={answer.questionId || index} className="rounded-xl border border-slate-800 bg-dark-900 p-4">
            <div className="flex items-start gap-3">
              {answer.isCorrect
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-6 text-white">{index + 1}. {answer.questionText}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Your answer:{' '}
                  <span className={answer.isCorrect ? 'text-emerald-300' : 'text-rose-300'}>
                    {answer.selectedOption === 'Unanswered'
                      ? 'Not answered'
                      : `${answer.selectedOption}. ${options[OPTION_KEYS.indexOf(answer.selectedOption)] || ''}`}
                  </span>
                </p>
                <p className="mt-1 text-xs text-emerald-300">
                  Correct answer: {answer.correctOption}. {options[OPTION_KEYS.indexOf(answer.correctOption)]}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{answer.explanation}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function Quizzes() {
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studyPlan, quizHistory] = await Promise.all([getStudyPlanData(), getQuizHistory()]);
      setSubjects(studyPlan.subjects);
      setHistory(quizHistory.attempts);
      const firstSubject = studyPlan.subjects[0];
      setSelectedSubjectId((current) => current || firstSubject?._id || '');
      setSelectedTopicIds((current) => current.length || !firstSubject?.topics?.[0]?._id
        ? current
        : [String(firstSubject.topics[0]._id)]);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your study plan and quiz history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => String(subject._id) === String(selectedSubjectId)),
    [subjects, selectedSubjectId]
  );
  const topics = selectedSubject?.topics || [];
  const activeQuestion = quiz?.questions[currentQuestion];
  const answeredCount = quiz ? Object.keys(answers).length : 0;
  const progress = quiz ? ((currentQuestion + 1) / quiz.totalQuestions) * 100 : 0;

  const resetQuiz = () => {
    setQuiz(null);
    setAnswers({});
    setCurrentQuestion(0);
    setReviewing(false);
    setConfirmSubmit(false);
    setResult(null);
    setError('');
  };

  const onSubjectChange = (event) => {
    const subjectId = event.target.value;
    const subject = subjects.find((item) => String(item._id) === String(subjectId));
    setSelectedSubjectId(subjectId);
    setSelectedTopicIds(subject?.topics?.[0]?._id ? [String(subject.topics[0]._id)] : []);
  };

  const toggleTopic = (topicId) => {
    setSelectedTopicIds((current) => current.includes(topicId)
      ? current.filter((id) => id !== topicId)
      : [...current, topicId]);
  };

  const startQuiz = async (event) => {
    event.preventDefault();
    setGenerating(true);
    setError('');
    try {
      const request = {
        subjectId: selectedSubjectId,
        topicIds: selectedTopicIds,
        difficulty,
        questionCount,
      };
      const response = await generateQuiz(request);
      if (
        !Array.isArray(response.quiz?.questions)
        || response.quiz.questions.length !== request.questionCount
      ) {
        throw new Error(`The quiz service did not return exactly ${request.questionCount} questions. Please try again.`);
      }
      setQuiz(response.quiz);
      setAnswers({});
      setCurrentQuestion(0);
      setReviewing(false);
      setResult(null);
    } catch (requestError) {
      setError(requestError.message || 'Quiz generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const finishQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await submitQuiz({
        quizId: quiz.id,
        answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        })),
      });
      setResult(response.attempt);
      setQuiz(null);
      setConfirmSubmit(false);
      setReviewing(false);
      try {
        const historyResponse = await getQuizHistory();
        setHistory(historyResponse.attempts);
        setHistoryError('');
      } catch (requestError) {
        setHistoryError(requestError.message || 'Your attempt was saved, but quiz history could not be refreshed.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Quiz submission failed. Your answers are still available to retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectQuestion = (index) => {
    setCurrentQuestion(index);
    setReviewing(false);
  };

  return (
    <DashboardLayout pageTitle="Practice Quizzes">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-dark-800 text-brand-blue-light">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">Practice quizzes</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Build an MCQ quiz from subjects and topics in your study plan. Your answers are graded after you submit.
              </p>
            </div>
          </div>
        </section>

        {error && <Alert>{error}</Alert>}
        {historyError && <Alert>{historyError}</Alert>}

        {loading ? (
          <section className="flex min-h-48 items-center justify-center rounded-xl border border-slate-800 bg-dark-900 text-sm text-slate-400">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading your study plan and quiz history...
          </section>
        ) : result ? (
          <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Quiz complete</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{result.quizTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {result.topics?.join(' · ')} <span className="mx-1">•</span> {result.difficulty}
                </p>
              </div>
              <button onClick={resetQuiz} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-dark-800 px-3 py-2 text-sm text-slate-200 hover:bg-dark-700">
                <RotateCcw className="h-4 w-4" /> Create another quiz
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Total questions', result.totalQuestions],
                ['Correct', result.correctAnswers],
                ['Incorrect', result.incorrectAnswers],
                ['Score', `${result.scorePercentage}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-800 bg-dark-850 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-6 text-base font-semibold text-white">Answer review</h3>
            <AnswerReview answers={result.answers} />
          </section>
        ) : quiz ? (
          <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <button onClick={() => { resetQuiz(); }} className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" /> Exit quiz
                </button>
                <h2 className="text-lg font-semibold text-white">{quiz.subject} practice quiz</h2>
                <p className="mt-1 text-xs text-slate-400">{quiz.topics.join(' · ')} <span className="mx-1">•</span> {quiz.difficulty}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-slate-200">{answeredCount} of {quiz.totalQuestions} answered</p>
                <button onClick={() => setReviewing((current) => !current)} className="mt-1 text-xs font-medium text-brand-blue-light hover:text-white">
                  {reviewing ? 'Back to question' : 'Review answers'}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Question {currentQuestion + 1} of {quiz.totalQuestions}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-dark-800">
                <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {reviewing ? (
              <div className="mt-5">
                <h3 className="text-base font-semibold text-white">Review your answers</h3>
                <p className="mt-1 text-sm text-slate-400">Choose a question to revisit it before submitting.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {quiz.questions.map((question, index) => {
                    const answered = Boolean(answers[question.questionId]);
                    return (
                      <button
                        key={question.questionId}
                        onClick={() => selectQuestion(index)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                          index === currentQuestion
                            ? 'border-brand-blue bg-brand-blue/10 text-white'
                            : 'border-slate-800 bg-dark-850 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span>Question {index + 1}</span>
                        {answered
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          : <Circle className="h-4 w-4 text-slate-600" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-400">{quiz.totalQuestions - answeredCount} unanswered (counted as incorrect if submitted).</p>
                  <button onClick={() => setConfirmSubmit(true)} className="button-primary rounded-lg px-4 py-2 text-sm font-medium">
                    Submit quiz
                  </button>
                </div>
              </div>
            ) : activeQuestion ? (
              <div className="mt-5">
                <h3 className="text-base font-semibold leading-7 text-white sm:text-lg">{activeQuestion.question}</h3>
                <div className="mt-4 space-y-2.5">
                  {OPTION_KEYS.map((key) => {
                    const checked = answers[activeQuestion.questionId] === key;
                    return (
                      <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                        checked ? 'border-brand-blue bg-brand-blue/10' : 'border-slate-800 bg-dark-850 hover:border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name={`question-${activeQuestion.questionId}`}
                          checked={checked}
                          onChange={() => setAnswers((current) => ({
                            ...current,
                            [activeQuestion.questionId]: key,
                          }))}
                          className="mt-0.5 accent-blue-400"
                        />
                        <span className="min-w-0 text-sm leading-6 text-slate-200"><strong className="mr-2 text-slate-400">{key}.</strong>{activeQuestion.options[OPTION_KEYS.indexOf(key)]}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <button
                    onClick={() => setCurrentQuestion((current) => Math.max(0, current - 1))}
                    disabled={currentQuestion === 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-dark-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </button>
                  {currentQuestion < quiz.totalQuestions - 1 ? (
                    <button onClick={() => setCurrentQuestion((current) => current + 1)} className="button-primary inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium">
                      Next <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => setReviewing(true)} className="button-primary inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium">
                      Review answers <ClipboardCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => setConfirmSubmit(true)} className="w-full text-center text-xs font-medium text-slate-400 hover:text-white sm:w-auto">
                    Submit quiz
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Create a quiz</h2>
              <p className="mt-1 text-sm text-slate-400">Choose study-plan topics to generate questions tailored to your learning.</p>
            </div>
            {subjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-dark-850 px-5 py-9 text-center">
                <BookOpen className="mx-auto h-7 w-7 text-slate-500" />
                <h3 className="mt-3 font-medium text-white">Your study plan is empty</h3>
                <p className="mt-1 text-sm text-slate-400">Add a subject and topics before creating a quiz.</p>
                <a href="/study-plan" className="button-primary mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-medium">Open Study Plan</a>
              </div>
            ) : (
              <form onSubmit={startQuiz} className="space-y-5">
                <div>
                  <label htmlFor="quiz-subject" className="mb-1.5 block text-sm font-medium text-slate-200">Subject</label>
                  <select id="quiz-subject" value={selectedSubjectId} onChange={onSubjectChange} className="field-control px-3 py-2.5">
                    {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
                  </select>
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-200">Topics</legend>
                  {topics.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {topics.map((topic) => (
                        <label key={topic._id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-800 bg-dark-850 px-3 py-2.5 text-sm text-slate-300 hover:border-slate-600">
                          <input
                            type="checkbox"
                            checked={selectedTopicIds.includes(String(topic._id))}
                            onChange={() => toggleTopic(String(topic._id))}
                            className="accent-blue-400"
                          />
                          <span>{topic.name}</span>
                          {topic.status === 'Completed' && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-sm text-slate-400">
                      Add at least one topic to this subject in your Study Plan.
                    </p>
                  )}
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quiz-difficulty" className="mb-1.5 block text-sm font-medium text-slate-200">Difficulty</label>
                    <select id="quiz-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="field-control px-3 py-2.5">
                      {DIFFICULTIES.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="quiz-count" className="mb-1.5 block text-sm font-medium text-slate-200">Number of questions</label>
                    <select id="quiz-count" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="field-control px-3 py-2.5">
                      {QUESTION_COUNTS.map((value) => <option key={value} value={value}>{value} questions</option>)}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={generating || !selectedSubjectId || selectedTopicIds.length === 0 || topics.length === 0}
                  className="button-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium sm:w-auto"
                >
                  {generating
                    ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Generating quiz...</>
                    : <>Generate quiz <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            )}
          </section>
        )}

        {!loading && (
          <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Quiz history</h2>
            </div>
            {history.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-800 px-4 py-7 text-center">
                <p className="text-sm text-slate-400">No quiz attempts yet. Your submitted quizzes will appear here.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {history.map((attempt) => (
                  <details key={attempt._id} className="group rounded-lg border border-slate-800 bg-dark-850">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <div>
                        <p className="text-sm font-medium text-white">{attempt.quizTitle}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {attempt.topics?.join(' · ') || attempt.category} <span className="mx-1">•</span> {formatDate(attempt.completedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">{attempt.correctAnswers}/{attempt.totalQuestions} correct</span>
                        <span className="rounded-md border border-slate-700 px-2 py-1 font-semibold text-white">{attempt.scorePercentage}%</span>
                      </div>
                    </summary>
                    <div className="border-t border-slate-800 px-3 pb-3">
                      <AnswerReview answers={attempt.answers || []} />
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        )}

        {confirmSubmit && quiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="submit-quiz-title">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-dark-900 p-5 shadow-xl">
              <h2 id="submit-quiz-title" className="text-lg font-semibold text-white">Submit this quiz?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                You answered {answeredCount} of {quiz.totalQuestions} questions. Unanswered questions count as incorrect. You cannot change your answers after submitting.
              </p>
              {error && <div className="mt-3"><Alert>{error}</Alert></div>}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setConfirmSubmit(false)} disabled={submitting} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-dark-800 disabled:opacity-50">
                  Keep reviewing
                </button>
                <button onClick={finishQuiz} disabled={submitting} className="button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Submitting...' : 'Confirm submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
