import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  BookOpen,
  Bot,
  CheckSquare,
  Command,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { listStudyMaterials } from '../services/studyMaterialService.js';
import { getStudyPlanData } from '../services/studyPlanService.js';

const navigationResults = [
  { name: 'Dashboard', category: 'Page', path: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { name: 'My Study Plan', category: 'Page', path: '/study-plan', icon: BookOpen, keywords: 'subjects topics targets' },
  { name: 'Subjects', category: 'Study Plan', path: '/study-plan', icon: BookOpen, keywords: 'courses' },
  { name: 'AI Tutor', category: 'Page', path: '/ai-tutor', icon: Bot, keywords: 'assistant ask questions' },
  { name: 'Practice Quizzes', category: 'Page', path: '/quizzes', icon: CheckSquare, keywords: 'quiz test practice' },
  { name: 'Study Materials', category: 'Page', path: '/study-materials', icon: FileText, keywords: 'uploaded documents pdf' },
  { name: 'My Progress', category: 'Page', path: '/progress', icon: TrendingUp, keywords: 'progress activity statistics' },
  { name: 'Profile', category: 'Account', path: '/profile', icon: UserRound, keywords: 'account personal details' },
  { name: 'Settings', category: 'Account', path: '/settings', icon: Settings, keywords: 'preferences' },
];

const suggestions = navigationResults.slice(0, 5);
const recentStorageKey = (user) =>
  `learnpath-search-recent-${user?._id || user?.id || user?.email || 'account'}`;

function readRecentSearches(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [subjects, setSubjects] = useState([]);
  const [targets, setTargets] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const storageKey = recentStorageKey(user);
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches(storageKey));

  useEffect(() => {
    setRecentSearches(readRecentSearches(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setIsLoading(true);
    setLoadError('');

    Promise.allSettled([getStudyPlanData(), listStudyMaterials()])
      .then(([studyPlanResult, materialsResult]) => {
        if (!active) return;
        const errors = [];
        if (studyPlanResult.status === 'fulfilled') {
          setSubjects(studyPlanResult.value.subjects || []);
          setTargets(studyPlanResult.value.targets || []);
        } else {
          errors.push(studyPlanResult.reason?.message || 'Your study plan could not be loaded.');
        }
        if (materialsResult.status === 'fulfilled') {
          setMaterials(materialsResult.value);
        } else {
          errors.push(materialsResult.reason?.message || 'Your study materials could not be loaded.');
        }
        setLoadError(errors.join(' '));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const results = useMemo(() => {
    const allResults = [...navigationResults];
    subjects.forEach((subject) => {
      const subjectPath = `/study-plan#subject-${subject._id}`;
      allResults.push({
        name: subject.name,
        category: 'Subject',
        path: subjectPath,
        icon: BookOpen,
        keywords: subject.description || '',
      });
      (subject.topics || []).forEach((topic) => {
        allResults.push({
          name: topic.name,
          category: `Topic · ${subject.name}`,
          path: `/study-plan#topic-${topic._id}`,
          icon: BookOpen,
          keywords: topic.status || '',
        });
      });
    });
    targets.forEach((target) => {
      allResults.push({
        name: target.title,
        category: 'Study Target',
        path: `/study-plan#target-${target._id}`,
        icon: BookOpen,
        keywords: `${target.subject?.name || ''} ${target.topic || ''}`,
      });
    });
    materials.forEach((material) => {
      allResults.push({
        name: material.originalName,
        category: material.subjectName ? `Study Material · ${material.subjectName}` : 'Study Material',
        path: `/study-materials#material-${material._id}`,
        icon: FileText,
        keywords: material.subjectName || '',
      });
    });

    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    return allResults.filter((item) =>
      `${item.name} ${item.category} ${item.keywords || ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    );
  }, [materials, query, subjects, targets]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query, results.length]);

  const saveRecentSearch = (search) => {
    if (!search.trim()) return;
    const updated = [search.trim(), ...recentSearches.filter((item) => item !== search.trim())].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Search remains usable when browser storage is unavailable.
    }
  };

  const openResult = (result) => {
    saveRecentSearch(query);
    navigate(result.path);
    setQuery('');
    setActiveIndex(-1);
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? results.length - 1 : current - 1);
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      openResult(results[activeIndex >= 0 ? activeIndex : 0]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const chooseRecentSearch = (search) => {
    setQuery(search);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1 items-center md:mx-6 md:max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
        <Search className="h-4 w-4" />
      </div>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search topics, quizzes, materials..."
        role="combobox"
        aria-label="Search LearnPath"
        aria-expanded={isOpen}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
        className="field-control w-full min-w-0 py-2 pl-9 pr-11 text-xs"
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
        <kbd className="inline-flex items-center rounded border border-slate-700 bg-dark-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
          <Command className="mr-0.5 h-2.5 w-2.5" /> K
        </kbd>
      </div>

      {isOpen && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,28rem)] min-w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-slate-700 bg-dark-900 p-2 shadow-xl md:min-w-[26rem]"
        >
          {!query.trim() ? (
            <>
              {recentSearches.length > 0 && (
                <section aria-label="Recent searches">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recent searches</p>
                  {recentSearches.map((search) => (
                    <button
                      type="button"
                      key={search}
                      onClick={() => chooseRecentSearch(search)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-dark-800"
                    >
                      <ArrowUp className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{search}</span>
                    </button>
                  ))}
                </section>
              )}
              <section aria-label="Suggested destinations">
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {recentSearches.length ? 'Go to' : 'Quick navigation'}
                </p>
                {suggestions.map((result) => {
                  const Icon = result.icon;
                  return (
                    <button
                      type="button"
                      key={result.name}
                      onClick={() => openResult(result)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-dark-800"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-brand-blue-light" />
                      <span className="min-w-0 flex-1 truncate">{result.name}</span>
                      <span className="text-xs text-slate-500">{result.category}</span>
                    </button>
                  );
                })}
              </section>
            </>
          ) : (
            <>
              {results.map((result, index) => {
                const Icon = result.icon;
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    id={`global-search-result-${index}`}
                    key={`${result.path}-${result.name}-${index}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => openResult(result)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                      activeIndex === index ? 'bg-dark-800' : 'hover:bg-dark-800'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-dark-950 text-brand-blue-light">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-100">{result.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{result.category}</span>
                    </span>
                  </button>
                );
              })}
              {isLoading && results.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-slate-400" role="status">Searching your study data...</p>
              )}
              {!isLoading && results.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-slate-400">No results found</p>
              )}
              {loadError && (
                <p role="alert" className="mt-1 border-t border-slate-800 px-3 py-2 text-xs text-amber-300">
                  {loadError}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
